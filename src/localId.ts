/**
 * Free, on-device photo identification via Transformers.js.
 * No account, no API key, no per-use cost. The model (~25MB) downloads on
 * first use and is cached by the browser, so it also works offline afterward.
 *
 * Labels come from ImageNet, so they're generic ("rocking chair", "table
 * lamp") rather than the richer names the optional cloud identifier gives.
 */
import type { Identification } from "./ai";

const MODEL = "Xenova/vit-base-patch16-224";
const MIN_CONFIDENCE = 0.1;

type Classifier = (
  input: string,
  options?: { top_k?: number },
) => Promise<{ label: string; score: number }[]>;

let pipePromise: Promise<Classifier> | null = null;

/** Kick off the model download early so the first photo doesn't wait on it. */
export function preloadLocalModel(): void {
  void getPipe().catch(() => {
    // Offline first run, or CDN unreachable — identifyLocally will retry.
    pipePromise = null;
  });
}

function getPipe(): Promise<Classifier> {
  if (!pipePromise) {
    pipePromise = (async () => {
      const { pipeline } = await import("@huggingface/transformers");
      const pipe = await pipeline("image-classification", MODEL);
      return pipe as unknown as Classifier;
    })();
  }
  return pipePromise;
}

export async function identifyLocally(
  photo: Blob,
): Promise<Identification | null> {
  let pipe: Classifier;
  try {
    pipe = await getPipe();
  } catch (err) {
    console.warn("[settlein] local model load failed:", err);
    pipePromise = null;
    return null;
  }

  const url = URL.createObjectURL(photo);
  try {
    const results = await pipe(url, { top_k: 3 });
    const top = results?.[0];
    if (!top || top.score < MIN_CONFIDENCE) return null;
    const name = prettyLabel(top.label);
    const category = categorize(top.label);
    return {
      name,
      category,
      description: `${name} in good used condition. From a smoke-free home; pickup preferred.`,
    };
  } catch (err) {
    console.warn("[settlein] local classification failed:", err);
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** "rocking chair, rocker" → "Rocking Chair" */
function prettyLabel(label: string): string {
  const first = label.split(",")[0].trim();
  return first.replace(/\b\w/g, (c) => c.toUpperCase());
}

const CATEGORY_KEYWORDS: [string, string[]][] = [
  // Checked in order — "bookcase" must hit Furniture before "book" hits Books.
  [
    "Furniture",
    [
      "chair",
      "sofa",
      "couch",
      "table",
      "desk",
      "cabinet",
      "wardrobe",
      "chest",
      "bookcase",
      "bookshelf",
      "shelf",
      "bed",
      "crib",
      "cradle",
      "dresser",
      "stool",
      "bench",
      "ottoman",
      "futon",
      "four-poster",
    ],
  ],
  [
    "Kitchenware",
    [
      "pot",
      "pan",
      "teapot",
      "kettle",
      "plate",
      "bowl",
      "cup",
      "mug",
      "goblet",
      "pitcher",
      "tray",
      "ladle",
      "spatula",
      "whisk",
      "mixer",
      "blender",
      "toaster",
      "oven",
      "microwave",
      "refrigerator",
      "dishwasher",
      "stove",
      "wok",
      "frying",
      "corkscrew",
      "coffee",
      "espresso",
      "saltshaker",
      "strainer",
      "colander",
      "cleaver",
      "measuring",
    ],
  ],
  [
    "Clothing",
    [
      "coat",
      "jacket",
      "sweater",
      "sweatshirt",
      "shirt",
      "jersey",
      "gown",
      "dress",
      "suit",
      "shoe",
      "boot",
      "sandal",
      "clog",
      "loafer",
      "hat",
      "cap",
      "bonnet",
      "sombrero",
      "sock",
      "scarf",
      "stole",
      "glove",
      "mitten",
      "kimono",
      "cardigan",
      "pajama",
      "necktie",
      "bow tie",
      "handbag",
      "purse",
      "backpack",
      "umbrella",
      "apron",
      "vest",
      "uniform",
      "skirt",
      "jean",
      "trench",
      "poncho",
    ],
  ],
  ["Books & Media", ["book", "comic", "magazine", "album", "atlas", "binder"]],
  [
    "Décor",
    [
      "vase",
      "lamp",
      "lampshade",
      "candle",
      "clock",
      "picture",
      "frame",
      "curtain",
      "shade",
      "rug",
      "carpet",
      "doormat",
      "pillow",
      "cushion",
      "quilt",
      "tapestry",
      "flowerpot",
      "planter",
      "figurine",
      "sculpture",
      "bust",
      "ornament",
      "chandelier",
      "candelabra",
      "mirror",
      "screen",
      "windsor",
      "pedestal",
    ],
  ],
  [
    "Electronics",
    [
      "television",
      "monitor",
      "screen",
      "computer",
      "laptop",
      "notebook",
      "keyboard",
      "mouse",
      "phone",
      "telephone",
      "cellular",
      "radio",
      "speaker",
      "loudspeaker",
      "cd player",
      "cassette",
      "tape player",
      "camera",
      "projector",
      "printer",
      "remote",
      "ipod",
      "modem",
      "joystick",
      "turntable",
      "amplifier",
      "headphone",
      "microphone",
    ],
  ],
  [
    "Tools",
    [
      "hammer",
      "screwdriver",
      "drill",
      "saw",
      "wrench",
      "plane",
      "plunger",
      "shovel",
      "rake",
      "hoe",
      "axe",
      "hatchet",
      "chainsaw",
      "mower",
      "vacuum",
      "ladder",
      "toolbox",
      "tool kit",
      "vise",
      "level",
      "tape measure",
      "broom",
      "bucket",
      "wheelbarrow",
      "scale",
      "lawn",
    ],
  ],
];

function categorize(label: string): string {
  const lower = label.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "Other";
}
