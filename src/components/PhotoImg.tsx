import { useEffect, useState } from "react";
import { Lightbox } from "./Lightbox";

/** Renders a Blob photo via a managed object URL. */
export function PhotoImg({
  blob,
  alt,
  className,
  tappable,
}: {
  blob: Blob | null;
  alt: string;
  className?: string;
  /** If true, tapping the thumbnail opens a full-screen lightbox. */
  tappable?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url) {
    return (
      <span className={className} aria-hidden="true">
        📦
      </span>
    );
  }

  if (tappable) {
    return (
      <>
        <button
          className={`photo-tap ${className ?? ""}`}
          aria-label={`View full-size photo of ${alt}`}
          onClick={() => setOpen(true)}
        >
          <img src={url} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </button>
        {open && (
          <Lightbox src={url} alt={alt} onClose={() => setOpen(false)} />
        )}
      </>
    );
  }

  return <img src={url} alt={alt} className={className} />;
}
