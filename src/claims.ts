/**
 * Client for the SettleIn claim-board Worker (worker/src/index.js).
 * The senior's device owns the board (id + token in localStorage); family
 * members only ever see the public board link.
 */
import type { Item } from "./types";
import { downscalePhoto } from "./photo";

/** The deployed worker/ API — empty string disables remote sharing. */
export const CLAIMS_API = "https://settlein-claims.mshearn.workers.dev";

export interface BoardItem {
  id: string;
  name: string;
  category: string;
  note: string;
  claimedBy: string | null;
  photo: string | null; // data URL
}

export interface StoredBoard {
  id: string;
  token: string;
}

/** "gift" = family claim board; "donate" = review-only list for a charity. */
export type BoardKind = "gift" | "donate";

// "settlein-board" predates donate boards — kept for existing gift shares.
const BOARD_KEYS: Record<BoardKind, string> = {
  gift: "settlein-board",
  donate: "settlein-donate-board",
};

export function claimsConfigured(): boolean {
  return CLAIMS_API.length > 0;
}

export function getStoredBoard(kind: BoardKind): StoredBoard | null {
  try {
    const raw = localStorage.getItem(BOARD_KEYS[kind]);
    return raw ? (JSON.parse(raw) as StoredBoard) : null;
  } catch {
    return null;
  }
}

export function boardUrl(id: string): string {
  return `${location.origin}${import.meta.env.BASE_URL}#board/${id}`;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function toBoardItems(items: Item[]): Promise<BoardItem[]> {
  return Promise.all(
    items.map(async (i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      note: i.note,
      claimedBy: i.claimedBy ?? null,
      photo: i.photo
        ? await blobToDataUrl(await downscalePhoto(i.photo, 640, 0.7))
        : null,
    })),
  );
}

/**
 * Create the shared board of the given kind, or update it if one already
 * exists. Returns the public link to send to family (gift) or a charity
 * (donate).
 */
export async function shareBoard(
  items: Item[],
  kind: BoardKind,
): Promise<string> {
  const boardItems = await toBoardItems(items);
  const stored = getStoredBoard(kind);

  if (stored) {
    const res = await fetch(`${CLAIMS_API}/board/${stored.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Owner-Token": stored.token,
      },
      body: JSON.stringify({ items: boardItems }),
    });
    if (res.ok) return boardUrl(stored.id);
    if (res.status !== 404 && res.status !== 403) {
      throw new Error("update failed");
    }
    // Board expired or token mismatch — fall through and create a new one.
  }

  const res = await fetch(`${CLAIMS_API}/board`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: boardItems, kind }),
  });
  if (!res.ok) throw new Error("create failed");
  const { id, token } = (await res.json()) as { id: string; token: string };
  localStorage.setItem(BOARD_KEYS[kind], JSON.stringify({ id, token }));
  return boardUrl(id);
}

export async function fetchBoard(
  id: string,
): Promise<{ items: BoardItem[]; updatedAt: number; kind?: BoardKind } | null> {
  const res = await fetch(`${CLAIMS_API}/board/${id}`);
  if (!res.ok) return null;
  return res.json();
}

/** Returns the final claimant: the given name, or whoever beat them to it. */
export async function claimRemote(
  boardId: string,
  itemId: string,
  name: string,
  ownerToken?: string,
): Promise<{ ok: boolean; claimedBy: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ownerToken) headers["X-Owner-Token"] = ownerToken;
  const res = await fetch(`${CLAIMS_API}/board/${boardId}/claim`, {
    method: "POST",
    headers,
    body: JSON.stringify({ itemId, name }),
  });
  const data = (await res.json()) as { claimedBy: string };
  if (res.status === 409) return { ok: false, claimedBy: data.claimedBy };
  if (!res.ok) throw new Error("claim failed");
  return { ok: true, claimedBy: data.claimedBy };
}

/**
 * Revoke a shared link: delete the remote board and forget it locally.
 * Safe to call when nothing is shared. The local copy is removed even if
 * the server is unreachable — the board still expires on its own.
 */
export async function deleteSharedBoard(kind: BoardKind): Promise<void> {
  const stored = getStoredBoard(kind);
  if (!stored) return;
  try {
    if (claimsConfigured()) {
      await fetch(`${CLAIMS_API}/board/${stored.id}`, {
        method: "DELETE",
        headers: { "X-Owner-Token": stored.token },
      });
    }
  } finally {
    localStorage.removeItem(BOARD_KEYS[kind]);
  }
}

/** Revoke every shared link this device owns (used by "Erase everything"). */
export async function deleteAllSharedBoards(): Promise<void> {
  await Promise.all([deleteSharedBoard("gift"), deleteSharedBoard("donate")]);
}

export async function unclaimRemote(
  boardId: string,
  itemId: string,
  ownerToken: string,
): Promise<void> {
  await fetch(`${CLAIMS_API}/board/${boardId}/unclaim`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Owner-Token": ownerToken,
    },
    body: JSON.stringify({ itemId }),
  });
}
