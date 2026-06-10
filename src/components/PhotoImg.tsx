import { useEffect, useState } from "react";

/** Renders a Blob photo via a managed object URL. */
export function PhotoImg({
  blob,
  alt,
  className,
}: {
  blob: Blob | null;
  alt: string;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);

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
  return <img src={url} alt={alt} className={className} />;
}
