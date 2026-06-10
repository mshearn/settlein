# SettleIn — Your Moving Companion

A gentle, room-by-room helper for seniors downsizing into a retirement
community. Photograph each item, decide **Keep / Donate / Gift / Sell**, and
let the app turn those decisions into actionable lists. Built from the
Senior Downsizing Web App PRD, using the "simplified" UI mock.

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
- **Photo capture** — opens the device camera via the file-input capture API;
  photos are downscaled and stored locally in IndexedDB.
- **Automatic identification** — optionally set an Anthropic API key in
  Settings and each photo gets a suggested name, category, and a
  marketplace-ready description (Claude vision + structured output). Without
  a key everything works manually.
- **Voice notes** — Web Speech API; use the transcript as the item name or
  attach it as a note. Falls back to typing.
- **Decision support** — "Not sure? Help me decide" asks the PRD's two
  reflective questions and suggests a path (including the
  photograph-the-memory-and-gift-the-item suggestion).
- **Donate** — checklist of donate items, donation-center map search,
  home-pickup links, printable checklist.
- **Gift** — Family Claim Board: family members claim items (in person or via
  the shared list through SMS/email), printable family packing list.
- **Sell** — asking prices, one-tap copy of photo + description for
  marketplace listings, Garage Sale Mode with a cash tracker, printable
  price tags.
- **Print/Export** — every list has a print button (use "Save as PDF" in the
  print dialog to export).

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
- The Family Claim Board is currently device-local (hand the phone over, or
  share the text list). A real-time shared web link would need a small
  backend — the natural next step.
