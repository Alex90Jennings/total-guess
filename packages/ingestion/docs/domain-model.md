# Domain model (Contract v2)

The model every later stage (database, ingestion, retrieval, the assistant)
builds on. Types live in `src/contract/`; each is a zod schema with its
TypeScript type inferred from it, so runtime validation and compile-time
types cannot drift.

## Sources

| Source | Role | Status |
| --- | --- | --- |
| **Open Food Facts** | **Primary, licensed product corpus** (ODbL / DbCL; images CC BY-SA) | active |
| **Open Prices** | **Sparse historical price observations** (ODbL), crowdsourced from receipts and shelf tags | active |
| **Morrisons** | Investigated; **disabled** because of HTTP 403 and a personal-use/reproduction restriction | disabled |
| **Curated** | The legacy game catalogue: names and representative prices, no barcodes, no dates | active (legacy) |

**The future AI system will not claim to know current supermarket prices.**
Open Prices tells us that a price was observed at a shop on a day, for a small
and mostly old slice of products (see [source-feasibility.md](source-feasibility.md)).
Anything shown to a user is phrased as evidence, "£2.50, observed at Tesco on
14 March 2026", never as "Tesco price: £2.50". A genuinely current source would
be a new DataSource with its own terms, not a relabelling of this one.

## Concepts

```
DataSource ──supplies──▶ records, each carrying one Provenance
                          │
   ProductRecord ─────────┤  Product (canonical, keyed by barcode) + Provenance
   ProductListing ────────┤  a product as one retailer/source identifies it (SKU, curated code) + Provenance
   PriceObservation ──────┤  evidence of a price: ProductReference + Retailer + Store + OfferData + dates + Provenance
   ReferencePrice ────────┘  an undated representative price (legacy curated only) + Provenance

Retailer (registry, with aliases) ◀── Store (a shop, from a price source)
ProductImage: its own source, licence, attribution and contributor
```

| Concept | Identity | Notes |
| --- | --- | --- |
| `DataSource` | `open_food_facts` · `open_prices` · `morrisons` · `curated` | Who supplied the data. Has a licence, attribution text, image licence and status. Never the retailer. |
| `Retailer` | registry id (`tesco`, `sainsburys`, `asda`, `morrisons`, `lidl`, `aldi`, `waitrose`, `coop`, `mands`, `iceland`) | Who sells. Resolved from names via aliases ("Tesco Express" → `tesco`). Shops outside the registry resolve to `null` and keep their own name on the Store. |
| `Store` | source store id and/or OSM identity | Name, postcode, city, country. No coordinates. |
| `Product` | **barcode**: 14-digit canonical GTIN, check digit valid, not an in-store code | Canonical product. No price, retailer or store fields. |
| `ProductListing` | `retailer_sku` or `source_record` reference | For sources without barcodes (Morrisons SKUs, curated codes). May link to a Product via `barcode`. Keeps the retailer's own breadcrumb. |
| `ProductReference` | `barcode` · `retailer_sku` · `source_record` | Discriminated union. OFF and Open Prices join on `barcode`. |
| `PriceObservation` | its Provenance record | Evidence of a price on `observedOn`. Not an offer. |
| `ReferencePrice` | its Provenance record | Legacy representative price. Deliberately not a PriceObservation. |

## Product details

- **Quantity**: one object; kind fixes the unit (mass → g, volume → ml, count → each); `total = perPack × packCount`; weighed items carry a min–max range.
- **Categories**: `canonical` = Open Food Facts taxonomy ids (`en:oat-milks`), which retrieval can filter on. Retailer breadcrumbs are not canonical and live on `ProductListing.retailerCategoryPath`.
- **Allergens**: `contains` (declared) and `mayContain` (precautionary) over the UK's 14 allergens, plus `unrecognised` for anything else. `status` is `listed`, `none_listed` or `unknown`; **`none_listed` is not "allergen-free"** and must never be shown as such.
- **Dietary**: `claims` (what the packaging/source states) and `inferred` (a deterministic reading of the ingredients, with who inferred it, as `yes`/`no`/`maybe`/`unknown`). Both are kept when they disagree. Queries pick a policy explicitly with `dietaryMatch(…, 'claims_only' | 'claims_or_inferred')`; `unknown` is never a yes. Gluten-free is claim-only.
- **Nutrition**: numbers per 100 g or 100 ml for energy (kcal), fat, saturates, carbohydrate, sugars, fibre, protein and salt. Missing is `null`, never 0. `compareNutrient` returns `null` for missing values, so "protein ≥ 20 g" never passes on no data. `derived` lists values we calculated (kcal from kJ). `raw` keeps a source's own text table.
- **Images**: remote URL, role, source, licence, attribution, contributor, source page. Never copied. `canDisplayPublicly` is false without a licence and attribution (so Morrisons and legacy images are not shown).

## Offers and promotions

`OfferData.pricePence` is always the price actually observed, and `priceCondition` says who could pay it:

| priceCondition | Meaning |
| --- | --- |
| `none` | Any shopper, including reductions open to everyone |
| `loyalty_member` | Only with a loyalty card. **Never a shelf price** |
| `unknown` | Discounted, but the source did not say how |

"What does a normal shopper pay?" uses `none` only. Promotions stay a closed union:
`multibuy`, `price_reduction`, `clearance` (short-dated; excluded from "typical price"
statistics), `loyalty_price`, `unparsed` (never applied to a total). Open Prices gives
no promotion wording, so `text` is null there and `unparsed` carries the source's code
(e.g. `QUANTITY`).

## Provenance

Record-level, plus images. Every record a mapper emits comes from exactly one
source record, so `record.provenance` answers "where did this value come from?"
for every value in it:

`source · sourceRecordId · sourceUrl · importedAt · sourceUpdatedAt · licence · attribution`

Licence and attribution are snapshotted from the DataSource registry at import.
`importedAt` (when we fetched it) and a PriceObservation's `observedOn` (when the
price applied) are always separate fields.

Field-level provenance becomes necessary only when one product is assembled
from several sources (e.g. OFF text plus retailer nutrition). Nothing does that
yet. When it does, the merged product should store, per field group, which
source record it was taken from (see the schema recommendation in the
package README) rather than copying provenance onto every field.

## Semantic document

`buildProductDocument(details)` renders name, brand, size, canonical categories,
dietary information (marked labelled or from ingredients), contains and may-contain,
a nutrition sentence, description and ingredients. `productTextHash` is SHA-256 over
it plus a document version. It takes `ProductDetails` only, so prices, retailers,
stores, timestamps, provenance, image URLs and barcodes cannot affect it: a new
price observation never triggers a re-embed.

## Mappers

| Mapper | Input | Output |
| --- | --- | --- |
| `sources/openFoodFacts/mapProduct.ts` | OFF product JSON | `ProductRecord` |
| `sources/openPrices/mapPrice.ts` | Open Prices price JSON | `PriceObservation` |
| `adapters/morrisons/*` (disabled source) | captured pages / fixtures | `ProductListing` + `PriceObservation`; listings → `PriceObservation` |
| `sources/curated/mapItem.ts` | `src/data/items.js` rows | `ProductListing` + `ReferencePrice` |

All output passes the contract schemas before it is returned. Nothing downstream
branches on the source.
