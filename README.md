<h1 align="center">Total Guess</h1>

<p align="center">
  <strong>Guess the total cost of the shopping, one basket a day.</strong><br />
  Ten real supermarket products. One guess each. How close can you get?
</p>

<p align="center">
  <a href="https://www.total-guess.com"><img alt="Play Total Guess" src="https://img.shields.io/badge/▶%20Play-www.total--guess.com-40E0D0?style=for-the-badge&labelColor=36454F" /></a>
</p>

<p align="center">
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white" />
  <img alt="React Router 6" src="https://img.shields.io/badge/React_Router-6-ca4245?logo=reactrouter&logoColor=white" />
  <img alt="Appwrite" src="https://img.shields.io/badge/Appwrite-accounts_%2B_stats-fd366e?logo=appwrite&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white" />
  <img alt="268 products" src="https://img.shields.io/badge/catalogue-268_products-36454F" />
</p>

<p align="center">
  <img src="docs/demo.gif" alt="Playing Total Guess: the daily basket, guessing each item, the running total, the result and the receipt" width="900" />
</p>

---

## Where it came from

This game is something I actually used to do.

Every shop, I'd add the prices up in my head on the way round and commit to a number before reaching the till — then watch the display and see how close I got. Being a couple of quid out felt fine. Being pennies out felt brilliant.

Then, in a Sainsbury's in 2009, I got it **exactly right. To the penny.** Nobody else in the queue had the faintest idea why I was so pleased with myself. I still remember it.

Total Guess is that habit turned into a daily game: ten real products, photographed in real shops, and one guess each before the total is revealed.

---

## How to play

|  | |
| :--: | --- |
| **1** | Open [www.total-guess.com](https://www.total-guess.com) and press **Play**, or **Play As Guest** to skip signing up. |
| **2** | You get **ten products**, one at a time, each with its shop and a photo. |
| **3** | Type what you think each one costs. The **sub total** builds as you go — that's your running guess, not the answer. |
| **4** | **Back** lets you redo the item you just guessed if you change your mind. |
| **5** | After the tenth item you get the verdict: the real total, your total, the difference, and your error as a percentage. |
| **6** | Open the **Receipt** to see every item priced against your guess, and share the result. |
| **7** | Come back tomorrow. **One basket a day**, the same one for everyone, rolling over at midnight UTC. |

Scoring is the percentage you were out by, signed: **−12%** means you under-guessed, **+12%** means you over-guessed, and the closer to zero the better. It's capped at ±35%, so one wild guess doesn't wreck your distribution.

---

## What's in a basket

268 products from ten UK supermarkets — Tesco, Sainsbury's, Asda, Waitrose, M&S, Aldi, Morrisons, Co-op, Iceland and Lidl. Every photo is a real product; prices are representative rather than live, because the game is about judging a total, not tracking inflation.

Each day picks ten of them with a seeded shuffle keyed to the day number, so everybody gets the same basket, an item never appears twice in one game, and the whole catalogue is used before any basket comes round again — **26 unique games** before a repeat.

---

## Stats

Your history is kept whether or not you sign up:

- **Signed in** — saved to your Appwrite account, so it follows you between devices.
- **As a guest** — kept in your browser, and carried across to your account if you register later.

The Statistics panel shows games played, current and best streak, your best guess, average error, error bias, and a distribution of every result you've recorded.

---

## How it's built

| Layer | Choice |
| --- | --- |
| **Frontend** | React 18 (Create React App), React Router 6, Chart.js for the distribution |
| **Data** | The catalogue and the daily basket live in the repo — no backend, no database to keep alive |
| **Accounts** | Appwrite Cloud, free tier |
| **Stats** | Appwrite TablesDB for signed-in players, with owner-only row permissions; localStorage for guests |
| **Hosting** | Vercel, free tier |

```
src/
├── data/
│   ├── items.js         # 268 products: description, shop, price
│   └── dailyGame.js     # seeded daily pick, game number, date handling
├── api/
│   ├── auth.js          # sign up, sign in, sign out (Appwrite)
│   └── stats.js         # stats for accounts and for guests
├── game/                # the basket, numpad, results
├── Modals/              # statistics, receipt, instructions, badges
└── hooks/context.jsx    # session and stats shared across the app
public/items/            # the product photos
```

### It used to have a backend

The original ran on a NestJS API with MongoDB, plus a pair of AWS Lambdas, with the product photos on S3. That stack is retired: the API and the cluster are gone, the images now ship with the app, and the daily basket is generated in the browser from the date. Accounts moved to Appwrite. Nothing needs paying for or keeping awake.

---

## Running it locally

```bash
yarn install
cp .env.example .env    # optional: only accounts and synced stats need it
yarn start              # http://localhost:3000
```

Without the Appwrite variables the game is fully playable as a guest, with stats kept in the browser.

| Variable | Example |
| --- | --- |
| `REACT_APP_APPWRITE_ENDPOINT` | `https://fra.cloud.appwrite.io/v1` |
| `REACT_APP_APPWRITE_PROJECT_ID` | `total-guess` |
| `REACT_APP_APPWRITE_DATABASE_ID` | `totalguess` |
| `REACT_APP_APPWRITE_STATS_TABLE_ID` | `stats` |

The Appwrite schema lives in `appwrite.config.json` — `npx appwrite-cli push tables --all` recreates it, and each deployed hostname needs registering as a web platform.

### Adding products

Drop a photo in `public/items/<code>.jpg` and add a row to `src/data/items.js`. The code's first two letters set the shop (`te` Tesco, `sa` Sainsbury's, `as` Asda, `wa` Waitrose, `oa` M&S, `al` Aldi, `mo` Morrisons, `co` Co-op, `il` Iceland, `li` Lidl). More products means more unique days before a repeat.

---

<p align="center">
  Built because I couldn't stop doing it in the queue anyway
</p>
