import { useEffect, useState } from "react";
import type { Store } from "../App";
import type { Item } from "../types";
import { PhotoImg } from "../components/PhotoImg";
import {
  claimRemote,
  claimsConfigured,
  deleteSharedBoard,
  fetchBoard,
  getStoredBoard,
  shareBoard as shareBoardRemote,
  unclaimRemote,
} from "../claims";

export function GiftView({
  store,
  showToast,
}: {
  store: Store;
  showToast: (m: string) => void;
}) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");
  const [sharing, setSharing] = useState(false);
  const [board, setBoard] = useState(getStoredBoard("gift"));

  const items = store.items.filter((i) => i.disposition === "gift");
  const claimed = items.filter((i) => i.claimedBy);

  async function stopSharing() {
    await deleteSharedBoard("gift");
    setBoard(null);
    showToast("Sharing is off — the family link no longer works.");
  }

  // Pull family claims from the shared board whenever this screen opens.
  useEffect(() => {
    if (!claimsConfigured() || !board) return;
    let cancelled = false;
    fetchBoard(board.id)
      .then(async (remote) => {
        if (!remote || cancelled) return;
        for (const bi of remote.items) {
          const local = store.items.find((i) => i.id === bi.id);
          if (!local) continue;
          const claimedByChanged = bi.claimedBy && local.claimedBy !== bi.claimedBy;
          const claimNoteChanged = bi.claimNote !== (local.claimNote ?? null);
          if (claimedByChanged || (bi.claimedBy && claimNoteChanged)) {
            await store.updateItem(local.id, {
              claimedBy: bi.claimedBy ?? undefined,
              claimNote: bi.claimNote ?? undefined,
            });
          }
        }
      })
      .catch(() => {
        /* offline — local state is still authoritative for this device */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function roomName(roomId: string): string {
    return store.rooms.find((r) => r.id === roomId)?.name ?? "";
  }

  async function claimLocal(item: Item, name: string) {
    await store.updateItem(item.id, { claimedBy: name });
    showToast(`${item.name} claimed by ${name} 🎉`);
    if (claimsConfigured() && board) {
      claimRemote(board.id, item.id, name, board.token).catch(() => {});
    }
  }

  async function unclaimLocal(item: Item) {
    await store.updateItem(item.id, { claimedBy: undefined });
    if (claimsConfigured() && board) {
      unclaimRemote(board.id, item.id, board.token).catch(() => {});
    }
  }

  async function shareBoard() {
    const intro =
      "Pick what you'd like from my gift pile 🎁 Tap the link, then tap Claim on anything you'd like:";

    if (claimsConfigured()) {
      setSharing(true);
      try {
        const url = await shareBoardRemote(items, "gift");
        setBoard(getStoredBoard("gift"));
        if (navigator.share) {
          try {
            await navigator.share({
              title: "SettleIn — Family Claim Board",
              text: intro,
              url,
            });
            return;
          } catch {
            /* user cancelled the share sheet — fall through to clipboard */
          }
        }
        await navigator.clipboard.writeText(`${intro}\n${url}`);
        showToast("Link copied — paste it into a text or email");
        return;
      } catch {
        showToast("Couldn't reach the sharing service — sending a text list instead.");
      } finally {
        setSharing(false);
      }
    }

    // Fallback: plain text list (also used when no worker is configured).
    const lines = items.map(
      (i) =>
        `• ${i.name}${i.claimedBy ? ` — claimed by ${i.claimedBy}` : " — available"}`,
    );
    const text = `Family Claim Board from SettleIn 🎁\n\nThese pieces are looking for a new home with family. Let me know what you'd like!\n\n${lines.join("\n")}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "SettleIn — Family Claim Board", text });
        return;
      } catch {
        /* user cancelled — fall through to clipboard */
      }
    }
    await navigator.clipboard.writeText(text);
    showToast("Claim list copied — paste it into a text or email");
  }

  return (
    <main className="screen">
      <div className="screen-header">
        <h2>🎁 Family Claim Board</h2>
      </div>
      <div className="print-header">
        <h2>SettleIn — Family Packing List ({claimed.length} claimed)</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🎁
          </span>
          Items you mark <strong>Gift</strong> appear here, where family members
          can claim them.
        </div>
      ) : (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {claimed.length} of {items.length} claimed.{" "}
            {board
              ? "Family claims from the shared link appear here automatically."
              : "Hand the phone to a family member, or share the link below."}
          </p>

          {items.map((item) => (
            <div key={item.id} className="card item-card" style={{ flexWrap: "wrap" }}>
              <PhotoImg blob={item.photo} alt={item.name} className="item-thumb" tappable />
              <div className="item-body">
                <div className="item-name">{item.name}</div>
                <div className="item-sub">
                  {item.category} · {roomName(item.roomId)}
                </div>
                {item.note && <div className="item-sub">📝 {item.note}</div>}
                {item.claimedBy ? (
                  <>
                    <span className="badge badge-gift">
                      Claimed by {item.claimedBy}
                    </span>
                    {item.claimNote && (
                      <div className="item-sub" style={{ marginTop: 4 }}>
                        💬 {item.claimNote}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="badge badge-keep">Available</span>
                )}
              </div>
              {item.claimedBy ? (
                <button
                  className="no-print"
                  aria-label={`Unclaim ${item.name}`}
                  onClick={() => unclaimLocal(item)}
                >
                  ↩︎
                </button>
              ) : (
                <div className="no-print" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <button
                    className="btn btn-secondary"
                    style={{ width: "auto", padding: "8px 18px" }}
                    onClick={() => {
                      setClaiming(item.id);
                      setClaimName("");
                    }}
                  >
                    Claim
                  </button>
                  <button
                    className="btn-quiet"
                    style={{ fontSize: "0.85rem" }}
                    onClick={async () => {
                      await store.updateItem(item.id, { disposition: "donate" });
                      showToast(`${item.name} moved to Donate`);
                    }}
                  >
                    → Donate instead
                  </button>
                </div>
              )}
              {claiming === item.id && (
                <div style={{ width: "100%" }} className="no-print">
                  <label className="field-label" htmlFor={`claim-${item.id}`}>
                    Who is claiming this?
                  </label>
                  <input
                    id={`claim-${item.id}`}
                    className="text-input"
                    placeholder="e.g. Sarah"
                    value={claimName}
                    onChange={(e) => setClaimName(e.target.value)}
                    autoFocus
                  />
                  <div className="btn-row" style={{ marginTop: 10 }}>
                    <button className="btn btn-secondary" onClick={() => setClaiming(null)}>
                      Cancel
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={!claimName.trim()}
                      onClick={async () => {
                        await claimLocal(item, claimName.trim());
                        setClaiming(null);
                      }}
                    >
                      Claim it
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            className="btn btn-primary no-print"
            onClick={shareBoard}
            disabled={sharing}
          >
            {sharing
              ? "Preparing the link…"
              : board
                ? "💬 Share / update family link"
                : "💬 Share with family"}
          </button>
          {claimed.length > 0 && (
            <button
              className="btn btn-secondary no-print"
              onClick={() => window.print()}
            >
              🖨️ Print Family Packing List
            </button>
          )}
          {board && (
            <button
              className="btn-quiet no-print"
              style={{ color: "var(--gift)" }}
              onClick={stopSharing}
            >
              Stop sharing — turn the family link off
            </button>
          )}
        </>
      )}
    </main>
  );
}
