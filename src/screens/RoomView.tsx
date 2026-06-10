import { useState } from "react";
import type { Route, Store } from "../App";
import { DISPOSITION_LABELS, type Disposition } from "../types";
import { PhotoImg } from "../components/PhotoImg";

export function RoomView({
  store,
  roomId,
  navigate,
  showToast,
}: {
  store: Store;
  roomId: string;
  navigate: (r: Route) => void;
  showToast: (m: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const room = store.rooms.find((r) => r.id === roomId);
  const items = store.items.filter((i) => i.roomId === roomId);

  if (!room) {
    navigate({ screen: "home" });
    return null;
  }

  return (
    <main className="screen">
      <div className="screen-header no-print">
        <button aria-label="Back to home" onClick={() => navigate({ screen: "home" })}>
          ← Back
        </button>
        <h2>
          {room.emoji} {room.name}
        </h2>
      </div>
      <div className="print-header">
        <h2>
          SettleIn — {room.name} ({items.length} items)
        </h2>
      </div>

      <p className="muted small" style={{ margin: 0 }}>
        {items.length === 0
          ? "No items yet — add your first one below."
          : `${items.length} ${items.length === 1 ? "item" : "items"} tracked`}
      </p>

      {items.map((item) => (
        <div key={item.id} className="card item-card" style={{ flexWrap: "wrap" }}>
          <PhotoImg blob={item.photo} alt={item.name} className="item-thumb" />
          <div className="item-body">
            <div className="item-name">{item.name}</div>
            <div className="item-sub">{item.category}</div>
            <span className={`badge badge-${item.disposition}`}>
              {DISPOSITION_LABELS[item.disposition]}
            </span>
          </div>
          <button
            className="no-print"
            aria-expanded={expanded === item.id}
            aria-label={`Options for ${item.name}`}
            onClick={() => setExpanded(expanded === item.id ? null : item.id)}
          >
            ⋯
          </button>
          {expanded === item.id && (
            <div style={{ width: "100%" }} className="no-print">
              <p className="muted small" style={{ marginTop: 0 }}>
                Move this item to a different pile:
              </p>
              <div className="disposition-grid">
                {(Object.keys(DISPOSITION_LABELS) as Disposition[]).map((d) => (
                  <button
                    key={d}
                    className={`btn-disposition btn-${d}`}
                    style={{ minHeight: 56 }}
                    onClick={async () => {
                      await store.updateItem(item.id, { disposition: d });
                      setExpanded(null);
                      showToast(`Moved to ${DISPOSITION_LABELS[d]}`);
                    }}
                  >
                    {DISPOSITION_LABELS[d]}
                  </button>
                ))}
              </div>
              <button
                className="btn-quiet"
                style={{ marginTop: 10, color: "var(--gift)" }}
                onClick={async () => {
                  await store.removeItem(item.id);
                  setExpanded(null);
                  showToast("Item removed");
                }}
              >
                Remove this item
              </button>
            </div>
          )}
        </div>
      ))}

      <button
        className="btn btn-primary no-print"
        onClick={() => navigate({ screen: "add", roomId })}
      >
        📷 Add New Item
      </button>

      {items.length > 0 && (
        <button className="btn btn-secondary no-print" onClick={() => window.print()}>
          🖨️ Print Room Checklist
        </button>
      )}

      {confirmingRemove ? (
        <div className="card no-print" style={{ textAlign: "center" }}>
          <p style={{ marginTop: 0 }}>
            Remove <strong>{room.name}</strong>
            {items.length > 0 && (
              <>
                {" "}
                and its {items.length} {items.length === 1 ? "item" : "items"}
              </>
            )}
            ? This can't be undone.
          </p>
          <div className="btn-row">
            <button
              className="btn btn-primary"
              onClick={() => setConfirmingRemove(false)}
            >
              Keep room
            </button>
            <button
              className="btn btn-secondary"
              style={{ borderColor: "var(--gift)", color: "var(--gift)" }}
              onClick={async () => {
                await store.removeRoom(roomId);
                showToast(`${room.name} removed`);
                navigate({ screen: "home" });
              }}
            >
              Remove room
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn-quiet no-print"
          style={{ color: "var(--gift)" }}
          onClick={() => setConfirmingRemove(true)}
        >
          Remove this room…
        </button>
      )}
    </main>
  );
}
