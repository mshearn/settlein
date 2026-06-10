import { useState } from "react";
import type { Route } from "../App";
import { getApiKey, setApiKey } from "../ai";

export function Settings({
  navigate,
  showToast,
}: {
  navigate: (r: Route) => void;
  showToast: (m: string) => void;
}) {
  const [key, setKey] = useState(getApiKey());

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
