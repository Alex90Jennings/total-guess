-- The daily game.
--
-- One row per calendar day, holding a complete frozen snapshot of that day's
-- ten items: name, price, shop, quantity, image and where each came from.
-- Nothing is looked up at play time, so a game cannot change or break because
-- the catalogue moved underneath it.
--
-- This is deliberately the whole architecture. A table, a generator that fills
-- a rolling window, and a publish step. No queue, no cache, no scheduler
-- beyond a cron that calls the generator.
CREATE TABLE daily_game (
    game_date    date PRIMARY KEY,
    game_number  integer NOT NULL UNIQUE CHECK (game_number > 0),
    -- The frozen items. Each is complete: the game never joins back to the catalogue.
    items        jsonb NOT NULL CHECK (jsonb_array_length(items) = 10),
    generated_at timestamptz NOT NULL DEFAULT now(),
    -- When this game was copied to the store the frontend reads.
    published_at timestamptz,
    -- How big the eligible pool was on the day it was generated, for the record.
    pool_size    integer NOT NULL CHECK (pool_size > 0)
);

CREATE INDEX daily_game_unpublished ON daily_game (game_date) WHERE published_at IS NULL;

/*
 * A game whose date has arrived is history. Marking it published is allowed;
 * changing what it contains is not. Enforced here rather than only in the
 * generator, because "published games never change" is a property of the data,
 * not of the code that happens to write it.
 */
CREATE FUNCTION daily_game_frozen() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.game_date <= current_date THEN
            RAISE EXCEPTION 'game % has been played; it cannot be deleted', OLD.game_date;
        END IF;
        RETURN OLD;
    END IF;
    IF OLD.game_date <= current_date
        AND (NEW.items IS DISTINCT FROM OLD.items
             OR NEW.game_number IS DISTINCT FROM OLD.game_number
             OR NEW.game_date IS DISTINCT FROM OLD.game_date) THEN
        RAISE EXCEPTION 'game % has been published; its items cannot be changed', OLD.game_date;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER daily_game_frozen
    BEFORE UPDATE OR DELETE ON daily_game
    FOR EACH ROW EXECUTE FUNCTION daily_game_frozen();

/*
 * What may appear in a game.
 *
 * Two sources, one shape:
 *   curated  the 268 photographed items the game has always used, with
 *            representative prices
 *   off      Open Food Facts products that have a licensed image and a real,
 *            dated price observation from a UK retailer
 *
 * A product is only eligible if everything the game needs to show is present.
 * Refreshing the catalogue changes this view; it cannot change a game that has
 * already been generated, because generation copies the values out.
 */
CREATE VIEW eligible_game_item AS
SELECT
    'curated:' || l.ref_source_id           AS item_id,
    l.name                                  AS description,
    l.details -> 'quantity' ->> 'raw'       AS quantity,
    r.price_pence                           AS price_pence,
    r.retailer_id                           AS store,
    l.ref_source_id                         AS image,          -- /items/<code>.jpg, shipped with the app
    'representative'                        AS price_kind,
    NULL::date                              AS price_observed_on,
    'curated'                               AS price_source,  -- representative, not a live price
    NULL::text                              AS image_licence,
    NULL::text                              AS image_attribution
FROM product_listing l
JOIN reference_price r
  ON r.ref_kind = 'source_record' AND r.ref_source = l.ref_source AND r.ref_source_id = l.ref_source_id
WHERE l.ref_source = 'curated'
  AND r.retailer_id IS NOT NULL

UNION ALL

SELECT
    'off:' || p.barcode,
    p.name,
    p.quantity_raw,
    o.price_pence,
    o.retailer_id,
    i.url,
    'observed',
    o.observed_on,
    'open_prices',
    i.licence,
    i.attribution
FROM product p
JOIN LATERAL (
    -- The most recent regular price for this product, one row only.
    SELECT o.price_pence, o.retailer_id, o.observed_on
    FROM price_observation o
    WHERE o.ref_barcode = p.barcode
      AND o.retailer_id IS NOT NULL
      -- 'none' means an ordinary shelf price. Loyalty-card and unknown-condition
      -- prices are excluded: guessing a Clubcard price is a different game.
      AND o.price_condition = 'none'
      AND o.price_pence BETWEEN 20 AND 2000
      AND o.observed_on > current_date - interval '3 years'
    ORDER BY o.observed_on DESC, o.price_pence
    LIMIT 1
) o ON true
JOIN LATERAL (
    SELECT i.url, i.licence, i.attribution
    FROM product_image i
    WHERE i.barcode = p.barcode AND i.role = 'front'
      AND i.licence IS NOT NULL AND i.attribution IS NOT NULL
    ORDER BY i.position
    LIMIT 1
) i ON true
WHERE p.quality_tier IN ('A', 'B')
  AND p.brand IS NOT NULL
  AND p.quantity_raw IS NOT NULL
  AND length(p.name) BETWEEN 3 AND 60;
