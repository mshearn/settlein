import { useState } from "react";
import type { Route, Store } from "../App";
import { ROOM_SUGGESTIONS } from "../types";
import { InstallHint } from "../components/InstallHint";

function roomStatus(count: number): string {
  if (count === 0) return "Not started";
  if (count < 5) return "Just started";
  return "In progress";
}

export function Dashboard({
  store,
  navigate,
  showToast,
}: {
  store: Store;
  navigate: (r: Route) => void;
  showToast: (m: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [customName, setCustomName] = useState("");

  const totalItems = store.items.length;
  const roomsStarted = store.rooms.filter((r) =>
    store.items.some((i) => i.roomId === r.id),
  ).length;

  const usedNames = new Set(store.rooms.map((r) => r.name));
  const suggestions = ROOM_SUGGESTIONS.filter((s) => !usedNames.has(s.name));

  async function addRoom(name: string, emoji: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = store.rooms.find(
      (r) => r.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) {
      showToast(`You already have a "${existing.name}" room — opening it.`);
      setAdding(false);
      setCustomName("");
      navigate({ screen: "room", roomId: existing.id });
      return;
    }
    const room = await store.addRoom(trimmed, emoji);
    setAdding(false);
    setCustomName("");
    navigate({ screen: "room", roomId: room.id });
  }

  return (
    <main className="screen">
      <div className="brand">
        <h1>SettleIn</h1>
        <p>Your moving companion</p>
        <button
          className="btn-quiet no-print"
          style={{ marginTop: 4 }}
          onClick={() => navigate({ screen: "settings" })}
        >
          Settings
        </button>
      </div>

      <section className="card hero-card" aria-label="Your progress">
        <div className="hero-star" aria-hidden="true">
          ⭐
        </div>
        {totalItems === 0 ? (
          <>
            <h2>Welcome!</h2>
            <p className="hero-sub">
              Let's take this one room — and one item — at a time.
            </p>
          </>
        ) : (
          <>
            <h2>
              You've sorted {totalItems} {totalItems === 1 ? "item" : "items"}
            </h2>
            <p className="hero-sub">
              Across {roomsStarted} {roomsStarted === 1 ? "room" : "rooms"}.
              Keep it up!
            </p>
          </>
        )}
      </section>

      <InstallHint />

      <h2 className="section-title">Your Rooms</h2>

      {store.rooms.length === 0 && !adding && (
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🏡
          </span>
          Add your first room below to begin.
        </div>
      )}

      {store.rooms.map((room) => {
        const count = store.items.filter((i) => i.roomId === room.id).length;
        return (
          <button
            key={room.id}
            className="room-card"
            onClick={() => navigate({ screen: "room", roomId: room.id })}
          >
            <span className="room-emoji" aria-hidden="true">
              {room.emoji}
            </span>
            <span>
              <span className="room-name">{room.name}</span>
              <br />
              <span className="room-status">{roomStatus(count)}</span>
            </span>
            <span className="room-count">
              <strong>{count}</strong>
              items
            </span>
            <span className="chevron" aria-hidden="true">
              ›
            </span>
          </button>
        );
      })}

      {adding ? (
        <section className="card" aria-label="Add a new room">
          <label className="field-label" htmlFor="room-name">
            Which room is it?
          </label>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 12,
            }}
          >
            {suggestions.slice(0, 6).map((s) => (
              <button
                key={s.name}
                className="btn btn-secondary"
                style={{ width: "auto", padding: "8px 16px" }}
                onClick={() => addRoom(s.name, s.emoji)}
              >
                {s.emoji} {s.name}
              </button>
            ))}
          </div>
          <input
            id="room-name"
            className="text-input"
            placeholder="Or type a room name…"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addRoom(customName, "🚪");
            }}
          />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => addRoom(customName, "🚪")}
              disabled={!customName.trim()}
            >
              Add Room
            </button>
          </div>
        </section>
      ) : (
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          + Add New Room
        </button>
      )}
    </main>
  );
}
