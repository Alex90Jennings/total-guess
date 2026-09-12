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
| **7** | That's your lot. **One basket a day**, the same ten items for everyone. The Play button is then replaced by a **countdown to the next basket**, ticking down to midnight UTC. |

Scoring is the percentage you were out by, signed: **−12%** means you under-guessed, **+12%** means you over-guessed, and the closer to zero the better. Zero is the whole point — the penny-perfect basket.

---

## The shame

> **±35% is the wall.**

Past it, the game stops counting. However spectacularly wrong you were — 60%, 200%, you confidently valued a bag of pasta at fourteen pounds — the score you get is **35%+**, and no worse. Not mercy: there is no number big enough to be worth recording, so everyone who wandered that far off gets filed together.

What it costs you:

- Your result lands in the **`35%+` column at the end of the distribution**, the one you can see from across the room.
- It sits in your history permanently, dragging your **average error** up and your **error bias** with it.
- It is the only result on the chart that doesn't tell you how close you got, because you weren't.

Under-guess by 35% and you're the person who thinks food is still 2009 prices. Over-guess by 35% and you're the person who'd have been fine paying it. Neither is a good look. **Stay inside the wall.**

---

## What's in a basket

268 products from ten UK supermarkets — Tesco, Sainsbury's, Asda, Waitrose, M&S, Aldi, Morrisons, Co-op, Iceland and Lidl. Every photo is a real product; prices are representative rather than live, because the game is about judging a total, not tracking inflation.

Each day picks ten of them with a seeded shuffle keyed to the day number, so everybody gets the same basket, an item never appears twice in one game, and the whole catalogue is used before any basket comes round again — **26 unique games** before a repeat.

---

## Stats

Your history is kept whether or not you sign up:

- **Signed in** — saved to your Appwrite account, so it follows you between devices.
- **As a guest** — kept in your browser, and carried across to your account if you register later.

The Statistics panel shows games played, current and best streak, your best guess, average error, error bias, and a distribution of every result you've recorded — from a dead-centre `±5%` through to the `35%+` columns at either end, where the shame lives.

---

## Badges

Nine to collect — six for turning up, three for actually being good. They're worked out from your history, so they apply to every game you've ever played, not just the ones since you started paying attention.

**For showing up**

| | | | | | |
| :--: | :--: | :--: | :--: | :--: | :--: |
| <img src="public/icons/one-game.png" width="46" /> | <img src="public/icons/five-game.png" width="46" /> | <img src="public/icons/ten-game.png" width="46" /> | <img src="public/icons/twenty-game.png" width="46" /> | <img src="public/icons/fifty-game.png" width="46" /> | <img src="public/icons/hundred-game.png" width="46" /> |
| 1 game | 5 games | 10 games | 20 games | 50 games | 100 games |

**For getting close**

| | | |
| :--: | :--: | :--: |
| <img src="public/icons/ten-guess.png" width="52" /> | <img src="public/icons/five-guess.png" width="52" /> | <img src="public/icons/one-guess.png" width="52" /> |
| Guess under **10%** | Guess under **5%** | Guess under **1%** |

The accuracy three go by your **best ever** basket, so one brilliant day keeps them. Earn one mid-game and it's announced on the spot; the full set lives behind the button with your initials, or under **Badges** in the menu on a phone. Locked ones stay on display, greyed out, with how far you've got — `6/10 games`, `Best so far: 4.9%`.

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
