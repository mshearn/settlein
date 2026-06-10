/**
 * SettleIn claim-board API — a Cloudflare Worker backed by KV.
 *
 * A "board" is a snapshot of the Gift pile: items with downscaled photos.
 * The senior's device creates/updates a board and keeps an owner token;
 * anyone with the (unguessable) board link can view it and claim items.
 *
 * Routes:
 *   POST /board                 {items}            → {id, token}
 *   GET  /board/:id                                → {items, updatedAt}
 *   PUT  /board/:id             {items}  + token   → {ok}   (claims preserved by caller)
 *   POST /board/:id/claim       {itemId, name}     → {ok, claimedBy} | 409 {claimedBy}
 *   POST /board/:id/unclaim     {itemId} + token   → {ok}
 *   DELETE /board/:id                    + token   → {ok}  (revokes the shared link)
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,X-Owner-Token",
  "Access-Control-Max-Age": "86400",
};

const TTL_SECONDS = 60 * 60 * 24 * 90; // boards expire 90 days after last write
const MAX_ITEMS = 200;
const MAX_PHOTO_CHARS = 400_000; // ~300KB base64 per photo
const MAX_BODY_CHARS = 22_000_000; // stay under the 25MB KV value limit

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function err(status, message) {
  return json({ error: message }, status);
}

function randomHex(bytes) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function cleanString(value, max) {
  return String(value ?? "").slice(0, max);
}

function sanitizeItems(items) {
  if (!Array.isArray(items)) throw new Error("items must be an array");
  return items.slice(0, MAX_ITEMS).map((i) => {
    const photo = typeof i.photo === "string" ? i.photo : null;
    if (photo && (!photo.startsWith("data:image/") || photo.length > MAX_PHOTO_CHARS)) {
      throw new Error("invalid photo");
    }
    return {
      id: cleanString(i.id, 64),
      name: cleanString(i.name, 120),
      category: cleanString(i.category, 40),
      note: cleanString(i.note, 500),
      claimedBy: i.claimedBy ? cleanString(i.claimedBy, 60) : null,
      photo,
    };
  });
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) throw new Error("too large");
  return JSON.parse(text);
}

async function putBoard(env, id, board) {
  await env.BOARDS.put(`board:${id}`, JSON.stringify(board), {
    expirationTtl: TTL_SECONDS,
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const parts = new URL(request.url).pathname.split("/").filter(Boolean);
    if (parts[0] !== "board") return err(404, "not found");

    try {
      // POST /board — create
      if (parts.length === 1 && request.method === "POST") {
        const body = await readBody(request);
        const board = {
          token: randomHex(16),
          items: sanitizeItems(body.items),
          updatedAt: Date.now(),
        };
        const id = randomHex(16);
        await putBoard(env, id, board);
        return json({ id, token: board.token });
      }

      const id = parts[1];
      if (!/^[0-9a-f]{32}$/.test(id ?? "")) return err(404, "board not found");
      const raw = await env.BOARDS.get(`board:${id}`);
      if (!raw) return err(404, "board not found");
      const board = JSON.parse(raw);
      const isOwner = request.headers.get("X-Owner-Token") === board.token;

      // GET /board/:id — public read
      if (parts.length === 2 && request.method === "GET") {
        return json({ items: board.items, updatedAt: board.updatedAt });
      }

      // PUT /board/:id — owner replaces the item list
      if (parts.length === 2 && request.method === "PUT") {
        if (!isOwner) return err(403, "bad token");
        const body = await readBody(request);
        board.items = sanitizeItems(body.items);
        board.updatedAt = Date.now();
        await putBoard(env, id, board);
        return json({ ok: true });
      }

      // DELETE /board/:id — owner revokes the shared link
      if (parts.length === 2 && request.method === "DELETE") {
        if (!isOwner) return err(403, "bad token");
        await env.BOARDS.delete(`board:${id}`);
        return json({ ok: true });
      }

      // POST /board/:id/claim — public, first claim wins (owner may override)
      if (parts[2] === "claim" && request.method === "POST") {
        const body = await readBody(request);
        const item = board.items.find((i) => i.id === body.itemId);
        if (!item) return err(404, "item not found");
        const name = cleanString(body.name, 60).trim();
        if (!name) return err(400, "name required");
        if (item.claimedBy && item.claimedBy !== name && !isOwner) {
          return json({ claimedBy: item.claimedBy }, 409);
        }
        item.claimedBy = name;
        board.updatedAt = Date.now();
        await putBoard(env, id, board);
        return json({ ok: true, claimedBy: name });
      }

      // POST /board/:id/unclaim — owner only
      if (parts[2] === "unclaim" && request.method === "POST") {
        if (!isOwner) return err(403, "bad token");
        const body = await readBody(request);
        const item = board.items.find((i) => i.id === body.itemId);
        if (item) {
          item.claimedBy = null;
          board.updatedAt = Date.now();
          await putBoard(env, id, board);
        }
        return json({ ok: true });
      }

      return err(404, "not found");
    } catch (e) {
      return err(400, e?.message === "too large" ? "payload too large" : "bad request");
    }
  },
};
