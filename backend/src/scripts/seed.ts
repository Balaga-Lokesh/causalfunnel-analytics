/**
 * Seeds the database with realistic sample sessions on the demo store, so the
 * dashboard has something to show before real traffic arrives.
 *
 *   npm run seed -w backend                       # replace sample data with 80 sessions
 *   npm run seed -w backend -- --sessions 200 --days 30
 *   npm run seed -w backend -- --base-url https://my-api.onrender.com
 *   npm run seed -w backend -- --clear            # only remove sample data
 *
 * Sample sessions are clearly marked: their session_id starts with "seed-"
 * (the dashboard labels them "Sample"). Real tracked data is never touched.
 *
 * Click positions come from demo-layout.json: the clickable areas of each demo
 * page measured in a real browser at desktop, tablet and phone widths, so the
 * heatmap lines up with the actual page.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import mongoose from 'mongoose';
import { config } from '../config.js';
import { connectDB, disconnectDB } from '../db.js';
import { toDocument } from '../lib/events.js';
import { Event } from '../models/Event.js';
import { incomingEventSchema, type IncomingEvent } from '../validation.js';

export const SEED_PREFIX = 'seed-';

type PageKey = 'home' | 'product' | 'checkout';
type Spot = [target: string, x: number, y: number, w: number, h: number, weight: number, next: PageKey | 'done' | null];
interface Layout {
  vw: number;
  vh: number;
  pw: number;
  ph: number;
  spots: Spot[];
}
interface DemoLayout {
  pages: Record<PageKey, { path: string; layouts: Layout[] }>;
}

const layoutData = JSON.parse(
  readFileSync(new URL('./demo-layout.json', import.meta.url), 'utf8'),
) as DemoLayout;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const { values: args } = parseArgs({
  options: {
    sessions: { type: 'string', default: '80' },
    days: { type: 'string', default: '14' },
    'base-url': { type: 'string', default: process.env.DEMO_BASE_URL ?? `http://localhost:${config.port}` },
    seed: { type: 'string', default: '42' },
    clear: { type: 'boolean', default: false },
  },
});

const SESSION_COUNT = Math.max(1, Number(args.sessions) || 80);
const DAYS = Math.max(1, Number(args.days) || 14);
const BASE_URL = args['base-url']!.replace(/\/+$/, '');

// ---------------------------------------------------------------------------
// Deterministic randomness (same --seed → same data)
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(Number(args.seed) || 42);
const between = (min: number, max: number) => min + random() * (max - min);
const chance = (p: number) => random() < p;

function pickWeighted<T>(items: T[], weight: (item: T) => number): T {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let r = random() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1]!;
}

/** Roughly normal (sum of uniforms), clamped to [0, 1]. Clicks cluster near element centers. */
function centered(): number {
  const n = (random() + random() + random()) / 3;
  return Math.min(1, Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Visitors
// ---------------------------------------------------------------------------

const DEVICES = [
  {
    weight: 0.6,
    vw: 1280,
    agents: [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:143.0) Gecko/20100101 Firefox/143.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0',
    ],
  },
  {
    weight: 0.1,
    vw: 820,
    agents: ['Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1'],
  },
  {
    weight: 0.3,
    vw: 390,
    agents: [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36',
    ],
  },
];

const REFERRERS = [
  { url: undefined, weight: 4 }, // direct
  { url: 'https://www.google.com/', weight: 4 },
  { url: 'https://www.instagram.com/', weight: 2 },
  { url: 'https://www.reddit.com/r/hiking/', weight: 1 },
];

/** Probability of moving on to another page (instead of leaving) from each page. */
const CONTINUE_PROBABILITY: Record<PageKey, number> = { home: 0.7, product: 0.55, checkout: 0.45 };

const PRODUCT_IDS = ['backpack', 'tent', 'bottle', 'jacket'];

function pageUrl(page: PageKey): string {
  const path = layoutData.pages[page].path;
  // Product links carry an id; the server normalizes it away for the heatmap.
  const query = page === 'product' && chance(0.6) ? `?id=${PRODUCT_IDS[Math.floor(random() * PRODUCT_IDS.length)]}` : '';
  return `${BASE_URL}${path}${query}`;
}

function layoutFor(page: PageKey, vw: number): Layout {
  return layoutData.pages[page].layouts.find((l) => l.vw === vw)!;
}

function clickIn(spot: Spot) {
  const [target, x, y, w, h] = spot;
  return { target, x: Math.round(x + centered() * w), y: Math.round(y + centered() * h) };
}

// ---------------------------------------------------------------------------
// Session simulation
// ---------------------------------------------------------------------------

function simulateSession(now: number): { events: IncomingEvent[]; userAgent: string } {
  const device = pickWeighted(DEVICES, (d) => d.weight);
  const userAgent = device.agents[Math.floor(random() * device.agents.length)]!;
  const sessionId = `${SEED_PREFIX}${randomUUID()}`;

  // Start time: biased towards recent days, mostly daytime hours.
  const daysAgo = Math.pow(random(), 1.6) * DAYS;
  const start = new Date(now - daysAgo * 86_400_000);
  start.setHours(Math.floor(between(8, 23)), Math.floor(between(0, 60)), Math.floor(between(0, 60)));
  let t = Math.min(start.getTime(), now - 60 * 60_000);

  const events: IncomingEvent[] = [];
  let page: PageKey = chance(0.75) ? 'home' : 'product';
  let referrer = pickWeighted(REFERRERS, (r) => r.weight).url;

  for (let step = 0; step < 8; step++) {
    const layout = layoutFor(page, device.vw);
    const url = pageUrl(page);
    const base = {
      session_id: sessionId,
      page_url: url,
      viewport_width: layout.vw,
      viewport_height: layout.vh,
      page_width: layout.pw,
      page_height: layout.ph,
    };

    events.push({ ...base, event_type: 'page_view', timestamp: new Date(t), ...(referrer ? { referrer } : {}) });

    // Browsing clicks that stay on the page (options, images, dead clicks…).
    const stayClicks = layout.spots.filter((s) => s[6] === null);
    const clickCount = Math.floor(Math.pow(random(), 1.4) * 5);
    for (let i = 0; i < clickCount; i++) {
      t += between(1.5, 14) * 1000;
      events.push({ ...base, event_type: 'click', timestamp: new Date(t), ...clickIn(pickWeighted(stayClicks, (s) => s[5])) });
    }

    // Leave, or click something that navigates.
    if (!chance(CONTINUE_PROBABILITY[page])) break;
    const navSpots = layout.spots.filter((s) => s[6] !== null);
    const nav = pickWeighted(navSpots, (s) => s[5]);
    t += between(2, 12) * 1000;
    events.push({ ...base, event_type: 'click', timestamp: new Date(t), ...clickIn(nav) });

    if (nav[6] === 'done') break; // order placed: the checkout shows its confirmation in place
    referrer = url;
    page = nav[6]!;
    t += between(300, 1500);
  }

  return { events, userAgent };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await connectDB(config.mongoUri);

  const removed = await Event.deleteMany({ session_id: { $regex: `^${SEED_PREFIX}` } });
  console.log(`[seed] removed ${removed.deletedCount} existing sample events`);

  if (args.clear) return;

  const now = Date.now();
  const docs = [];
  for (let i = 0; i < SESSION_COUNT; i++) {
    const { events, userAgent } = simulateSession(now);
    // Same validation and normalization as the ingest API.
    docs.push(...events.map((e) => toDocument(incomingEventSchema.parse(e), userAgent)));
  }

  await Event.insertMany(docs, { ordered: false });

  const clicks = docs.filter((d) => d.event_type === 'click').length;
  console.log(
    `[seed] inserted ${SESSION_COUNT} sample sessions: ${docs.length} events ` +
      `(${docs.length - clicks} page views, ${clicks} clicks) over the last ${DAYS} days`,
  );
  console.log(`[seed] demo pages: ${BASE_URL}/demo/`);
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await disconnectDB();
  });
