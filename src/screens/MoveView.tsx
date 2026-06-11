import type { Store } from "../App";
import { PhotoImg } from "../components/PhotoImg";

/**
 * Move Now — the first-load inventory for staged moves. Deliberately has no
 * action buttons: it's a calm, printable list of the essentials making the
 * first trip to the new home. Changing an item's pile happens in its room.
 */
export function MoveView({ store }: { store: Store }) {
  const items = store.items.filter((i) => i.disposition === "move");
  const rooms = store.rooms.filter((r) => items.some((i) => i.roomId === r.id));

  return (
    <main className="screen">
      <div className="screen-header">
        <h2>🚚 Move Now</h2>
      </div>
      <div className="print-header">
        <h2>SettleIn — First Load Inventory ({items.length} items)</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🚚
          </span>
          Items you mark <strong>Move Now</strong> appear here — the essentials
          making the first trip to your new home.
        </div>
      ) : (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {items.length} {items.length === 1 ? "item" : "items"} going in the
            first load. Nothing to decide here — this is your inventory for
            moving day.
          </p>

          {rooms.map((room) => (
            <section key={room.id} aria-label={room.name}>
              <h2 className="section-title">
                {room.emoji} {room.name}
              </h2>
              {items
                .filter((i) => i.roomId === room.id)
                .map((item) => (
                  <div key={item.id} className="card item-card">
                    <PhotoImg
                      blob={item.photo}
                      alt={item.name}
                      className="item-thumb"
                    />
                    <div className="item-body">
                      <div className="item-name">{item.name}</div>
                      <div className="item-sub">{item.category}</div>
                      {item.note && <div className="item-sub">📝 {item.note}</div>}
                    </div>
                  </div>
                ))}
            </section>
          ))}

          <button
            className="btn btn-secondary no-print"
            onClick={() => window.print()}
          >
            🖨️ Print First-Load Inventory
          </button>
          <p className="muted small no-print" style={{ margin: 0 }}>
            Changed your mind about an item? Open its room and use the ⋯ menu.
          </p>
        </>
      )}
    </main>
  );
}
