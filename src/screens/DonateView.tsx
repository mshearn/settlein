import { useState } from "react";
import type { Route, Store } from "../App";
import { PhotoImg } from "../components/PhotoImg";
import {
  claimsConfigured,
  deleteSharedBoard,
  getStoredBoard,
  shareBoard,
} from "../claims";
import { makeItemListPdf, sharePdf } from "../pdf";

export function DonateView({
  store,
  navigate,
  showToast,
}: {
  store: Store;
  navigate: (r: Route) => void;
  showToast: (m: string) => void;
}) {
  const [sharing, setSharing] = useState(false);
  const [makingPdf, setMakingPdf] = useState(false);
  const [board, setBoard] = useState(getStoredBoard("donate"));

  const items = store.items.filter((i) => i.disposition === "donate");
  const doneCount = items.filter((i) => i.done).length;

  function roomName(roomId: string): string {
    return store.rooms.find((r) => r.id === roomId)?.name ?? "";
  }

  async function shareWithCharity() {
    if (!claimsConfigured()) return;
    const intro =
      "We're downsizing and would like to donate these items. Here's a list with photos for your review:";
    setSharing(true);
    try {
      const url = await shareBoard(items, "donate");
      setBoard(getStoredBoard("donate"));
      if (navigator.share) {
        try {
          await navigator.share({
            title: "SettleIn — Donation List",
            text: intro,
            url,
          });
          return;
        } catch {
          /* user cancelled the share sheet — fall through to clipboard */
        }
      }
      await navigator.clipboard.writeText(`${intro}\n${url}`);
      showToast("Link copied — paste it into an email to the charity");
    } catch {
      showToast("Couldn't reach the sharing service — try the PDF instead.");
    } finally {
      setSharing(false);
    }
  }

  async function stopSharing() {
    await deleteSharedBoard("donate");
    setBoard(null);
    showToast("Sharing is off — the donation link no longer works.");
  }

  async function emailPdf() {
    setMakingPdf(true);
    try {
      const blob = await makeItemListPdf(
        "Donation List",
        `${items.length} ${items.length === 1 ? "item" : "items"} offered for donation`,
        items.map((item) => ({
          item,
          sub: `${item.category} · ${roomName(item.roomId)}`,
        })),
      );
      const outcome = await sharePdf(blob, "donation-list.pdf");
      if (outcome === "downloaded") {
        showToast("PDF saved — attach it to an email");
      }
    } catch {
      showToast("Couldn't create the PDF — printing works too.");
    } finally {
      setMakingPdf(false);
    }
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
              <PhotoImg blob={item.photo} alt={item.name} className="item-thumb" tappable />
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

          <h2 className="section-title no-print">Send your list to a charity</h2>
          <div className="card no-print">
            <p className="muted small" style={{ marginTop: 0 }}>
              Many charities like to see what's coming before a pickup. Share
              a private web link with photos, or make a PDF to attach to an
              email — whichever they prefer.
            </p>
            {claimsConfigured() && (
              <button
                className="btn btn-primary"
                onClick={shareWithCharity}
                disabled={sharing}
              >
                {sharing
                  ? "Preparing the link…"
                  : board
                    ? "💬 Share / update the link"
                    : "💬 Share a link with photos"}
              </button>
            )}
            <button
              className="btn btn-secondary"
              style={{ marginTop: 10 }}
              onClick={emailPdf}
              disabled={makingPdf}
            >
              {makingPdf ? "Making the PDF…" : "📄 Email as a PDF"}
            </button>
            {board && (
              <button
                className="btn-quiet"
                style={{ color: "var(--gift)", marginTop: 6 }}
                onClick={stopSharing}
              >
                Stop sharing — turn the donation link off
              </button>
            )}
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
