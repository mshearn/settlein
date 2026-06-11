export type Disposition = "move" | "keep" | "donate" | "gift" | "sell";

export interface Room {
  id: string;
  name: string;
  emoji: string;
  createdAt: number;
}

export interface Item {
  id: string;
  roomId: string;
  name: string;
  category: string;
  description: string;
  note: string;
  disposition: Disposition;
  photo: Blob | null;
  createdAt: number;
  /** Donate checklist: packed / dropped off */
  done?: boolean;
  /** Gift claim board */
  claimedBy?: string;
  /** Sell: asking price + garage-sale cash tracker */
  price?: number;
  sold?: boolean;
  soldPrice?: number;
}

export const DISPOSITION_LABELS: Record<Disposition, string> = {
  move: "Move Now",
  keep: "Keep",
  donate: "Donate",
  gift: "Gift",
  sell: "Sell",
};

export const ROOM_SUGGESTIONS: { name: string; emoji: string }[] = [
  { name: "Living Room", emoji: "🛋️" },
  { name: "Kitchen", emoji: "🍳" },
  { name: "Master Bedroom", emoji: "🛏️" },
  { name: "Guest Bedroom", emoji: "🛌" },
  { name: "Dining Room", emoji: "🍽️" },
  { name: "Garage", emoji: "🚗" },
  { name: "Basement", emoji: "🧰" },
  { name: "Attic", emoji: "📦" },
  { name: "Home Office", emoji: "🖋️" },
  { name: "Bathroom", emoji: "🛁" },
];
