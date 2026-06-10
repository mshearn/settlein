import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Item, Room } from "./types";

interface SettleInDB extends DBSchema {
  rooms: { key: string; value: Room };
  items: {
    key: string;
    value: Item;
    indexes: { "by-room": string };
  };
}

let dbPromise: Promise<IDBPDatabase<SettleInDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<SettleInDB>("settlein", 1, {
      upgrade(db) {
        db.createObjectStore("rooms", { keyPath: "id" });
        const items = db.createObjectStore("items", { keyPath: "id" });
        items.createIndex("by-room", "roomId");
      },
    });
  }
  return dbPromise;
}

export function newId(): string {
  return crypto.randomUUID();
}

export async function loadAll(): Promise<{ rooms: Room[]; items: Item[] }> {
  const db = await getDB();
  const [rooms, items] = await Promise.all([
    db.getAll("rooms"),
    db.getAll("items"),
  ]);
  rooms.sort((a, b) => a.createdAt - b.createdAt);
  items.sort((a, b) => b.createdAt - a.createdAt);
  return { rooms, items };
}

export async function putRoom(room: Room): Promise<void> {
  const db = await getDB();
  await db.put("rooms", room);
}

export async function deleteRoom(roomId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(["rooms", "items"], "readwrite");
  await tx.objectStore("rooms").delete(roomId);
  const itemStore = tx.objectStore("items");
  for (const key of await itemStore.index("by-room").getAllKeys(roomId)) {
    await itemStore.delete(key);
  }
  await tx.done;
}

export async function putItem(item: Item): Promise<void> {
  const db = await getDB();
  await db.put("items", item);
}

export async function deleteItem(itemId: string): Promise<void> {
  const db = await getDB();
  await db.delete("items", itemId);
}
