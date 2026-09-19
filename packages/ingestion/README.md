# @total-guess/ingestion

The domain model (Contract v2) for grocery products, price evidence and their
provenance; mappers from each data source into it; and the PostgreSQL catalogue
they are persisted in, populated from the Open Food Facts nightly dump; and
hybrid retrieval (PostgreSQL full-text search + pgvector) over the result,
measured against a hand-labelled evaluation set; and a grounded assistant that
plans retrieval with an LLM but takes every fact from the database.

- **Open Food Facts** → primary licensed product corpus
- **Open Prices** → sparse historical price observations (evidence, never current prices)
- **Morrisons** → investigated but disabled (access and reproduction restrictions)
- **Curated** → the legacy game catalogue

- The model: [docs/domain-model.md](docs/domain-model.md)
- The database, ingestion, quality tiers and corpus statistics: [docs/catalogue.md](docs/catalogue.md)
- Why these sources: [docs/source-feasibility.md](docs/source-feasibility.md)
- Embeddings, hybrid search and the measured results: [docs/retrieval.md](docs/retrieval.md)
- Query planning, tools, grounding and prompt-injection handling: [docs/assistant.md](docs/assistant.md)
- How the daily game is generated, frozen and published: [docs/daily-game.md](docs/daily-game.md)

```
source JSON / page ─► mapper (source-specific) ─► normalise ─► zod validation ─► ProductRecord / ProductListing /
                      sources/*, adapters/*       quantity, money,                 PriceObservation / ReferencePrice
                                                  barcode, text                    ─► generic downstream
```

```bash
yarn workspace @total-guess/ingestion test                # everything, incl. PostgreSQL tests on in-process PGlite; no downloads
yarn workspace @total-guess/ingestion typecheck
yarn workspace @total-guess/ingestion off:extract         # stream the OFF dump, keep UK records (~10 min, network)
yarn workspace @total-guess/ingestion off:import          # load the corpus (offline, repeatable)
yarn workspace @total-guess/ingestion off:replay          # rebuild products from stored source records
yarn workspace @total-guess/ingestion prices:import       # captured Open Prices observations
yarn workspace @total-guess/ingestion curated:import      # the game's 268 legacy items
yarn workspace @total-guess/ingestion corpus:report       # corpus quality statistics
yarn workspace @total-guess/ingestion search:sanity       # 20 lexical searches
yarn workspace @total-guess/ingestion embed               # embed every product (local model, ~52 min, restartable)
yarn workspace @total-guess/ingestion bench:vector        # exact pgvector search latency
yarn workspace @total-guess/ingestion eval:run            # all retrieval strategies against the frozen labels
yarn workspace @total-guess/ingestion assistant:compare   # decomposition ceiling, no API key needed
yarn workspace @total-guess/ingestion assistant:ask "cheese for a toastie"   # needs ANTHROPIC_API_KEY
yarn workspace @total-guess/ingestion assistant:eval      # 43 assistant cases (paid API)
yarn workspace @total-guess/ingestion games generate      # fill the next 14 daily games
yarn workspace @total-guess/ingestion games publish       # push them to Appwrite for the app to read
yarn workspace @total-guess/ingestion games check         # health probe: is today ready?
```
The assistant is the only part that calls a paid API, and it needs a key in
`.env` (see `.env.example`). Tests, ingestion and retrieval never do.
Set `DATABASE_URL` (see `docker-compose.yml`) to use PostgreSQL; unset, a local PGlite database is used.

## Contract (`src/contract/`)

See [docs/domain-model.md](docs/domain-model.md) for the full model. The sections
below document the value types shared by every source.

### Quantity

One nullable object; the kind fixes the unit, and `makeQuantity()` derives `total`.

| Raw | kind | perPack | packCount | total |
| --- | --- | --- | --- | --- |
| `400g` | mass | 400 | 1 | 400 g |
| `1kg` / `1.2kg` | mass | 1000 / 1200 | 1 | 1000 / 1200 g |
| `4 x 400g` | mass | 400 | 4 | 1600 g |
| `2L` / `70cl` | volume | 2000 / 700 | 1 | 2000 / 700 ml |
| `6 x 330ml` | volume | 330 | 6 | 1980 ml |
| `4 pack` / `6 per pack` | count | 4 / 6 | 1 | 4 / 6 each |
| catch weight, typically 340 g (250–450 g) | mass | 340 | 1 | 340 g, `variableWeight: {min: 250, max: 450}` |

Anything else parses to `null` with a warning (`340`, `Each`, `2 x 6 pack`…):
a missing quantity is honest; a guessed one corrupts every unit price and
basket built on it. Conversions are exact decimal shifts, so `1.1kg` is 1100 g,
not 1100.0000000000002. Basket code must use `total`.

### Unit prices

`{ pence, basis: '100g' | 'kg' | '100ml' | 'litre' | 'each', source: 'retailer' | 'calculated' }`.
Pence may be fractional (`83.3p/kg`) and nothing rounds.

- `offer.retailerUnitPrice` is what the retailer displayed, on its own basis.
- `comparableUnitPrice(pricePence, quantity)` is ours: `pricePence / quantity.total`,
  per kg, litre or item. Cross-retailer comparison should use this.
- `convertUnitPrice` converts between bases of the same kind and throws across kinds.
- `unitPricesAgree` allows for the retailer rounding its display to the penny.

### Promotions and price conditions

`OfferData.pricePence` is the observed price; `priceCondition` (`none` / `loyalty_member` /
`unknown`) says who could pay it, so a member price is never mistaken for a shelf price.
Promotions are a closed union; each variant exists because its pattern appeared in real data
(examples below are generic):

| Type | Where seen | Rule for the basket engine |
| --- | --- | --- |
| `multibuy` | retailer text `Buy 2 for £3`, `Mix & Match - Any 3 for £5` | applies across all lines sharing `retailerPromotionId` |
| `price_reduction` | `Now £1, Was £1.50`, `Half price, was £4`, `Save 1/3, was £6`; Open Prices `SALE` | already in `pricePence`; never apply again |
| `clearance` | Open Prices `EXPIRES_SOON` | already in `pricePence`; exclude from typical-price statistics |
| `loyalty_price` | `£2.00 - More Card Price` | only if the shopper opts in |
| `unparsed` | badges, meal deals, bundles; unknown Open Prices discount codes | **never applied**; show the text or code only |

Retailer text only gets a mechanic when it matches exactly **and** its numbers agree with the
structured prices on the page. `text` is verbatim, or null when the source gives none;
`endsOn` is a UK calendar date (`"Order by 30/09/2026"` → `2026-09-30`).

### Semantic document and text hash (`src/documents/productDocument.ts`)

Built from `ProductDetails` only: name, brand, size, canonical categories, dietary
information, allergens, a nutrition sentence, description, ingredients. Prices,
retailers, stores, timestamps, provenance, image URLs and barcodes cannot reach it, so
a price observation never triggers a re-embed (tested).

## Database

Implemented: see [docs/catalogue.md](docs/catalogue.md) and `src/db/migrations/001_catalogue.sql`.

## Morrisons adapter (parser only; live access disabled)

Morrisons live ingestion is not proceeding. The first automated request
returned HTTP 403, and Morrisons marks its product data as for personal use
only; see [docs/source-feasibility.md](docs/source-feasibility.md). The parser,
fixtures and tests are kept because they exercise the contract against a real
retailer's page structure. `scripts/poc-fetch.ts` refuses to run.

The adapter reads the JSON the pages embed, never rendered text: the
schema.org JSON-LD block and `window.__QUERY_INITIAL_STATE__` on product pages,
and `window.__INITIAL_STATE__` on category listings. It cross-checks SKU and
price between sources and rejects the page on disagreement. What it handles:

- Unit prices in pounds (`GBP`) or pence (`GBX`), and unit-price labels given as i18n keys
  (`fop.price.per.kg`); labels outside the contract's five bases are dropped with a warning.
- "Each" unit prices that are per item when the pack count is known and per pack when not
  (flagged `unit_price_each_ambiguous`).
- Catch-weight products: a typical weight within a min–max range, priced as an estimate.
- Promotions matched by exact text and checked against the structured prices; multibuy
  scope taken from the promotion id, because one id commonly covers several products.
- Product pages produce a `ProductListing` (keyed by retailer SKU: the pages carry no
  barcode) plus a `PriceObservation`; listings produce `PriceObservation`s only, since they
  have no ingredients. Morrisons images have no licence, so they are never displayed.

Not verified on a real food product page before access stopped: allergens, dietary
icons and the food nutrition-table layout. Test fixtures are fictional products in the
page structure. Real captures, if any exist locally, live in `.captures/` (gitignored)
and must never be committed.
