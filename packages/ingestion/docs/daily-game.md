# The daily game

Every day a player opens Total Guess and a game is there. That is the whole
requirement, and this is the whole architecture:

```
catalogue refresh (occasional)
        │
        ▼
eligible_game_item          a view: curated items + catalogue products that have
        │                   a licensed image and a real, dated price
        ▼
yarn games generate         fills any missing day in a 14-day window, deterministically
        │
        ▼
daily_game (PostgreSQL)     one frozen row per date; a played game cannot change
        │
        ▼
yarn games publish          writes public/games/<id>.json, encrypted, create-only
        │
        ▼
browser                     fetches today's file; falls back to its cached copy of it
```

No queue, no cache, no scheduler beyond a cron, and nothing that must be running
at the moment somebody plays.

## Why a snapshot rather than a calculation

The game was always deterministic — the day number seeded a shuffle of 268
items — and that already gave everyone the same basket and made any day
reproducible. It had one flaw: **changing the item list silently rewrote
history.** Edit a price, and yesterday's game had a different answer than the
one people played; delete a photo, and an old game broke.

So generation copies everything a game needs into the row: name, price, shop,
quantity, image and where each value came from. A game never joins back to the
catalogue, which is what makes refreshing the catalogue safe.

## The pool

`eligible_game_item` is the only definition of what may appear in a game.

| source | items | price | image |
|---|---|---|---|
| curated | 268 | representative, hand-set | photograph shipped with the app |
| Open Food Facts + Open Prices | 875 | a real price observed in a named UK shop, with its date | catalogue photo under its licence, credited on screen |

**1,143 items — about 114 days before a product can come round again.**

A catalogue product is only eligible when everything the screen needs is
present: a front image with a licence and attribution, a regular (not
loyalty-card) price between 20p and £20 observed in the last three years, a
quality tier of A or B, a brand, a quantity, and a name short enough to read.
Curated items skip the price bounds, because they are hand-set and the game
already contains a £30 bottle of whisky.

Prices are honest about what they are. An observed price carries the shop and
the date it was seen; a curated price is marked `representative` and is not
claimed to be current. Nothing here is scraped.

## Freezing

A game whose date has arrived is history. That is enforced in the database, not
just in the generator:

```sql
CREATE TRIGGER daily_game_frozen BEFORE UPDATE OR DELETE ON daily_game ...
    -- marking it published is fine; changing its items is not
```

The generator is stricter still: it never regenerates a date that already has a
game, future or past. So a catalogue refresh reaches only days that have not
been generated yet — at most a fortnight's delay before new prices appear, in
exchange for never rewriting a game somebody is about to play.

## Running it

```bash
yarn workspace @total-guess/ingestion games generate    # fill the next 14 days (--days N)
yarn workspace @total-guess/ingestion games publish     # write public/games/<date>.json
yarn workspace @total-guess/ingestion games check       # the health probe; exits 1 if short
yarn workspace @total-guess/ingestion games show --date 2026-09-19
```

### The normal top-up

**Two years of games are published**, so ordinarily there is nothing to do.
When the runway runs short, or after a catalogue refresh:

```bash
yarn workspace @total-guess/ingestion games generate --days 730
yarn workspace @total-guess/ingestion games publish
git add public/games && git commit -m "chore: publish games" && git push
```

Then `games check` to confirm. Refreshing the catalogue is **optional and
separate** — do it when the pool feels stale, not on every top-up:

```bash
# optional, occasionally
yarn workspace @total-guess/ingestion prices:import      # monthly-ish: new Open Prices observations
yarn workspace @total-guess/ingestion off:import         # quarterly-ish: the OFF dump

# the top-up itself
yarn workspace @total-guess/ingestion games generate     # fills any missing day in the window
yarn workspace @total-guess/ingestion games check        # exits non-zero if today is missing or the runway is short
yarn workspace @total-guess/ingestion games publish      # writes the unpublished days to public/games/
```

A refresh only affects days that do not have a game yet, so running it never
disturbs the fortnight already generated.

`generate` and `publish` are both idempotent, so `games generate && games
publish` on a timer is the entire schedule. `check` reports whether today exists, how many days are ready ahead, and
whether today's file has actually been written; it exits non-zero if today is
missing or fewer than seven days are ready.

### Where published games live

`public/games/<id>.json`, deployed with the app.

**No service, no credentials, no database.** Publishing writes files; deploying
them is a commit. The browser fetches from the same origin that served the
page, so a game can only be unavailable if the site itself is.

Because anyone can request any file, two things keep future games from being
casually readable:

| | |
|---|---|
| **The filename** | `HMAC-SHA256(salt, "game:" + date)`, first 32 hex characters — so the directory cannot be walked by trying dates |
| **The body** | AES-256-GCM, key = `PBKDF2(salt, date, 100k, SHA-256)` — so a file that is found gives nothing away |

```json
{ "v": 1, "iv": "W7E1NBRix7CyGd2v", "data": "JCAZtTKrNKPVBdqWus28BAB3KN..." }
```

**This is obfuscation, not secrecy, and it should not be described as more.**
The salt is compiled into the bundle, because the browser has to derive the
same name and key; anyone willing to read the JavaScript can do the same. And
**today's prices are visible in the network tab regardless** — they have to be,
since the guess is scored in the browser. What it buys is that tomorrow's
answers are not one URL away.

Real secrecy would mean scoring on a server, which this project deliberately
does not have.

The salt lives in two places and must match: `GAMES_SALT` in
`packages/ingestion/.env` for publishing, and `REACT_APP_GAMES_SALT` in the root
`.env` (and in the hosting provider's build environment) for reading. Publishing
without a salt writes plain, date-named files, which is fine for local work and
obvious from the command's output.

`packages/ingestion/src/game/encryption.ts` and `src/api/gameFile.js` implement
the two halves. They are tested against each other with a fixture produced by
the publisher, so the pair cannot drift apart unnoticed.

One wrinkle worth knowing: `vercel.json` rewrites unmatched paths to
`index.html`, so a request for a file that does not exist returns **HTTP 200
with the app's HTML** rather than a 404. Parsing it as JSON fails, which the
fetch treats as "no game published", and a test covers exactly that.

This replaced a plan to store games in an Appwrite table. Appwrite's free tier
would not carry it, and £40/month to serve 3 kB of static JSON a day is not a
trade worth making — particularly when the file is the more reliable of the two
options anyway. Appwrite still handles accounts and stats, on the free tier.



## Capacity

1,143 items, ten a game: **114 games before any item can reappear**. Reuse after
that is a clean rotation — generating two years (730 games) and measuring the
result:

| | |
|---|---|
| games | 730 |
| distinct items used | 1,143 (all of them) |
| times each item is used | 6–7 |
| **minimum days between an item repeating** | **114** |
| games containing a duplicate item | 0 |
| basket totals | £12.93 – £62.58, median £24.25 |

The minimum, median and 5th percentile of the repeat gap are all exactly 114, so
an item returning on consecutive days is not unlikely — it is impossible. For
comparison, the original 268-item catalogue repeated every 26 days.

## Price age, measured

The prices are real but they are **not current**, and the game must never imply
otherwise. Measured across the 1,143 eligible items on 19 September 2026:

| | |
|---|---|
| newest observation | 17 Sep 2026 (2 days old) |
| oldest observation | 25 Jun 2024 |
| median age | **358 days** |
| p75 / p90 age | 570 / 685 days |

| age | items |
|---|---|
| ≤ 30 days | 13 |
| ≤ 90 days | 42 |
| ≤ 180 days | 128 |
| ≤ 365 days | 473 |
| > 365 days | 402 |

By retailer (Open Prices only):

| shop | items | median age | within 180 days |
|---|---|---|---|
| Lidl | 322 | 346 d | 50 |
| Tesco | 198 | 542 d | 5 |
| Sainsbury's | 103 | 604 d | 9 |
| Aldi | 58 | 310 d | 1 |
| Morrisons | 55 | 491 d | 3 |
| M&S | 45 | 161 d | 32 |
| Co-op | 43 | 343 d | 9 |
| Asda | 28 | 161 d | 17 |
| Iceland | 17 | 347 d | 0 |
| Waitrose | 6 | 332 d | 2 |

The 268 curated items have no observation date at all: they are representative
prices, marked as such.

### How that is presented

Nothing changes on the guessing screen — it still shows the shop, the product
and the photograph, exactly as before. After the answer is revealed, each row of
the breakdown carries one quiet line:

```
Observed at Tesco · 14 Mar 2025
Sainsbury's · representative price
```

That is the whole change. A player is never told a price is today's, and the
snapshot keeps the price, the shop, the observation date and the source so the
claim can always be checked.

## Refreshing prices

**What can be refreshed automatically**, from sources already in use:

| source | refreshable | how |
|---|---|---|
| Open Prices | yes | re-run the price import; new community observations appear continuously |
| Open Food Facts | yes | re-run the dump import; new products, images and corrections |
| curated 268 | no | hand-set representative prices; only a person can revise them |
| retailer sites | **no** | out of bounds — Morrisons blocked automated access, and scraping is not reintroduced |

Open Prices is the only thing that makes the game fresher on its own, and it is
a community dataset: roughly 470 observations arrived in 2026 so far. It will
not keep every product current, and pretending otherwise would be dishonest —
hence the dated provenance line rather than a claim of live pricing.

**Recommended cadence:**

| what | how often | why |
|---|---|---|
| `prices:import` (Open Prices) | monthly | new observations trickle in; monthly is enough to notice them |
| `off:import` (OFF dump) | quarterly | 13 GB download; products and images change slowly |
| curated price review | yearly, or when the pool looks stale | a person spot-checks the 268 representative prices |
| `games generate && games publish` | fortnightly | keeps the 14-day window full |

Only the last one is required to keep the game running. The first three change
what future games are drawn from; skipping them makes the pool staler, never
broken.

An optional refinement, deliberately **not** built: prefer fresher observations
when generating, by ordering the pool on observation age. It would bias games
towards the 128 items seen in the last six months and make them repeat more
often — worse variety in exchange for fresher prices. Worth revisiting only if
price age becomes a real complaint.

## If something breaks

The failure that matters is "no game today", and there are three independent
defences:

1. **Two years of games are published ahead**, so a failed refresh, a broken
   ingest or a year of nobody looking changes nothing.
2. **Published games are immutable**, so a bad refresh cannot corrupt a game
   that already exists.
3. **The browser keeps a copy of today's game**, so a network blip mid-session
   does not lose it. There is deliberately no local generator: a basket built
   in the browser would differ from everybody else's, and an incomparable score
   nobody knows is incomparable is worse than an honest error.

The assistant, embeddings and pgvector are not in this path. If Anthropic is
down, if the OFF dump fails to import, if the assistant is switched off
entirely, the daily game is unaffected.

### The operational gap, stated plainly

Generation reads the PostgreSQL catalogue, which runs in Docker on a developer
machine, so `generate` and `publish` are run by hand. With two years published
that is not a chore anyone will meet often — but it has a cost worth stating:
**a game freezes its prices when it is generated**, so every one of those 730
baskets carries prices as they were in September 2026.

Future games can be deleted and regenerated — the freeze trigger only protects
today and the past — so a refresh can be applied to unplayed days later. Doing
that would mean re-publishing the affected files, which is why publishing far
ahead trades price freshness for never having to think about it.
