import { useState } from "react";
import type { Route } from "../App";
import { getApiKey, setApiKey } from "../ai";
import { clearAllData } from "../db";
import { deleteAllSharedBoards, getStoredBoard } from "../claims";
import { setStagedMove, stagedMoveEnabled } from "../prefs";

export function Settings({
  navigate,
  showToast,
}: {
  navigate: (r: Route) => void;
  showToast: (m: string) => void;
}) {
  const [key, setKey] = useState(getApiKey());
  const [staged, setStaged] = useState(stagedMoveEnabled());
  const [confirmingErase, setConfirmingErase] = useState(false);
  const [erasing, setErasing] = useState(false);

  async function eraseEverything() {
    setErasing(true);
    // Revoke any shared links first so the photos don't outlive the data.
    await deleteAllSharedBoards();
    await clearAllData();
    // A clean reload is the simplest honest reset of all in-memory state.
    window.location.reload();
  }

  return (
    <main className="screen">
      <div className="screen-header">
        <button aria-label="Back to home" onClick={() => navigate({ screen: "home" })}>
          ← Back
        </button>
        <h2>Settings</h2>
      </div>

      <div className="card">
        <h3 style={{ fontFamily: "inherit", fontSize: "1.1rem" }}>
          Photo identification
        </h3>
        <p className="muted small">
          SettleIn recognizes items automatically, right on this device — free,
          with no account needed. The first photo takes a little longer while
          the recognizer downloads; after that it even works offline.
        </p>
        <p className="muted small">
          Optional upgrade: with an Anthropic API key, photos get richer names
          and ready-to-use selling descriptions instead of simple labels.
        </p>
        <label className="field-label" htmlFor="api-key">
          Anthropic API key (optional)
        </label>
        <input
          id="api-key"
          className="text-input"
          type="password"
          placeholder="sk-ant-…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          autoComplete="off"
        />
        <p className="muted small">
          The key is stored only on this device. A family member can create one
          at console.anthropic.com.
        </p>
        <button
          className="btn btn-primary"
          onClick={() => {
            setApiKey(key);
            showToast(
              key.trim()
                ? "Upgraded photo identification is on"
                : "Key removed — using free on-device recognition",
            );
            navigate({ screen: "home" });
          }}
        >
          Save
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontFamily: "inherit", fontSize: "1.1rem" }}>
          Moving in stages
        </h3>
        <p className="muted small">
          For moves where you'll have both homes for a while: a{" "}
          <strong>Move Now</strong> pile holds the essentials making the first
          trip to the new place, and <strong>Keep</strong> holds everything
          staying at this house until it sells.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => {
            const next = !staged;
            setStagedMove(next);
            setStaged(next);
            showToast(
              next
                ? "Move Now is on — find it in the bottom menu."
                : "Move Now is off — items already in that pile stay visible.",
            );
          }}
        >
          {staged ? "On — tap to turn off" : "Off — tap to turn on"}
        </button>
      </div>

      <div className="card">
        <h3 style={{ fontFamily: "inherit", fontSize: "1.1rem" }}>
          Start over
        </h3>
        <p className="muted small">
          Erase every room, item, and photo from this device
          {getStoredBoard("gift") || getStoredBoard("donate")
            ? ", and turn off any shared links"
            : ""}.
          Useful after testing, or when helping someone else start fresh.
        </p>
        {confirmingErase ? (
          <>
            <p style={{ fontWeight: 700 }}>
              Are you sure? Everything will be gone for good.
            </p>
            <div className="btn-row">
              <button
                className="btn btn-primary"
                onClick={() => setConfirmingErase(false)}
                disabled={erasing}
              >
                Keep my things
              </button>
              <button
                className="btn btn-secondary"
                style={{ borderColor: "var(--gift)", color: "var(--gift)" }}
                onClick={eraseEverything}
                disabled={erasing}
              >
                {erasing ? "Erasing…" : "Yes, erase it all"}
              </button>
            </div>
          </>
        ) : (
          <button
            className="btn btn-secondary"
            style={{ borderColor: "var(--gift)", color: "var(--gift)" }}
            onClick={() => setConfirmingErase(true)}
          >
            Erase everything…
          </button>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontFamily: "inherit", fontSize: "1.1rem" }}>About SettleIn</h3>
        <p className="muted small" style={{ marginBottom: 0 }}>
          All of your rooms, items, and photos live on this device — nothing is
          uploaded anywhere except photos sent for identification when a key is
          set. Add SettleIn to your home screen to use it like a regular app,
          even without an internet connection.
        </p>
      </div>
    </main>
  );
}
