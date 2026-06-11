# SettleIn — Your Moving Companion

A gentle, room-by-room helper for seniors downsizing into a retirement
community. Photograph each item, decide **Keep / Donate / Gift / Sell**, and
let the app turn those decisions into actionable lists — with a **Move Now**
pile for staged moves where both homes overlap. Built from the Senior
Downsizing Web App PRD, using the "simplified" UI mock.

## Running it

```bash
npm install
npm run dev        # local development
npm run build      # production build (PWA) in dist/
npm run preview    # serve the production build
```

It's a Progressive Web App: open it on a phone or tablet, choose
"Add to Home Screen", and it runs fullscreen like a native app — including
offline (service worker caches the app shell; all data lives on-device).

## Features

- **Room-by-room inventory** — dashboard with progress card and room list.
- **Staged moves ("Move Now")** — for families who'll have both homes for a
  while (e.g. the new place is ready before the old house sells). A fifth
  pile, **Move Now**, collects the essentials making the first trip; its tab
  is a deliberately button-free, printable first-load inventory grouped by
  room. **Keep** becomes the holding pile — things staying at the house until
  it sells. On by default; Settings → "Moving in stages" turns it off for a
  simpler single-move experience (existing Move Now items stay visible).
- **Photo capture** — opens the device camera via the file-input capture API;
  photos are downscaled and stored locally in IndexedDB.
- **Automatic identification** — free and on-device by default: a
  Transformers.js image classifier (ViT, ~25MB, downloaded once and cached)
  suggests a name and category for each photo with no account or per-use
  cost, and works offline after the first use. Optionally set an Anthropic
  API key in Settings for richer names plus marketplace-ready descriptions
  (Claude vision + structured output). If both are unavailable, manual
  naming takes over.
- **Voice notes** — Web Speech API; use the transcript as the item name or
  attach it as a note. Falls back to typing.
- **Decision support** — "Not sure? Help me decide" asks the PRD's two
  reflective questions and suggests a path (including the
  photograph-the-memory-and-gift-the-item suggestion).
- **Donate** — checklist of donate items, donation-center map search,
  home-pickup links, printable checklist.
- **Gift** — Family Claim Board: "Share with family" creates a private web
  link (sent via SMS/email) where family members see item photos and tap
  Claim; claims sync back to the senior's app automatically. In-person
  claiming and a printable family packing list also work.
- **Sell** — asking prices, one-tap copy of photo + description for
  marketplace listings, Garage Sale Mode with a cash tracker, printable
  price tags.
- **Print/Export** — every list has a print button (use "Save as PDF" in the
  print dialog to export).
- **Undo & cleanup** — remove an item (⋯ menu), remove a room (with its
  items, confirmed first), duplicate room names are caught and redirected to
  the existing room, "Stop sharing" revokes the family link, and Settings →
  "Erase everything" resets the device (and revokes the link) for a fresh
  start.

## Accessibility

18px minimum font size, 48×48px minimum tap targets, single-column
one-task-at-a-time layouts, WCAG-AA color contrast on the cream/green
palette.

## Architecture notes

- Vite + React + TypeScript; `vite-plugin-pwa` for the manifest and service
  worker.
- All data (rooms, items, photos) is local-first in IndexedDB (`idb`). The
  only network call is the optional photo-identification request to the
  Anthropic API (`claude-opus-4-8`, key stored in localStorage).
- The Family Claim Board's shared link is backed by a small Cloudflare
  Worker + KV (`worker/`, deployed at
  `https://settlein-claims.mshearn.workers.dev`). Boards use unguessable
  128-bit IDs, mutations require an owner token held only by the sharing
  device, photos are downscaled before upload, and boards expire 90 days
  after the last activity. Claims may take up to a minute to propagate (KV
  edge caching). Deploy updates with `cd worker && npx wrangler deploy`.

## Future extensions (considered, not yet built)

- **Family-funded proxy**: a tiny Cloudflare Worker (free tier) holding one
  family member's Anthropic API key server-side. Everyone's app would call
  the worker, so seniors get full-quality identification with zero setup and
  no key handling; the family member pays a few dollars total. Would slot in
  as a third branch in `src/ai.ts` (`identifyItem`).
- **Gemini free tier**: swap/add Google's Gemini API (free tier, no credit
  card) as the cloud identifier for families who'd rather not pay at all but
  are okay creating a Google AI Studio key and pasting it into Settings.
