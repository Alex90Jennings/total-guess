# Product catalogue (PostgreSQL)

The persisted form of the [domain model](domain-model.md): a PostgreSQL catalogue of
real UK food products from the Open Food Facts nightly dump, plus historical price
evidence and the legacy curated catalogue. No embeddings, vectors or AI yet.

Three kinds of data live here and are never mixed:

| Kind | Tables | What it is |
| --- | --- | --- |
| **Product corpus** | `product`, `product_category`, `product_image` | Canonical products from Open Food Facts, keyed by GTIN |
| **Historical price observations** | `price_observation`, `store` | Open Prices evidence: a price seen at a shop on a day. **Not current prices** |
| **Legacy reference prices** | `product_listing`, `reference_price` | The game's curated items: names and undated representative prices, no barcodes |

## Stack

- **PostgreSQL 17** (Docker, `docker-compose.yml`) for real imports; **PGlite** (PostgreSQL
  compiled to WASM, in-process) for tests and zero-setup local use. Both run the same SQL.
- `pg` (node-postgres) driver, plain SQL migrations (`src/db/migrations/`), no ORM. The
  repository functions are small, typed and write whole batches as one JSON parameter
  (`jsonb_to_recordset`), so a batch of 500 products costs a fixed handful of round trips.

## Schema

`src/db/migrations/001_catalogue.sql`. Every contract invariant expressible in SQL is a
constraint, so an importer bug cannot store what the contract forbids:

- `product.barcode` is `char(14)` with `CHECK (gtin14_is_valid(...) AND NOT gtin14_is_restricted(...))`, SQL
  functions that mirror the TypeScript check-digit and in-store-code rules.
- Quantity columns are all-or-nothing, the unit must match the kind, and `total = perPack × packCount`.
- Allergen status must agree with the lists; allergens are restricted to the UK 14.
- An inference must name who made it; nutrition values need a basis; saturates ≤ fat, sugars ≤ carbohydrate.
- `product_image.displayable` is a generated column: `licence IS NOT NULL AND attribution IS NOT NULL`.
- `price_observation` stores a flattened `ProductReference` with CHECKs that exactly one form is
  filled in, a SKU reference must belong to the observation's retailer, a trigger checks the
  store's retailer, and `record_id` is unique (one observation per source record). There is
  deliberately **no foreign key from `ref_barcode` to `product`**: a price can be evidence about a
  product that is not in the corpus.
- `reference_price.kind` can only be `representative`.

JSONB is used only where the structure is genuinely variable or raw: `source_record.payload`
(the trimmed source record), `price_observation.promotions` (a discriminated union),
`product.nutrition_raw` (a source's own text table), `product_listing.details` (a validated
snapshot for secondary listings), and `ingestion_run.params/stats`. Everything queried is a column.

```
data_source ─┬─< source_record ─┬── product ─┬─< product_category
             │                  │            └─< product_image
             │                  ├── price_observation >── store >── retailer ─< retailer_alias
             │                  ├── product_listing
             │                  └── reference_price
             └─< ingestion_run ─< ingestion_rejection
```

### Change detection

| Column | Decides |
| --- | --- |
| `source_record.payload_hash` + `mapper_version` | whether a source record changed |
| `product.content_hash` (mapped product + tier) | whether the product row is rewritten (`updated_at`) |
| `product.text_hash` (semantic document v2) | whether the product's meaning changed (`text_changed_at`): the future re-embedding trigger |

Unchanged rows are not written at all. Source timestamps and popularity live only in the
payload, so a timestamp-only change updates `source_record` but leaves `product` untouched.

### Nutrition indexes

One partial b-tree per nutrient the assistant is known to filter on (protein, energy, sugars,
salt, fat, saturates), `WHERE column IS NOT NULL`. A query such as
`protein_g_100 >= 20 AND energy_kcal_100 <= 300` can combine two of them with a BitmapAnd.

Why not composite or more indexes: the filters will come in unpredictable combinations, and a
composite index only helps queries that lead with its first column. Single-column indexes
compose. At the current corpus size PostgreSQL will usually choose a sequential scan anyway
(tens of thousands of narrow rows scan in a few milliseconds). The indexes matter as the corpus
grows, and a test proves the planner can use them. Fibre and carbohydrate are not indexed until
a real query needs them.

### Full-text search

`product.search` is a generated `tsvector` (English configuration):

| Weight | Field |
| --- | --- |
| A | name |
| B | brand, canonical category labels (`category_text`, maintained by the importer) |
| C | description |
| D | ingredients |

It has a GIN index. `searchProducts()` uses `websearch_to_tsquery` (so `"dark chocolate"` and
`chicken -soup` work) and `ts_rank_cd`, with optional tier, nutrition and category filters. This
lexical search is the baseline that vector and hybrid retrieval will be measured against.

## Ingestion

```
OFF nightly JSONL dump (13 GB gz, streamed)
   │  off:extract   network, once per dump: keep UK-tagged records, trim to the fields we read
   ▼
.captures/openfoodfacts/dump/uk-YYYY-MM-DD.jsonl.gz   (~230 MB trimmed, local)
   │  off:import    offline, repeatable
   │    pass 1  gate → map → tier every candidate; resolve duplicate GTINs; choose the corpus
   │    pass 2  batch upsert (500/transaction): source_record → product → categories → images
   ▼
PostgreSQL ── ingestion_run (structured summary) ── ingestion_rejection (reason codes per record)
```

`off:replay` rebuilds every product from the stored `source_record.payload` alone: after a
mapper change (bump `OFF_MAPPER_VERSION`), or to repair rows. No dump needed.

### The dump

| | |
| --- | --- |
| URL | `https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz` (docs: https://world.openfoodfacts.org/data) |
| Format | gzipped JSON Lines, one product per line, sorted by barcode |
| Size | 12.99 GB compressed (2026-09-18); ~4.76 M records |
| Updated | nightly |
| Licence | database ODbL, contents DbCL, images CC BY-SA. Attribution: "Open Food Facts", link to the product page |

Why JSONL rather than the smaller CSV (1.3 GB) or Parquet (7.9 GB): the CSV has no language
field, no English-specific name/ingredients, no product type and no image authors, all of which
the contract needs. Parquet would need a native reader. The JSONL streams through Node's gunzip
and readline with no dependencies. Only lines containing `en:united-kingdom` are parsed, which
keeps a full pass to about ten minutes on a 4 MB/s connection. Nothing but the trimmed UK subset
touches the disk (the machine this was built on had 6 GB free).

The dump mixes two OFF schemas: records edited recently carry nutrition in
`nutrition.aggregated_set` (with units, a stated basis, modifiers and sources) and sometimes only
`categories_tags`. The trim and the mapper handle both.

### Gates and quality tiers

Gates (the record cannot be a catalogue product): `not_food`, `obsolete`, `invalid_gtin`,
`restricted_gtin`, `mapper_rejected`, `duplicate_gtin` (the less-scanned record of a GTIN).

Checks, all measurable (`src/sources/openFoodFacts/quality.ts`):

| Check | Passes when |
| --- | --- |
| `english_name` | `product_name_en` present, or the main language is English |
| `quantity` | the quantity parses (or OFF's structured quantity is in g/ml) |
| `front_image` | a front image with licence and attribution |
| `english_ingredients` | English ingredient text |
| `complete_nutrition` | all 7 UK label values (energy, fat, saturates, carbohydrate, sugars, protein, salt) |
| `nutrition_consistent` | no OFF data-quality error about the nutrition numbers |
| `useful_category` | at least two canonical categories (more than a top-level group) |

- **Tier A**: every check passes.
- **Tier B**: English name, quantity, displayable front image, useful category, and either English ingredients or energy + protein.
- **Tier C**: valid, but too incomplete for the initial corpus. Not stored; recorded with `tier_c` and a `missing_<check>` code for each failure.

The corpus is Tier A then Tier B, most-scanned first, capped (default 25,000; `over_cap` for the rest).
The UK GS1 prefix (500–509) is **not** used to select or rank: it says where a barcode was
registered, not where a product is sold.

## Running it

```bash
# fixture-sized, no downloads, no server (PGlite in .data/pglite)
yarn workspace @total-guess/ingestion test

# the real thing
cd packages/ingestion && docker compose up -d
export DATABASE_URL=postgres://totalguess:totalguess@127.0.0.1:54329/totalguess
yarn workspace @total-guess/ingestion off:extract      # ~10 min, streams the dump
yarn workspace @total-guess/ingestion off:import       # offline
yarn workspace @total-guess/ingestion prices:import    # captured Open Prices observations
yarn workspace @total-guess/ingestion curated:import   # the game's 268 items
yarn workspace @total-guess/ingestion corpus:report
yarn workspace @total-guess/ingestion search:sanity
```

Unset `DATABASE_URL` to run everything against a local PGlite database instead.

## Corpus statistics (dump of 18 September 2026)

Generated by `corpus:report` (full JSON in `.captures/reports/corpus-report.json`).

**Funnel**

| Stage | Records |
| --- | --- |
| Records in the dump | 4,755,629 |
| Tagged as sold in the UK (examined) | 194,729 |
| Invalid GTIN | 3,204 |
| In-store / restricted GTIN | 5,347 |
| Mapper failures (all: no product name) | 14,749 |
| Excluded non-food / obsolete | 0 / 0 (none tagged UK in this dump) |
| Duplicate GTINs | 1 |
| Mapped products | 171,429 |
| Tier A / B / C | 20,789 / 9,567 / 141,073 |
| Over the 25,000 cap (all Tier B) | 5,356 |
| **Accepted corpus** | **25,000** (20,789 A + 4,211 B) |

Tier C is mostly missing quantity (123,574), English ingredients (109,808) or a useful category
(108,335). Almost all near-misses have *no* quantity at all rather than one we fail to parse.

**Accepted corpus (25,000)**

| Measure | Count | % |
| --- | --- | --- |
| Valid quantity | 25,000 | 100 |
| Displayable (licensed, attributed) front image | 25,000 | 100 |
| Useful canonical category (≥ 2) | 25,000 | 100 |
| English ingredients | 23,348 | 93.4 |
| Complete UK-label nutrition (7 values) | 22,924 | 91.7 |
| Protein present | 24,137 | 96.5 |
| Fibre present | 18,687 | 74.7 |
| Allergens listed / none listed / unknown | 16,464 / 7,222 / 1,314 | 65.9 / 28.9 / 5.3 |
| "May contain" listed | 4,345 | 17.4 |
| Dietary claim (vegetarian 7,601, vegan 4,747, gluten-free 2,676) | 8,829 | 35.3 |
| Dietary inference from ingredients | 19,327 | 77.3 |
| Claim contradicted by inference | 0 | 0 |
| Description (`generic_name`) | 3,440 | 13.8 |
| GS1 UK barcode prefix (not used for selection) | 12,944 | 51.8 |

Quantity kinds: mass 21,710 · volume 3,273 · count 17. Nutrition basis: per 100 g 21,818 · per 100 ml 2,510 · none 672.
Median 6 canonical categories per product. Largest top-level groups: plant-based foods 9,168,
snacks 4,319, dairies 2,128, beverages 1,847, meat 1,621, condiments 1,596, meals 1,362, seafood 654.
Most common specific categories: biscuits, sweetened beverages, candies, crisps, breads,
microwave meals, sauces, protein bars, yogurts, meat analogues, Greek-style yogurts, dark chocolates.
Top brands are own labels: Tesco 1,354, Sainsbury's 942, Morrisons 726, Asda 724, Aldi 583,
Lidl 468, Waitrose 468, Marks & Spencer 435 (brands are stored as written: "M&S", "M&S Food"
and "TESCO" are separate strings).

Also persisted: 1,975 Open Prices observations (36 rejected: 21 in-store codes, 14 loose
produce, 1 invalid GTIN), of which 1,366 refer to 1,028 corpus products (58 observed in the
last 90 days); and the 268 curated items as listings with representative prices.

## Performance and idempotency

Docker PostgreSQL 17 on a laptop, 500 products per transaction:

| Run | Duration | Classify | Persist | DB write | Result |
| --- | --- | --- | --- | --- | --- |
| First import | 25.1 s | 6.5 s | 18.6 s | 11.3 s | 25,000 inserted; 7,770 records/s overall |
| Same extract again | 15.9 s | 6.5 s | 9.4 s | 2.6 s | 0 inserted, 0 updated, 25,000 unchanged |
| `off:replay` (no dump) | not timed | | | | 25,000 unchanged |
| Replay after a mapper change (v2 → v3) | | | | | 1,828 updated, all semantic (re-embed candidates) |

Peak memory for the import is about 600 MB (pass 1 keeps a small summary per candidate and all
rejection records). Streaming extraction of the 13 GB dump took 10.9 minutes. The database is
264 MB (`ingestion_rejection` is the largest table, see limitations).

## Search sanity (lexical baseline)

20 plain queries (`search:sanity`, results in `.captures/reports/search-sanity.json`); median
10.8 ms, max 69 ms. Most return exactly what you would expect at the top: baked beans (Heinz,
Tesco, Lidl, M&S), wholemeal bread, lentils, chicken breast, peanut butter, semi-skimmed milk,
basmati rice, porridge oats, free-range eggs. The failures are the ones vector search should fix:

| Query | Problem |
| --- | --- |
| tinned tuna | **0 results**, although 125 tuna products exist: labels say "in brine", not "tinned" |
| greek yoghurt | 51 results vs 220 for "greek yogurt": spelling variants are different words |
| cornflakes | chocolate "cornflake" bites rank first; "corn flakes" (two words) finds Kellogg's |
| oat milk | 4 of the top 5 are *oat milk chocolate*: no notion of product type |
| salted butter | 2,400 matches: "salted" stems to "salt", which is in most ingredient lists |

Retrieval over this catalogue — embeddings, hybrid search and its evaluation —
is documented separately in [retrieval.md](retrieval.md).

## Known limitations

- **The UK tag is crowdsourced.** It means someone recorded the product as sold in the UK, not
  that it is on shelves now. Some imports (e.g. Kirkland, Middle Eastern brands) are in the corpus.
- **Front images in another language are dropped** at extraction (English and the product's
  own language are kept). In a 300-product check, 299 constructed image URLs matched OFF's own.
- **Deselection is not handled.** A product that falls out of the selection on a later import (or
  becomes Tier C on replay) stays in `product` until removed. Replay after the v2 → v3 mapper change
  left 85 Tier C rows until the clean re-import.
- **`ingestion_rejection` grows by ~170,000 rows per OFF run.** Old runs should be pruned (`ON DELETE CASCADE` from `ingestion_run`).
- **Brands are raw strings**; own-label brand is not the retailer, and no normalisation is applied.
- Descriptions are rare (13.8%); ingredients and categories carry most of the product text.
- Nutrition from OFF's older schema has no stated basis; drinks are assumed per 100 ml.
