/**
 * On-device PDF generation for emailable item lists (photos included).
 * jsPDF is dynamically imported so it only loads when a PDF is requested.
 */
import type { Item } from "./types";
import { downscalePhoto } from "./photo";

export interface PdfRow {
  item: Item;
  /** e.g. "Furniture · Living Room" */
  sub: string;
}

const PAGE_W = 210; // A4 mm
const PAGE_H = 297;
const MARGIN = 16;
const PHOTO = 42; // photo box edge, mm
const ROW_GAP = 8;

async function photoData(
  blob: Blob,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const small = await downscalePhoto(blob, 640, 0.7);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(small);
    });
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    // Fit inside the photo box, preserving aspect ratio.
    const scale = Math.min(PHOTO / img.width, PHOTO / img.height);
    return { dataUrl, w: img.width * scale, h: img.height * scale };
  } catch {
    return null; // a missing photo shouldn't sink the whole PDF
  }
}

export async function makeItemListPdf(
  title: string,
  intro: string,
  rows: PdfRow[],
): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const textW = PAGE_W - MARGIN * 2 - PHOTO - 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(title, MARGIN, MARGIN + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(95, 87, 73);
  const introLines = doc.splitTextToSize(
    `${intro} — ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
    PAGE_W - MARGIN * 2,
  );
  doc.text(introLines, MARGIN, MARGIN + 14);
  let y = MARGIN + 14 + introLines.length * 5 + 4;

  for (const [index, { item, sub }] of rows.entries()) {
    const photo = item.photo ? await photoData(item.photo) : null;
    const noteLines: string[] = item.note
      ? doc.splitTextToSize(`Note: ${item.note}`, textW)
      : [];
    const textH = 14 + noteLines.length * 5;
    const rowH = Math.max(photo ? PHOTO : 0, textH);

    if (y + rowH > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }

    let textX = MARGIN;
    if (photo) {
      doc.addImage(photo.dataUrl, "JPEG", MARGIN, y, photo.w, photo.h);
      textX = MARGIN + PHOTO + 8;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(43, 38, 32);
    doc.text(`${index + 1}. ${item.name}`, textX, y + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(95, 87, 73);
    doc.text(sub, textX, y + 12);
    if (noteLines.length) doc.text(noteLines, textX, y + 18);

    y += rowH + ROW_GAP;
  }

  doc.setFontSize(9);
  doc.setTextColor(150, 142, 128);
  doc.text("Made with SettleIn", MARGIN, PAGE_H - 8);

  return doc.output("blob");
}

/**
 * Hand the PDF to the share sheet (iOS/Android — lands in Mail as an
 * attachment); fall back to a plain download on desktop browsers.
 * Returns how it was delivered, or "cancelled" if the user backed out.
 */
export async function sharePdf(
  blob: Blob,
  filename: string,
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch {
      return "cancelled"; // user closed the share sheet
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return "downloaded";
}
