import Anthropic from "@anthropic-ai/sdk";

export interface Identification {
  name: string;
  category: string;
  description: string;
}

const KEY_STORAGE = "settlein-api-key";

export function getApiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setApiKey(key: string): void {
  if (key.trim()) localStorage.setItem(KEY_STORAGE, key.trim());
  else localStorage.removeItem(KEY_STORAGE);
}

export function aiAvailable(): boolean {
  return getApiKey().length > 0 && navigator.onLine;
}

export const CATEGORIES = [
  "Furniture",
  "Kitchenware",
  "Clothing",
  "Books & Media",
  "Décor",
  "Electronics",
  "Tools",
  "Keepsakes",
  "Other",
] as const;

const SCHEMA = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description:
        "A short, friendly name for the item, e.g. 'Vintage Armchair'",
    },
    category: { type: "string", enum: [...CATEGORIES] },
    description: {
      type: "string",
      description:
        "A warm 2–3 sentence description suitable for a marketplace listing: what it is, material/color, condition as visible.",
    },
  },
  required: ["name", "category", "description"],
  additionalProperties: false,
} as const;

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Identify the item in a photo. Returns null when no API key is configured
 * or the device is offline — the app degrades to manual naming.
 */
export async function identifyItem(
  photo: Blob,
): Promise<Identification | null> {
  if (!aiAvailable()) return null;

  const client = new Anthropic({
    apiKey: getApiKey(),
    dangerouslyAllowBrowser: true,
  });

  const data = await blobToBase64(photo);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data },
          },
          {
            type: "text",
            text: "You are helping a senior catalog household items while downsizing for a move. Identify the main item in this photo.",
          },
        ],
      },
    ],
    output_config: {
      format: { type: "json_schema", schema: SCHEMA },
    },
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "";
  if (!text) return null;
  return JSON.parse(text) as Identification;
}
