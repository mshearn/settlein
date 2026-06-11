import { useEffect, useRef, useState } from "react";
import type { Route, Store } from "../App";
import type { Disposition } from "../types";
import { DISPOSITION_LABELS, type Item } from "../types";
import { identifyItem, CATEGORIES, type Identification } from "../ai";
import { preloadLocalModel } from "../localId";
import { downscalePhoto } from "../photo";
import { listen, speechSupported, type ListenHandle } from "../speech";
import { newId } from "../db";
import { PhotoImg } from "../components/PhotoImg";
import { stagedMoveEnabled } from "../prefs";

type Stage = "capture" | "review" | "decide";

export function AddItem({
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
  const room = store.rooms.find((r) => r.id === roomId);
  const fileInput = useRef<HTMLInputElement>(null);
  const staged = stagedMoveEnabled();

  const [stage, setStage] = useState<Stage>("capture");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [idea, setIdea] = useState<Identification | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("Other");
  const [note, setNote] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Voice note state
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const listenHandle = useRef<ListenHandle | null>(null);

  // Decision support state
  const [answerUsed, setAnswerUsed] = useState<boolean | null>(null);
  const [answerMemory, setAnswerMemory] = useState<boolean | null>(null);

  useEffect(() => {
    // Warm up the on-device recognition model while the user frames a shot.
    preloadLocalModel();
    return () => listenHandle.current?.stop();
  }, []);

  if (!room) {
    navigate({ screen: "home" });
    return null;
  }

  const roomCount = store.items.filter((i) => i.roomId === roomId).length;

  async function onPhotoPicked(file: File) {
    const small = await downscalePhoto(file);
    setPhoto(small);
    setStage("review");
    setIdea(null);
    setName("");
    setCategory("Other");
    setNote("");
    setEditingName(false);
    setConfirmed(false);
    setAnswerUsed(null);
    setAnswerMemory(null);

    setIdentifying(true);
    try {
      const result = await identifyItem(small);
      if (result) {
        setIdea(result);
        setName(result.name);
        setCategory(result.category);
      }
    } catch {
      // Both identifiers unavailable — manual naming takes over silently.
    } finally {
      setIdentifying(false);
    }
  }

  function startVoice() {
    if (listening) {
      listenHandle.current?.stop();
      return;
    }
    setTranscript("");
    setListening(true);
    listenHandle.current = listen(
      (text) => setTranscript(text),
      () => setListening(false),
      (message) => {
        setListening(false);
        showToast(message);
      },
    );
    if (!listenHandle.current) setListening(false);
  }

  async function save(disposition: Disposition) {
    const item: Item = {
      id: newId(),
      roomId,
      name: name.trim() || "Untitled item",
      category,
      description: idea?.description ?? "",
      note: note.trim(),
      disposition,
      photo,
      createdAt: Date.now(),
    };
    await store.saveItem(item);
    showToast(
      `Saved to ${DISPOSITION_LABELS[disposition]} — ${roomCount + 1} items in ${room!.name}`,
    );
    // PRD: reset back to camera for the next item.
    setStage("capture");
    setPhoto(null);
    setIdea(null);
    setName("");
    setNote("");
    setTranscript("");
  }

  // ---------- Decision support ----------
  if (stage === "decide") {
    let content: React.ReactNode;
    if (answerUsed === null) {
      content = (
        <Question
          text="Have you used or enjoyed this item in the past year?"
          onAnswer={setAnswerUsed}
        />
      );
    } else if (answerMemory === null) {
      content = (
        <Question
          text="Does this item hold a special memory you want to protect?"
          onAnswer={setAnswerMemory}
        />
      );
    } else if (answerUsed && staged) {
      // Staged move: it's coming with them — the real question is which trip.
      content = (
        <div className="suggestion-card">
          <p>
            It sounds like this item is still part of your life — it's coming
            with you. Does it need to go in the first load, or can it wait
            here until the house sells?
          </p>
          <button
            className="btn-disposition btn-move"
            style={{ width: "100%" }}
            onClick={() => save("move")}
          >
            Move Now — first load
          </button>
          <button
            className="btn-disposition btn-keep"
            style={{ width: "100%", marginTop: 12 }}
            onClick={() => save("keep")}
          >
            Keep — it can wait here
          </button>
          <button
            className="btn-quiet"
            style={{ marginTop: 12 }}
            onClick={() => {
              setAnswerUsed(null);
              setAnswerMemory(null);
              setStage("review");
            }}
          >
            Let me choose myself
          </button>
        </div>
      );
    } else {
      let suggestion: { text: string; action: Disposition };
      if (answerUsed) {
        suggestion = {
          text: "It sounds like this item is still part of your life. It deserves a place in your new home.",
          action: "keep",
        };
      } else if (answerMemory) {
        suggestion = {
          text: "The memory matters more than the object — and your photo of it is already saved here in SettleIn. Would you like to gift the item itself to a family member, so the story stays in the family?",
          action: "gift",
        };
      } else {
        suggestion = {
          text: "It sounds like this item has finished its job for you. Donating it lets it be useful to someone else.",
          action: "donate",
        };
      }
      content = (
        <div className="suggestion-card">
          <p>{suggestion.text}</p>
          <button
            className={`btn-disposition btn-${suggestion.action}`}
            style={{ width: "100%" }}
            onClick={() => save(suggestion.action)}
          >
            {DISPOSITION_LABELS[suggestion.action]} this item
          </button>
          <button
            className="btn-quiet"
            style={{ marginTop: 12 }}
            onClick={() => {
              setAnswerUsed(null);
              setAnswerMemory(null);
              setStage("review");
            }}
          >
            Let me choose myself
          </button>
        </div>
      );
    }

    return (
      <main className="screen">
        <div className="screen-header">
          <button aria-label="Back" onClick={() => setStage("review")}>
            ← Back
          </button>
          <h2>Let's think it through</h2>
        </div>
        {photo && (
          <PhotoImg blob={photo} alt={name || "Your item"} className="photo-frame" />
        )}
        {content}
      </main>
    );
  }

  // ---------- Capture ----------
  if (stage === "capture") {
    return (
      <main className="screen">
        <div className="screen-header">
          <button
            aria-label="Back to room"
            onClick={() => navigate({ screen: "room", roomId })}
          >
            ← Done
          </button>
          <h2>New Item</h2>
          <span className="badge badge-keep">{room.name}</span>
        </div>

        <button className="capture-zone" onClick={() => fileInput.current?.click()}>
          <span className="camera-icon" aria-hidden="true">
            📷
          </span>
          Take a Photo
          <span style={{ fontWeight: 400, fontSize: "0.9rem" }}>
            Point your camera at one item
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhotoPicked(f);
            e.target.value = "";
          }}
        />
        <p className="muted small" style={{ textAlign: "center" }}>
          {roomCount === 0
            ? "Your photos stay on this device."
            : `${roomCount} ${roomCount === 1 ? "item" : "items"} so far in ${room.name}.`}
        </p>
      </main>
    );
  }

  // ---------- Review ----------
  return (
    <main className="screen">
      <div className="screen-header">
        <button
          aria-label="Back to room"
          onClick={() => navigate({ screen: "room", roomId })}
        >
          ← Cancel
        </button>
        <h2>New Item</h2>
        <span className="badge badge-keep">{room.name}</span>
      </div>

      <div style={{ position: "relative" }}>
        <PhotoImg blob={photo} alt="Your item" className="photo-frame" />
        <button
          className="btn btn-secondary no-print"
          style={{
            position: "absolute",
            bottom: 12,
            right: 12,
            width: "auto",
            padding: "8px 18px",
            background: "rgba(255,255,255,0.95)",
          }}
          onClick={() => fileInput.current?.click()}
        >
          Retake
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPhotoPicked(f);
            e.target.value = "";
          }}
        />
      </div>

      <div className="ai-card">
        <div className="ai-label">
          {identifying
            ? "One moment — taking a look…"
            : confirmed
              ? "Your item:"
              : idea
                ? "We think this is:"
                : "What is this item?"}
        </div>
        {identifying ? (
          <h3>🔍 Looking at your photo…</h3>
        ) : editingName || (!idea && !identifying) ? (
          <>
            <input
              className="text-input"
              style={{ margin: "8px 0" }}
              placeholder="e.g. Vintage Armchair"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus={editingName}
            />
            <label className="field-label" htmlFor="category" style={{ marginTop: 4 }}>
              Category
            </label>
            <select
              id="category"
              className="text-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {editingName && (
              <button
                className="btn btn-primary"
                style={{ marginTop: 10 }}
                onClick={() => {
                  setEditingName(false);
                  setConfirmed(true);
                }}
                disabled={!name.trim()}
              >
                ✓ That's right
              </button>
            )}
          </>
        ) : (
          <>
            <h3>{name}</h3>
            <div className="ai-category">📂 {category}</div>
            {confirmed ? (
              <>
                <p className="muted small" style={{ margin: "10px 0 0" }}>
                  ✓ Confirmed — now choose what to do with it below.
                </p>
                <button
                  className="btn-quiet"
                  style={{ padding: "6px 0 0" }}
                  onClick={() => {
                    setConfirmed(false);
                    setEditingName(true);
                  }}
                >
                  Edit name
                </button>
              </>
            ) : (
              <div className="btn-row">
                <button className="btn btn-primary" onClick={() => setConfirmed(true)}>
                  ✓ Looks right
                </button>
                <button className="btn btn-secondary" onClick={() => setEditingName(true)}>
                  Edit name
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {speechSupported() && (
        <button className="card voice-card" onClick={startVoice}>
          <span
            className={`voice-icon ${listening ? "voice-live" : ""}`}
            aria-hidden="true"
          >
            🎤
          </span>
          <span>
            <strong>{listening ? "Listening… tap to stop" : "Add a voice note"}</strong>
            <br />
            <span className="muted small">
              {listening
                ? "Tell us about this item"
                : "Describe it instead of typing"}
            </span>
          </span>
        </button>
      )}

      {transcript && (
        <div className="card">
          <p style={{ marginTop: 0 }}>
            “{transcript}”
          </p>
          <div className="btn-row">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setName(transcript);
                setTranscript("");
                showToast("Name updated");
              }}
            >
              Use as name
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                setNote(note ? `${note} ${transcript}` : transcript);
                setTranscript("");
                showToast("Note saved with this item");
              }}
            >
              Save as note
            </button>
          </div>
        </div>
      )}
      {note && (
        <p className="muted small" style={{ margin: 0 }}>
          📝 Note: {note}
        </p>
      )}

      <h2 className="section-title">What would you like to do?</h2>
      {staged && (
        <button
          className="btn-disposition btn-move"
          style={{ width: "100%", marginBottom: 12 }}
          onClick={() => save("move")}
        >
          🚚 Move Now
          <span className="hint">Essentials — first load to the new home</span>
        </button>
      )}
      <div className="disposition-grid">
        <button className="btn-disposition btn-keep" onClick={() => save("keep")}>
          Keep
          <span className="hint">
            {staged ? "Stays here until the house sells" : "Coming with you"}
          </span>
        </button>
        <button className="btn-disposition btn-donate" onClick={() => save("donate")}>
          Donate
          <span className="hint">Give to charity</span>
        </button>
        <button className="btn-disposition btn-gift" onClick={() => save("gift")}>
          Gift
          <span className="hint">Offer to family</span>
        </button>
        <button className="btn-disposition btn-sell" onClick={() => save("sell")}>
          Sell
          <span className="hint">Turn into cash</span>
        </button>
      </div>

      <button className="btn-quiet" onClick={() => setStage("decide")}>
        Not sure? Help me decide
      </button>
    </main>
  );
}

function Question({
  text,
  onAnswer,
}: {
  text: string;
  onAnswer: (answer: boolean) => void;
}) {
  return (
    <div className="card decision-question">
      <h3>{text}</h3>
      <div className="btn-row">
        <button className="btn btn-secondary" onClick={() => onAnswer(false)}>
          Not really
        </button>
        <button className="btn btn-primary" onClick={() => onAnswer(true)}>
          Yes
        </button>
      </div>
    </div>
  );
}
