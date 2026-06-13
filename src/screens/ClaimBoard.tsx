import { useEffect, useState } from "react";
import {
  claimRemote,
  fetchBoard,
  type BoardItem,
  type BoardKind,
} from "../claims";

/**
 * The public page reached via the shared #board/<id> link. Gift boards let
 * family members claim items; donate boards are a review-only list with
 * photos for a charity to look over.
 */
export function ClaimBoard({ boardId }: { boardId: string }) {
  const [items, setItems] = useState<BoardItem[] | null>(null);
  const [kind, setKind] = useState<BoardKind>("gift");
  const [failed, setFailed] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimName, setClaimName] = useState(
    localStorage.getItem("settlein-claim-name") ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard(boardId).then(
      (board) => {
        if (!board) return setFailed(true);
        setKind(board.kind ?? "gift");
        setItems(board.items);
      },
      () => setFailed(true),
    );
  }, [boardId]);

  async function claim(item: BoardItem) {
    const name = claimName.trim();
    if (!name) return;
    localStorage.setItem("settlein-claim-name", name);
    try {
      const result = await claimRemote(boardId, item.id, name);
      setItems(
        (prev) =>
          prev?.map((i) =>
            i.id === item.id ? { ...i, claimedBy: result.claimedBy } : i,
          ) ?? null,
      );
      setMessage(
        result.ok
          ? `${item.name} is yours, ${name}! 🎉`
          : `Oops — ${result.claimedBy} claimed that one first.`,
      );
    } catch {
      setMessage("Couldn't reach the board — please try again.");
    }
    setClaiming(null);
    setTimeout(() => setMessage(null), 4000);
  }

  if (failed) {
    return (
      <main className="screen">
        <div className="brand">
          <h1>SettleIn</h1>
          <p>Shared List</p>
        </div>
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🔗
          </span>
          This link isn't working — it may have expired. Ask the person who
          sent it to share a fresh one from their SettleIn app.
        </div>
      </main>
    );
  }

  if (!items) {
    return (
      <main className="screen" aria-busy="true">
        <div className="brand">
          <h1>SettleIn</h1>
          <p>Loading the shared list…</p>
        </div>
      </main>
    );
  }

  const available = items.filter((i) => !i.claimedBy).length;

  return (
    <main className="screen" style={{ paddingBottom: 24 }}>
      <div className="brand">
        <h1>SettleIn</h1>
        <p>{kind === "donate" ? "Donation List" : "Family Claim Board"}</p>
      </div>

      <section className="card hero-card">
        <div className="hero-star" aria-hidden="true">
          {kind === "donate" ? "🤲" : "🎁"}
        </div>
        {kind === "donate" ? (
          <>
            <h2>We'd like to donate these items</h2>
            <p className="hero-sub">
              {items.length} {items.length === 1 ? "item" : "items"} with
              photos and details below, for your review.
            </p>
          </>
        ) : (
          <>
            <h2>These pieces are looking for a new home</h2>
            <p className="hero-sub">
              {available === 0
                ? "Everything has been claimed!"
                : `${available} of ${items.length} still available — tap Claim on anything you'd like.`}
            </p>
          </>
        )}
      </section>

      {items.map((item) => (
        <div key={item.id} className="card item-card" style={{ flexWrap: "wrap" }}>
          {item.photo ? (
            <img src={item.photo} alt={item.name} className="item-thumb" />
          ) : (
            <span className="item-thumb" aria-hidden="true">
              📦
            </span>
          )}
          <div className="item-body">
            <div className="item-name">{item.name}</div>
            <div className="item-sub">{item.category}</div>
            {item.note && <div className="item-sub">📝 {item.note}</div>}
            {kind !== "donate" &&
              (item.claimedBy ? (
                <span className="badge badge-gift">
                  Claimed by {item.claimedBy}
                </span>
              ) : (
                <span className="badge badge-keep">Available</span>
              ))}
          </div>
          {kind !== "donate" && !item.claimedBy && (
            <button
              className="btn btn-secondary"
              style={{ width: "auto", padding: "8px 18px" }}
              onClick={() => setClaiming(claiming === item.id ? null : item.id)}
            >
              Claim
            </button>
          )}
          {claiming === item.id && (
            <div style={{ width: "100%" }}>
              <label className="field-label" htmlFor={`name-${item.id}`}>
                Your name
              </label>
              <input
                id={`name-${item.id}`}
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
                  onClick={() => claim(item)}
                >
                  Claim it
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <p className="muted small" style={{ textAlign: "center" }}>
        Made with SettleIn — a gentle downsizing companion.
      </p>

      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </main>
  );
}
