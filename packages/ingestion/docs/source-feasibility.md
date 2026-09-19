# Source feasibility

Checked 18 September 2026 for a **public** portfolio application. This is not
legal advice; it records what each source's own terms and behaviour allow.

| Source | Product metadata | UK prices | Terms allow our use? | Decision |
| --- | --- | --- | --- | --- |
| Morrisons website | rich | yes | **no**: 403, personal-use notice | not proceeding |
| Tesco, Sainsbury's, ASDA, Waitrose, Aldi websites | — | — | edge blocks non-browser clients; no official API (Tesco's developer portal no longer issues keys) | not usable |
| Lidl website | names, images | **no** (most shelf prices are not published online) | — | not usable for prices |
| **Open Food Facts** | **yes, good** | no | **yes**: ODbL / DbCL / CC BY-SA | use for product metadata |
| **Open Prices** | via Open Food Facts | **sparse** (see below) | **yes**: ODbL | supplementary, labelled "community-observed" |
| ONS CPI price quotes | — | not for food | OGL, but food quotes withdrawn from March 2026 and retailers never identified | not usable for products |
| Paid "UK grocery APIs" (RapidAPI, Apify…) | — | — | resold scraping; paying does not clean the provenance | not usable |

## Morrisons

- Public product pages were investigated. robots.txt allows `/products/` and
  `/categories/` and disallows `/api/`; only product and category pages were read.
- The automated proof of concept received **HTTP 403** on its first product
  request. The fetcher stopped as designed. **No attempt was made to circumvent
  it**: no user-agent change, no proxies, no browser automation, no retries.
- The product data Morrisons displays carries an explicit notice restricting it
  to personal use and prohibiting reproduction without Morrisons' prior consent.
- Therefore **Morrisons live ingestion is disabled and not proceeding.**
  `scripts/poc-fetch.ts` refuses to run. The parser, contract tests and
  *fictional* fixtures are kept. No Morrisons content is committed; any local
  captures stay in the gitignored `.captures/`.
- For the record: earlier exploratory requests that day used a
  `Mozilla/5.0 (compatible; …)` user agent and were served; the 403 came when the
  script used a `total-guess-research/0.1` agent. We did not switch back.

Re-enabling needs Morrisons' written consent, not a technical change.

## Open Food Facts (product metadata)

- **Coverage:** 194,814 food products tagged as sold in the UK (`countries_tags_en=united-kingdom&product_type=food`).
  The tag includes imports (the most-scanned "UK" products include foreign mineral waters), so
  GS1 UK barcode prefixes (500–509) are a better signal of UK shelf products.
- **Food only:** `product_type=food` (pet food, beauty and other products live in sister databases).
- **Fields used:** `code` (the barcode), names, `brands`, `quantity` + `product_quantity`/`_unit`,
  `categories_hierarchy` (a taxonomy, not a single path), `ingredients_text_en`, `allergens_tags`,
  `traces_tags`, `labels_tags` (dietary *claims*), `ingredients_analysis_tags` (dietary *inference*),
  `nutriments` (numbers per 100 g/ml), `image_front_url`, `stores_tags`, `last_modified_t`.
- **Limits:** 15 product reads/min and 10 searches/min per IP; a custom
  `AppName/Version (contact)` User-Agent is required. For more than a few hundred products the
  project asks you to use the nightly **JSONL/Parquet dumps** instead of the API.
  Their robots.txt disallows `/api` for crawlers; the API docs invite apps, within those limits.
- **Licence:** database ODbL, individual contents DbCL, images CC BY-SA.

## Open Prices (price observations)

- Query: `GET /api/v1/prices?currency=GBP` (there is no country filter on prices; GBP is a sound
  proxy: 2,006 of the 2,011 GBP prices are at GB locations). Barcode lookups: `product_code__in=a,b,…`.
- Each price carries: barcode (`product_code`), price and currency, discount flag/type and
  undiscounted price, **observation date** (a date, from the receipt or tag) and upload timestamp,
  the store as an OpenStreetMap location (brand, name, postcode, city, country code), and a proof
  type (`PRICE_TAG` / `RECEIPT`). Loose produce is priced per kg or per unit against a category,
  not a barcode.
- It is crowdsourced from people photographing receipts and shelf labels. It is **not** a
  catalogue: coverage is whatever contributors happened to buy.
- **Licence:** ODbL. The `owner` field is a contributor username. We neither store nor display it.
  Proof images are not used.

## Coverage test (100 UK food products)

Method: the 300 most-scanned UK food products on Open Food Facts, keeping the
first 100 with GS1 UK barcodes; every GBP price on Open Prices; joined on the
barcode (padded to 14 digits). This is a **best case**: popular products are
the most likely to have been priced.

| Open Food Facts, 100 requested | |
| --- | --- |
| normalised into the existing `ProductData` schema | 100 |
| valid barcode | 100 |
| image | 100 |
| English ingredients | 96 |
| any nutrition / all 7 UK label nutrients | 99 / 99 |
| usable quantity | 94 (90 from the text, 4 from the structured fields) |
| allergens listed | 79 |
| dietary label claim (vegan/vegetarian/gluten-free) | 75 |
| description (`generic_name`) | 29 |
| **at least one UK price, ever** | **16** |
| UK price in the last 180 days | **0** (7 prices 181–365 days old, 10 older) |

| Open Prices, all GBP observations | |
| --- | --- |
| observations | 2,011 (1,997 barcode prices, 14 loose-produce) |
| distinct barcodes | 1,569 |
| distinct barcodes priced in the last 90 / 30 days | **92 / 46** |
| barcodes seen at 2+ retailers (ever) | 71 |
| stores / contributors | 266 / 176 |
| largest single contributor's share | 37.5% |
| observations by date | 0–7 days: 8 · 8–30: 38 · 31–90: 46 · 91–180: 184 · 181–365: 708 · older: 1,027 |
| new UK observations per month, 2026 | 18–120 per full month; 24 so far in September (roughly one a day for the whole UK) |

By retailer, all time: Lidl 663, Tesco 396, Sainsbury's 215, Aldi 123,
Morrisons 105, M&S 90, Co-op 96, Asda 57, Iceland 46, Waitrose 17, plus a long
tail of about 80 other shops. Last 90 days: Lidl 50, Tesco 11, Sainsbury's 9,
Morrisons 3, Aldi 3, Asda 2, Waitrose 1, others 13 (92 observations).

**Conclusion:** Open Food Facts is sufficient for product metadata. Open Prices
is far too sparse to act as a current UK price source: 16% of popular products
have ever been priced in the UK, none in the last six months, and the whole
country adds about one price a day. It can be shown as dated, attributed,
community-observed evidence, never as "the current price at Tesco".

## Attribution we must show

- Open Food Facts data: "Product data from Open Food Facts (openfoodfacts.org), available under
  the ODbL", with a link to each product's OFF page wherever that product's data is shown. Any
  database we publish that is derived from it must also be ODbL.
- Open Food Facts images: CC BY-SA. Credit "Open Food Facts contributors", link the source and
  licence, and share any modified image under CC BY-SA. The licence covers the photographer's
  rights only: the packaging shown is still subject to the brand owner's trademarks and design
  rights. Show images to identify products, not as our own branding.
- Open Prices: "Prices from Open Prices (prices.openfoodfacts.org), ODbL", the observation date
  and store on every price, and a link to the price record.
