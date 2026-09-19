-- Contract v2 catalogue. Every invariant the domain model enforces that can be
-- expressed in SQL is enforced here too, so a bug in an importer cannot store
-- something the contract would reject.

-- ---------- GTIN helpers ----------

-- 14-digit canonical GTIN with a valid check digit.
CREATE FUNCTION gtin14_is_valid(code text) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
    SELECT code ~ '^[0-9]{14}$' AND (
        (10 - (SELECT sum(substr(code, i, 1)::int * CASE WHEN i % 2 = 1 THEN 3 ELSE 1 END)
               FROM generate_series(1, 13) AS i) % 10) % 10
    ) = substr(code, 14, 1)::int
$$;

-- Restricted-circulation (in-store / weighed-item) codes: not product identities.
CREATE FUNCTION gtin14_is_restricted(code text) RETURNS boolean
LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE AS $$
    SELECT substr(code, 2, 1) = '2' OR substr(code, 2, 2) IN ('02', '04')
$$;

-- ---------- reference data ----------

CREATE TABLE data_source (
    id            text PRIMARY KEY CHECK (id ~ '^[a-z_]+$'),
    name          text NOT NULL,
    url           text NOT NULL,
    licence       text,
    attribution   text,
    image_licence text,
    status        text NOT NULL CHECK (status IN ('active', 'disabled')),
    status_reason text,
    CHECK ((status = 'disabled') = (status_reason IS NOT NULL))
);

CREATE TABLE retailer (
    id   text PRIMARY KEY CHECK (id ~ '^[a-z_]+$'),
    name text NOT NULL UNIQUE
);

-- Normalised alias (see resolveRetailer) -> retailer.
CREATE TABLE retailer_alias (
    alias       text PRIMARY KEY CHECK (alias = lower(alias) AND alias <> ''),
    retailer_id text NOT NULL REFERENCES retailer (id)
);

-- ---------- ingestion ----------

CREATE TABLE ingestion_run (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source      text NOT NULL REFERENCES data_source (id),
    kind        text NOT NULL,
    started_at  timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz,
    status      text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'failed')),
    params      jsonb NOT NULL DEFAULT '{}',
    stats       jsonb NOT NULL DEFAULT '{}',   -- counts and timings; shape varies by kind
    error       text,
    CHECK ((status = 'running') = (finished_at IS NULL)),
    CHECK ((status = 'failed') = (error IS NOT NULL))
);

-- Why a source record did not become (or stay) a catalogue row. Codes are machine-readable.
CREATE TABLE ingestion_rejection (
    run_id           uuid NOT NULL REFERENCES ingestion_run (id) ON DELETE CASCADE,
    source           text NOT NULL REFERENCES data_source (id),
    source_record_id text NOT NULL,
    reason_codes     text[] NOT NULL CHECK (cardinality(reason_codes) > 0),
    detail           text,
    PRIMARY KEY (run_id, source, source_record_id)
);
CREATE INDEX ingestion_rejection_reason ON ingestion_rejection USING gin (reason_codes);

-- One row per source record: its provenance and its trimmed raw payload, so
-- catalogue rows can be rebuilt (re-mapped) without fetching the source again.
CREATE TABLE source_record (
    id                bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source            text NOT NULL REFERENCES data_source (id),
    source_record_id  text NOT NULL CHECK (source_record_id <> ''),
    source_url        text,
    imported_at       timestamptz NOT NULL,       -- Provenance.importedAt: when this payload was fetched
    source_updated_at timestamptz,                -- Provenance.sourceUpdatedAt
    licence           text,                       -- snapshot at import
    attribution       text,
    payload           jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
    payload_version   integer NOT NULL CHECK (payload_version > 0),   -- trimming format
    payload_hash      char(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    mapper_version    integer NOT NULL CHECK (mapper_version > 0),    -- mapper that produced the derived rows
    last_run_id       uuid REFERENCES ingestion_run (id) ON DELETE SET NULL,
    UNIQUE (source, source_record_id)
);

-- ---------- product corpus ----------

CREATE TABLE product (
    barcode              char(14) PRIMARY KEY
                         CHECK (gtin14_is_valid(barcode) AND NOT gtin14_is_restricted(barcode)),
    record_id            bigint NOT NULL UNIQUE REFERENCES source_record (id),
    name                 text NOT NULL CHECK (btrim(name) <> ''),
    brand                text CHECK (btrim(brand) <> ''),

    quantity_kind        text CHECK (quantity_kind IN ('mass', 'volume', 'count')),
    quantity_unit        text,
    quantity_per_pack    double precision,
    quantity_pack_count  integer,
    quantity_total       double precision,
    quantity_raw         text,
    quantity_min_g       double precision,        -- weighed items only
    quantity_max_g       double precision,

    category_text        text NOT NULL DEFAULT '', -- canonical category labels, for full-text search
    description          text CHECK (btrim(description) <> ''),
    ingredients          text CHECK (btrim(ingredients) <> ''),

    allergen_status        text NOT NULL CHECK (allergen_status IN ('listed', 'none_listed', 'unknown')),
    allergens_contains     text[] NOT NULL,
    allergens_may_contain  text[] NOT NULL,
    allergens_unrecognised text[] NOT NULL,

    dietary_claims       text[] NOT NULL CHECK (dietary_claims <@ ARRAY['vegan', 'vegetarian', 'gluten_free']),
    inferred_vegan       text NOT NULL CHECK (inferred_vegan IN ('yes', 'no', 'maybe', 'unknown')),
    inferred_vegetarian  text NOT NULL CHECK (inferred_vegetarian IN ('yes', 'no', 'maybe', 'unknown')),
    inferred_by          text REFERENCES data_source (id),

    nutrition_per        text CHECK (nutrition_per IN ('100g', '100ml')),
    energy_kcal_100      double precision CHECK (energy_kcal_100 >= 0),
    fat_g_100            double precision CHECK (fat_g_100 >= 0),
    saturates_g_100      double precision CHECK (saturates_g_100 >= 0),
    carbohydrate_g_100   double precision CHECK (carbohydrate_g_100 >= 0),
    sugars_g_100         double precision CHECK (sugars_g_100 >= 0),
    fibre_g_100          double precision CHECK (fibre_g_100 >= 0),
    protein_g_100        double precision CHECK (protein_g_100 >= 0),
    salt_g_100           double precision CHECK (salt_g_100 >= 0),
    nutrition_derived    text[] NOT NULL DEFAULT '{}',
    nutrition_raw        jsonb,                    -- a source's own text table, when it gave one

    quality_tier         char(1) NOT NULL CHECK (quality_tier IN ('A', 'B', 'C')),
    document_version     integer NOT NULL,
    text_hash            char(64) NOT NULL CHECK (text_hash ~ '^[0-9a-f]{64}$'),   -- decides re-embedding
    content_hash         char(64) NOT NULL CHECK (content_hash ~ '^[0-9a-f]{64}$'), -- decides row updates
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    text_changed_at      timestamptz NOT NULL DEFAULT now(),

    search tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
        setweight(to_tsvector('english', category_text), 'B') ||
        setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
        setweight(to_tsvector('english', coalesce(ingredients, '')), 'D')
    ) STORED,

    CONSTRAINT product_quantity_consistent CHECK (
        (quantity_kind IS NULL AND quantity_unit IS NULL AND quantity_per_pack IS NULL AND quantity_pack_count IS NULL
            AND quantity_total IS NULL AND quantity_raw IS NULL AND quantity_min_g IS NULL AND quantity_max_g IS NULL)
        -- Explicit IS NOT NULLs: a CHECK that evaluates to NULL passes, so comparisons alone would let half a quantity in.
        OR (quantity_kind IS NOT NULL AND quantity_unit IS NOT NULL AND quantity_per_pack IS NOT NULL
            AND quantity_pack_count IS NOT NULL AND quantity_total IS NOT NULL AND quantity_raw IS NOT NULL
            AND quantity_unit = CASE quantity_kind WHEN 'mass' THEN 'g' WHEN 'volume' THEN 'ml' ELSE 'each' END
            AND quantity_per_pack > 0 AND quantity_pack_count > 0 AND quantity_total > 0
            AND abs(quantity_total - quantity_per_pack * quantity_pack_count) <= 1e-9 * greatest(1, quantity_total)
            AND btrim(quantity_raw) <> ''
            AND (quantity_kind <> 'count' OR (quantity_per_pack = trunc(quantity_per_pack))))
    ),
    CONSTRAINT product_variable_weight CHECK (
        (quantity_min_g IS NULL AND quantity_max_g IS NULL)
        OR (quantity_kind = 'mass' AND quantity_min_g IS NOT NULL AND quantity_max_g IS NOT NULL AND quantity_total IS NOT NULL
            AND quantity_min_g <= quantity_total AND quantity_total <= quantity_max_g)
    ),
    CONSTRAINT product_allergens_known CHECK (
        allergens_contains <@ ARRAY['celery','gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','tree_nuts','peanuts','sesame','soya','sulphites']
        AND allergens_may_contain <@ ARRAY['celery','gluten','crustaceans','eggs','fish','lupin','milk','molluscs','mustard','tree_nuts','peanuts','sesame','soya','sulphites']
    ),
    CONSTRAINT product_allergen_status CHECK (
        (allergen_status = 'listed')
        = (cardinality(allergens_contains) + cardinality(allergens_may_contain) + cardinality(allergens_unrecognised) > 0)
    ),
    CONSTRAINT product_inference_attributed CHECK (
        inferred_by IS NOT NULL OR (inferred_vegan = 'unknown' AND inferred_vegetarian = 'unknown')
    ),
    CONSTRAINT product_nutrition_present CHECK (
        nutrition_per IS NOT NULL OR (
            energy_kcal_100 IS NULL AND fat_g_100 IS NULL AND saturates_g_100 IS NULL AND carbohydrate_g_100 IS NULL
            AND sugars_g_100 IS NULL AND fibre_g_100 IS NULL AND protein_g_100 IS NULL AND salt_g_100 IS NULL
            AND cardinality(nutrition_derived) = 0 AND nutrition_raw IS NULL)
    ),
    CONSTRAINT product_nutrition_sane CHECK (
        (saturates_g_100 IS NULL OR fat_g_100 IS NULL OR saturates_g_100 <= fat_g_100 + 1e-9)
        AND (sugars_g_100 IS NULL OR carbohydrate_g_100 IS NULL OR sugars_g_100 <= carbohydrate_g_100 + 1e-9)
    )
);

CREATE INDEX product_search ON product USING gin (search);
CREATE INDEX product_quality_tier ON product (quality_tier);
-- Deterministic nutrition filters ("protein >= 20 AND kcal <= 300"). One partial
-- b-tree per nutrient the assistant is known to filter on; the planner combines
-- them with BitmapAnd. See README "Nutrition indexes".
CREATE INDEX product_protein ON product (protein_g_100) WHERE protein_g_100 IS NOT NULL;
CREATE INDEX product_energy ON product (energy_kcal_100) WHERE energy_kcal_100 IS NOT NULL;
CREATE INDEX product_sugars ON product (sugars_g_100) WHERE sugars_g_100 IS NOT NULL;
CREATE INDEX product_salt ON product (salt_g_100) WHERE salt_g_100 IS NOT NULL;
CREATE INDEX product_fat ON product (fat_g_100) WHERE fat_g_100 IS NOT NULL;
CREATE INDEX product_saturates ON product (saturates_g_100) WHERE saturates_g_100 IS NOT NULL;
CREATE INDEX product_dietary_claims ON product USING gin (dietary_claims);

CREATE TABLE product_category (
    barcode     char(14) NOT NULL REFERENCES product (barcode) ON DELETE CASCADE,
    position    smallint NOT NULL CHECK (position >= 0),
    category_id text NOT NULL CHECK (category_id ~ '^[a-z]{2}:[^\s:]+$'),
    PRIMARY KEY (barcode, category_id),
    UNIQUE (barcode, position)
);
CREATE INDEX product_category_by_category ON product_category (category_id);

CREATE TABLE product_image (
    barcode         char(14) NOT NULL REFERENCES product (barcode) ON DELETE CASCADE,
    position        smallint NOT NULL CHECK (position >= 0),
    role            text NOT NULL CHECK (role IN ('front', 'ingredients', 'nutrition', 'packaging', 'other')),
    url             text NOT NULL CHECK (url ~ '^https://'),
    source          text NOT NULL REFERENCES data_source (id),
    licence         text,
    attribution     text,
    contributor     text,
    source_page_url text,
    displayable     boolean GENERATED ALWAYS AS (licence IS NOT NULL AND attribution IS NOT NULL) STORED,
    PRIMARY KEY (barcode, position)
);

-- ---------- retailers, listings and prices ----------

CREATE TABLE store (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    source          text NOT NULL REFERENCES data_source (id),
    source_store_id text,
    retailer_id     text REFERENCES retailer (id),
    name            text,
    osm_type        text CHECK (osm_type IN ('node', 'way', 'relation')),
    osm_id          bigint CHECK (osm_id > 0),
    postcode        text,
    city            text,
    country_code    char(2) CHECK (country_code ~ '^[A-Z]{2}$'),
    CHECK ((osm_type IS NULL) = (osm_id IS NULL)),
    CHECK (source_store_id IS NOT NULL OR osm_id IS NOT NULL),
    UNIQUE (source, source_store_id)
);
CREATE UNIQUE INDEX store_osm_identity ON store (source, osm_type, osm_id) WHERE source_store_id IS NULL;

-- ProductReference, flattened: exactly one of the three forms is filled in.
-- Used by product_listing (retailer_sku / source_record only), price_observation and reference_price.
CREATE TABLE product_listing (
    id                     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_kind               text NOT NULL CHECK (ref_kind IN ('retailer_sku', 'source_record')),
    ref_retailer_id        text REFERENCES retailer (id),
    ref_sku                text,
    ref_source             text REFERENCES data_source (id),
    ref_source_id          text,
    retailer_id            text REFERENCES retailer (id),
    barcode                char(14) CHECK (gtin14_is_valid(barcode) AND NOT gtin14_is_restricted(barcode)),
    url                    text,
    retailer_category_path text[] NOT NULL DEFAULT '{}',
    name                   text NOT NULL CHECK (btrim(name) <> ''),
    details                jsonb NOT NULL CHECK (jsonb_typeof(details) = 'object'), -- validated ProductDetails snapshot
    record_id              bigint NOT NULL UNIQUE REFERENCES source_record (id),
    CHECK ((ref_kind = 'retailer_sku') = (ref_retailer_id IS NOT NULL AND ref_sku IS NOT NULL)),
    CHECK ((ref_kind = 'source_record') = (ref_source IS NOT NULL AND ref_source_id IS NOT NULL)),
    CHECK (ref_kind <> 'retailer_sku' OR ref_retailer_id = retailer_id)
);
CREATE UNIQUE INDEX product_listing_sku ON product_listing (ref_retailer_id, ref_sku) WHERE ref_kind = 'retailer_sku';
CREATE UNIQUE INDEX product_listing_source_ref ON product_listing (ref_source, ref_source_id) WHERE ref_kind = 'source_record';
CREATE INDEX product_listing_barcode ON product_listing (barcode) WHERE barcode IS NOT NULL;

-- Historical evidence of a price on a day. Not a current offer.
-- ref_barcode has no foreign key to product on purpose: a price observation
-- can be evidence about a product that is not (yet) in the corpus.
CREATE TABLE price_observation (
    id                        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_kind                  text NOT NULL CHECK (ref_kind IN ('barcode', 'retailer_sku', 'source_record')),
    ref_barcode               char(14) CHECK (gtin14_is_valid(ref_barcode) AND NOT gtin14_is_restricted(ref_barcode)),
    ref_retailer_id           text REFERENCES retailer (id),
    ref_sku                   text,
    ref_source                text REFERENCES data_source (id),
    ref_source_id             text,
    retailer_id               text REFERENCES retailer (id),
    store_id                  bigint REFERENCES store (id),
    channel                   text NOT NULL CHECK (channel IN ('in_store', 'online', 'unknown')),
    price_pence               integer NOT NULL CHECK (price_pence > 0),
    price_condition           text NOT NULL CHECK (price_condition IN ('none', 'loyalty_member', 'unknown')),
    was_price_pence           integer CHECK (was_price_pence > price_pence),
    retailer_unit_price_pence double precision CHECK (retailer_unit_price_pence > 0),
    retailer_unit_price_basis text CHECK (retailer_unit_price_basis IN ('100g', 'kg', '100ml', 'litre', 'each')),
    promotions                jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(promotions) = 'array'), -- discriminated union; validated by the contract
    availability              text NOT NULL CHECK (availability IN ('in_stock', 'out_of_stock', 'unknown')),
    observed_on               date NOT NULL,
    observed_at               timestamptz,
    evidence                  text NOT NULL CHECK (evidence IN ('receipt', 'price_tag', 'retailer_page', 'unknown')),
    record_id                 bigint NOT NULL UNIQUE REFERENCES source_record (id),
    CONSTRAINT price_observation_ref_barcode CHECK ((ref_kind = 'barcode') = (ref_barcode IS NOT NULL)),
    CONSTRAINT price_observation_ref_sku CHECK ((ref_kind = 'retailer_sku') = (ref_retailer_id IS NOT NULL AND ref_sku IS NOT NULL)),
    CONSTRAINT price_observation_ref_source CHECK ((ref_kind = 'source_record') = (ref_source IS NOT NULL AND ref_source_id IS NOT NULL)),
    CONSTRAINT price_observation_sku_retailer CHECK (ref_kind <> 'retailer_sku' OR ref_retailer_id = retailer_id),
    CONSTRAINT price_observation_unit_price CHECK ((retailer_unit_price_pence IS NULL) = (retailer_unit_price_basis IS NULL))
);
CREATE INDEX price_observation_by_barcode ON price_observation (ref_barcode, observed_on DESC) WHERE ref_kind = 'barcode';
CREATE INDEX price_observation_by_retailer ON price_observation (retailer_id, observed_on DESC);

-- A store and its observation must name the same retailer (both may be null).
CREATE FUNCTION price_observation_store_retailer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.store_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM store WHERE id = NEW.store_id AND retailer_id IS DISTINCT FROM NEW.retailer_id
    ) THEN
        RAISE EXCEPTION 'price_observation % names a different retailer from its store', NEW.id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER price_observation_store_retailer
    BEFORE INSERT OR UPDATE ON price_observation
    FOR EACH ROW EXECUTE FUNCTION price_observation_store_retailer();

-- A representative price with no observation behind it (legacy curated catalogue).
CREATE TABLE reference_price (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ref_kind        text NOT NULL CHECK (ref_kind IN ('barcode', 'retailer_sku', 'source_record')),
    ref_barcode     char(14) CHECK (gtin14_is_valid(ref_barcode) AND NOT gtin14_is_restricted(ref_barcode)),
    ref_retailer_id text REFERENCES retailer (id),
    ref_sku         text,
    ref_source      text REFERENCES data_source (id),
    ref_source_id   text,
    retailer_id     text REFERENCES retailer (id),
    price_pence     integer NOT NULL CHECK (price_pence > 0),
    kind            text NOT NULL CHECK (kind = 'representative'),
    record_id       bigint NOT NULL UNIQUE REFERENCES source_record (id),
    CHECK ((ref_kind = 'barcode') = (ref_barcode IS NOT NULL)),
    CHECK ((ref_kind = 'retailer_sku') = (ref_retailer_id IS NOT NULL AND ref_sku IS NOT NULL)),
    CHECK ((ref_kind = 'source_record') = (ref_source IS NOT NULL AND ref_source_id IS NOT NULL))
);
