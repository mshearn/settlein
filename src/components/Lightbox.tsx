import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Full-screen photo lightbox. Tap the backdrop or press Escape to close.
 * Works with both data URLs (claim board) and blob object URLs (local screens).
 */
export function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Prevent the page from scrolling while the lightbox is open.
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div
      className="lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Full-size photo: ${alt}`}
      onClick={onClose}
    >
      <button
        className="lightbox-close"
        aria-label="Close photo"
        onClick={onClose}
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body,
  );
}
