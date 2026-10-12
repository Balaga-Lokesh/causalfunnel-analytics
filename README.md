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
│       └── routes/           events, sessions, pages (heatmap)
├── tracker/      tracker.js — the embeddable tracking script
├── demo/         static demo store pages that load the tracker
└── dashboard/    Next.js dashboard (Sessions + Heatmap views)
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/events` | Receive and store one event or a batch (`{ events: [...] }`) |
| `GET` | `/api/sessions` | Sessions with event counts |
| `GET` | `/api/sessions/:sessionId/events` | All events of a session, in order |
| `GET` | `/api/pages` | Tracked page URLs (for the heatmap selector) |
| `GET` | `/api/pages/clicks?url=<page_url>` | Click positions for a page (heatmap) |
| `GET` | `/api/health` | Health check |

## Setup

**Prerequisites:** Node.js 20+, a MongoDB connection string (a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster works).

```bash
npm install
cp backend/.env.example backend/.env          # then set MONGODB_URI
cp dashboard/.env.example dashboard/.env.local
npm run dev
```

- API + demo site: http://localhost:4000/demo/
- Dashboard: http://localhost:3000

### Adding the tracker to any page

```html
<script src="https://<api-host>/tracker.js" data-endpoint="https://<api-host>/api/events" defer></script>
```

## Assumptions & trade-offs

_TBD_
