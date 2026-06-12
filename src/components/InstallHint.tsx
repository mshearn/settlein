import { useState } from "react";

// iOS has no install prompt or button for web apps — the only path is the
// Share-sheet's "Add to Home Screen", which people rarely find on their own.
// This card walks iPhone/iPad visitors through it, once.

const DISMISS_KEY = "settlein-install-hint-dismissed";

function isIos(): boolean {
  // iPadOS pretends to be a Mac; the touch points give it away.
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || iPadOs;
}

function isInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isSafari(): boolean {
  // In-app browsers (Gmail, Facebook…) and other iOS browsers can't add to
  // the home screen; they brand the user agent or drop "Safari" from it.
  const ua = navigator.userAgent;
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA|DuckDuckGo/.test(ua);
}

function ShareIcon() {
  return (
    <svg
      width="20"
      height="24"
      viewBox="0 0 22 26"
      aria-label="Share"
      role="img"
      style={{ verticalAlign: "-4px", margin: "0 3px" }}
    >
      <g stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
        <path d="M11 16 L11 2" />
        <path d="M6.5 6 L11 1.5 L15.5 6" strokeLinejoin="round" />
        <path d="M7 10 H2.5 V24.5 H19.5 V10 H15" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function InstallHint() {
  const [dismissed, setDismissed] = useState(
    localStorage.getItem(DISMISS_KEY) === "yes",
  );

  if (dismissed || !isIos() || isInstalled()) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "yes");
    setDismissed(true);
  }

  return (
    <section
      className="card install-hint no-print"
      aria-label="Add SettleIn to your home screen"
    >
      <h3 style={{ fontFamily: "inherit", fontSize: "1.1rem", marginTop: 0 }}>
        📲 Put SettleIn on your home screen
      </h3>
      {isSafari() ? (
        <>
          <ol>
            <li>
              Tap the Share button <ShareIcon /> at the bottom of the screen
              (top-right corner on an iPad)
            </li>
            <li>
              Scroll down the list and tap <strong>Add to Home Screen</strong>
            </li>
            <li>
              Tap <strong>Add</strong>
            </li>
          </ol>
          <p className="small" style={{ margin: "0 0 4px" }}>
            SettleIn then opens like a regular app — even without internet.
          </p>
        </>
      ) : (
        <p className="small" style={{ marginTop: 0 }}>
          Open this page in the <strong>Safari</strong> app, then tap the Share
          button <ShareIcon /> and choose <strong>Add to Home Screen</strong>.
        </p>
      )}
      <button className="btn-quiet" style={{ padding: "4px 0" }} onClick={dismiss}>
        Got it — don't show this again
      </button>
    </section>
  );
}
