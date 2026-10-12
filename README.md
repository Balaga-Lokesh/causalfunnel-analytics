# User Analytics — CausalFunnel Assignment

A small full-stack analytics app: a drop-in JavaScript tracker records page views and clicks, a Node.js API stores them in MongoDB, and a Next.js dashboard shows sessions, user journeys and click heatmaps.

> **Live demo:** _TBD_ · **Dashboard:** _TBD_ · **Video walkthrough:** _TBD_

## Tech stack

| Part | Tech |
|---|---|
| Tracker | Vanilla JavaScript (no dependencies, no build step) |
| Backend | Node.js, Express 5, TypeScript, Mongoose, Zod |
| Database | MongoDB (Atlas) |
| Dashboard | Next.js (App Router), React, TypeScript, Tailwind CSS |

## Project structure

```
.
├── backend/      Express API (TypeScript) — also serves tracker.js and the demo site
│   └── src/
│       ├── app.ts            express app, CORS, static files
│       ├── index.ts          entrypoint (connect DB, start server)
│       ├── config.ts         env config
│       ├── db.ts             MongoDB connection
│       ├── validation.ts     Zod schemas for incoming events
│       ├── models/Event.ts   event schema + indexes
│       ├── routes/           events, sessions, pages (heatmap)
│       └── scripts/          seed script + measured demo-store layout
├── tracker/      tracker.js — the embeddable tracking script
├── demo/         "Trailhead Supply Co.", a static demo store (home, product, checkout) that loads the tracker
└── dashboard/    Next.js dashboard (Sessions + Heatmap views)
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events` | Receive and store one event or a batch (`{ events: [...] }`). Accepts JSON or `text/plain` (sendBeacon). Returns `202 { accepted }` |
| `GET` | `/api/sessions?limit=50&offset=0` | Sessions with event counts, most recent first: totals, page views, clicks, unique pages, duration, entry/exit page |
| `GET` | `/api/sessions/:sessionId/events` | All events of a session in time order (the user journey); `404` if unknown |
| `GET` | `/api/pages` | Tracked pages with view/click/session counts (feeds the heatmap selector) |
| `GET` | `/api/pages/clicks?url=<page_url>&limit=5000` | Click positions for a page with page/viewport size; raw URLs are normalized like on ingest |
| `GET` | `/api/health` | Health check |

Invalid input returns `400` with Zod issue details.

### Event shape

```jsonc
{
  "session_id": "b0fc56d6-…",          // localStorage, rotates after 30 min idle
  "event_type": "click",               // "page_view" | "click"
  "page_url": "https://shop.example/product?id=1",
  "timestamp": "2026-10-12T14:20:15.035Z",
  "x": 240, "y": 264,                  // clicks only; document coordinates (pageX/pageY)
  "viewport_width": 1280, "viewport_height": 720,
  "page_width": 1280, "page_height": 2400,
  "target": "a.btn \"Add to cart\""    // short description of the clicked element
}
```

The server stores `page_url` normalized (origin + path, no query/hash, `/a/`, `/a.html` and `/a/index.html` → `/a`) and keeps the original in `full_url`.

## Setup

**Prerequisites:** Node.js 20+, a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).

```bash
npm install
cp backend/.env.example backend/.env          # then set MONGODB_URI
cp dashboard/.env.example dashboard/.env.local
npm run dev
```

- API + demo store: http://localhost:4000/demo/
- Dashboard: http://localhost:3000

### Sample data (optional)

```bash
npm run seed                                  # 80 sample sessions over the last 14 days
npm run seed -- --sessions 200 --days 30      # more data
npm run seed -- --base-url https://<api-host> # when the demo store is hosted elsewhere
npm run seed -- --clear                       # remove sample data only
```

The seed script simulates visitors moving through the demo store (home → product → checkout, with realistic drop-off) on desktop, tablet and phone. Click positions come from [`demo-layout.json`](backend/src/scripts/demo-layout.json): the clickable areas of each demo page measured in a real browser at 1280px, 820px and 390px, so seeded clicks land on the actual buttons in the heatmap.

Sample sessions are always distinguishable from real traffic: their `session_id` starts with `seed-`, the dashboard tags them **Sample**, and re-running the script replaces only them, never real tracked data.

### Adding the tracker to any page

```html
<script src="https://<api-host>/tracker.js" defer></script>
```

Events go to `/api/events` on the same host as the script. Use `data-endpoint="…"` to send them elsewhere, or `data-debug` to log each event to the console.

## Assumptions & trade-offs

_TBD_
