import { useState } from "react";
import type { Store } from "../App";
import { PhotoImg } from "../components/PhotoImg";

export function GiftView({
  store,
  showToast,
}: {
  store: Store;
  showToast: (m: string) => void;
}) {
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimName, setClaimName] = useState("");

  const items = store.items.filter((i) => i.disposition === "gift");
  const claimed = items.filter((i) => i.claimedBy);

  function roomName(roomId: string): string {
    return store.rooms.find((r) => r.id === roomId)?.name ?? "";
  }

  async function shareBoard() {
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
            {claimed.length} of {items.length} claimed. Hand the phone to a family
            member, or share the list.
          </p>

          {items.map((item) => (
            <div key={item.id} className="card item-card" style={{ flexWrap: "wrap" }}>
              <PhotoImg blob={item.photo} alt={item.name} className="item-thumb" />
              <div className="item-body">
                <div className="item-name">{item.name}</div>
                <div className="item-sub">
                  {item.category} · {roomName(item.roomId)}
                </div>
                {item.note && <div className="item-sub">📝 {item.note}</div>}
                {item.claimedBy ? (
                  <span className="badge badge-gift">
                    Claimed by {item.claimedBy}
                  </span>
                ) : (
                  <span className="badge badge-keep">Available</span>
                )}
              </div>
              {item.claimedBy ? (
                <button
                  className="no-print"
                  aria-label={`Unclaim ${item.name}`}
                  onClick={() => store.updateItem(item.id, { claimedBy: undefined })}
                >
                  ↩︎
                </button>
              ) : (
                <button
                  className="btn btn-secondary no-print"
                  style={{ width: "auto", padding: "8px 18px" }}
                  onClick={() => {
                    setClaiming(item.id);
                    setClaimName("");
                  }}
                >
                  Claim
                </button>
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
                        await store.updateItem(item.id, {
                          claimedBy: claimName.trim(),
                        });
                        setClaiming(null);
                        showToast(`${item.name} claimed by ${claimName.trim()} 🎉`);
                      }}
                    >
                      Claim it
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          <button className="btn btn-primary no-print" onClick={shareBoard}>
            💬 Share with family
          </button>
          {claimed.length > 0 && (
            <button
              className="btn btn-secondary no-print"
              onClick={() => window.print()}
            >
              🖨️ Print Family Packing List
            </button>
          )}
        </>
      )}
    </main>
  );
}
