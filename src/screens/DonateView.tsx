import type { Route, Store } from "../App";
import { PhotoImg } from "../components/PhotoImg";

export function DonateView({
  store,
  navigate,
}: {
  store: Store;
  navigate: (r: Route) => void;
}) {
  const items = store.items.filter((i) => i.disposition === "donate");
  const doneCount = items.filter((i) => i.done).length;

  function roomName(roomId: string): string {
    return store.rooms.find((r) => r.id === roomId)?.name ?? "";
  }

  function openMaps() {
    const fallback = () =>
      window.open(
        "https://www.google.com/maps/search/donation+centers+near+me",
        "_blank",
      );
    if (!navigator.geolocation) return fallback();
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        window.open(
          `https://www.google.com/maps/search/donation+centers/@${pos.coords.latitude},${pos.coords.longitude},13z`,
          "_blank",
        ),
      fallback,
      { timeout: 5000 },
    );
  }

  return (
    <main className="screen">
      <div className="screen-header">
        <h2>🤲 Donate</h2>
      </div>
      <div className="print-header">
        <h2>SettleIn — Donation Checklist ({items.length} items)</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🤲
          </span>
          Items you mark <strong>Donate</strong> will gather here as a ready-made
          checklist.
        </div>
      ) : (
        <>
          <p className="muted small" style={{ margin: 0 }}>
            {doneCount} of {items.length} packed or dropped off. Tap an item to
            check it off.
          </p>

          {items.map((item) => (
            <button
              key={item.id}
              className={`card checkbox-row no-print-interactive ${item.done ? "done" : ""}`}
              onClick={() => store.updateItem(item.id, { done: !item.done })}
              aria-pressed={item.done ?? false}
            >
              <span className={`check-circle ${item.done ? "checked" : ""}`}>
                {item.done ? "✓" : ""}
              </span>
              <PhotoImg blob={item.photo} alt="" className="item-thumb" />
              <span className="item-body">
                <span className="item-name">{item.name}</span>
                <br />
                <span className="item-sub">
                  {item.category} · {roomName(item.roomId)}
                </span>
              </span>
            </button>
          ))}

          <h2 className="section-title no-print">Where to take it</h2>
          <div className="card no-print">
            <button className="btn btn-primary" onClick={openMaps}>
              📍 Find donation centers near me
            </button>
            <div className="link-list" style={{ marginTop: 8 }}>
              <a href="https://satruck.org" target="_blank" rel="noreferrer">
                🚚 Salvation Army — schedule a free home pickup
              </a>
              <a
                href="https://www.habitat.org/restores"
                target="_blank"
                rel="noreferrer"
              >
                🛋️ Habitat ReStore — furniture &amp; large item pickup
              </a>
              <a
                href="https://www.goodwill.org/locator/"
                target="_blank"
                rel="noreferrer"
              >
                🏪 Goodwill — find a drop-off location
              </a>
            </div>
          </div>

          <button className="btn btn-secondary no-print" onClick={() => window.print()}>
            🖨️ Print Checklist
          </button>
        </>
      )}
      {items.length === 0 && (
        <button
          className="btn btn-primary no-print"
          onClick={() => navigate({ screen: "home" })}
        >
          Go sort some items
        </button>
      )}
    </main>
  );
}
