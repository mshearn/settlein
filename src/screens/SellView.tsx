import { useState } from "react";
import type { Store } from "../App";
import type { Item } from "../types";
import { PhotoImg } from "../components/PhotoImg";

export function SellView({
  store,
  showToast,
}: {
  store: Store;
  showToast: (m: string) => void;
}) {
  const [garageMode, setGarageMode] = useState(false);

  const items = store.items.filter((i) => i.disposition === "sell");
  const soldItems = items.filter((i) => i.sold);
  const cashTotal = soldItems.reduce((sum, i) => sum + (i.soldPrice ?? 0), 0);

  async function copyListing(item: Item) {
    const text = [
      item.name,
      item.price ? `$${item.price}` : "",
      "",
      item.description || item.note || `${item.category} in good condition.`,
      item.note && item.description ? `\n${item.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Try to copy photo + text together; fall back to text only.
    if (item.photo && navigator.clipboard && "write" in navigator.clipboard) {
      try {
        const png = await toPng(item.photo);
        await navigator.clipboard.write([
          new ClipboardItem({
            "image/png": png,
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        showToast("Photo & description copied — paste into your marketplace");
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(text);
    showToast("Description copied — paste into your marketplace");
  }

  return (
    <main className="screen">
      <div className="screen-header">
        <h2>🏷️ Sell</h2>
      </div>
      <div className="print-header">
        <h2>SettleIn — Price Tags</h2>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <span className="big" aria-hidden="true">
            🏷️
          </span>
          Items you mark <strong>Sell</strong> gather here with pricing tools and
          a garage-sale cash tracker.
        </div>
      ) : (
        <>
          <div className="card cash-total no-print">
            <span>
              {garageMode ? "💵 Garage sale — cash collected" : "Items to sell"}
            </span>
            {garageMode ? (
              <span className="money">${cashTotal.toFixed(2)}</span>
            ) : (
              <span className="money">{items.length}</span>
            )}
          </div>

          <button
            className={`btn ${garageMode ? "btn-primary" : "btn-secondary"} no-print`}
            onClick={() => setGarageMode(!garageMode)}
            aria-pressed={garageMode}
          >
            {garageMode ? "✓ Garage Sale Mode is ON" : "Start Garage Sale Mode"}
          </button>

          {items.map((item) => (
            <div key={item.id} className="card item-card" style={{ flexWrap: "wrap" }}>
              <PhotoImg blob={item.photo} alt={item.name} className="item-thumb" />
              <div className="item-body">
                <div className="item-name">{item.name}</div>
                <div className="item-sub">{item.category}</div>
                {item.sold && (
                  <span className="badge badge-keep">
                    Sold — ${(item.soldPrice ?? 0).toFixed(2)}
                  </span>
                )}
              </div>
              <span className="money no-print" aria-hidden="true">
                $
              </span>
              <input
                className="price-input no-print"
                type="number"
                inputMode="decimal"
                min={0}
                placeholder="Price"
                aria-label={`Asking price for ${item.name}`}
                value={item.price ?? ""}
                onChange={(e) =>
                  store.updateItem(item.id, {
                    price: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
              />
              <div style={{ width: "100%" }} className="no-print">
                {garageMode ? (
                  item.sold ? (
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        store.updateItem(item.id, { sold: false, soldPrice: undefined })
                      }
                    >
                      ↩︎ Undo sale
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={async () => {
                        await store.updateItem(item.id, {
                          sold: true,
                          soldPrice: item.price ?? 0,
                        });
                        showToast(
                          `Sold ${item.name} for $${(item.price ?? 0).toFixed(2)} 💵`,
                        );
                      }}
                    >
                      💵 Mark Sold for ${(item.price ?? 0).toFixed(2)}
                    </button>
                  )
                ) : (
                  <button className="btn btn-secondary" onClick={() => copyListing(item)}>
                    📋 Copy listing for marketplace
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Printable price-tag sheet */}
          <div className="price-tags">
            {items.map((item) => (
              <div key={item.id} className="price-tag">
                <div>{item.name}</div>
                <div className="tag-price">
                  ${item.price != null ? item.price.toFixed(2) : "____"}
                </div>
                <div className="small">SettleIn garage sale</div>
              </div>
            ))}
          </div>

          <button className="btn btn-secondary no-print" onClick={() => window.print()}>
            🖨️ Print Price Tags
          </button>
        </>
      )}
    </main>
  );
}

/** Clipboard API only accepts PNG for images — convert the stored JPEG. */
async function toPng(blob: Blob): Promise<Blob> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    canvas.getContext("2d")!.drawImage(img, 0, 0);
    const png = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!png) throw new Error("toBlob failed");
    return png;
  } finally {
    URL.revokeObjectURL(url);
  }
}
