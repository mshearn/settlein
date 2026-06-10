import { useCallback, useEffect, useRef, useState } from "react";
import type { Disposition, Item, Room } from "./types";
import * as db from "./db";
import { BottomNav } from "./components/BottomNav";
import { Dashboard } from "./screens/Dashboard";
import { RoomView } from "./screens/RoomView";
import { AddItem } from "./screens/AddItem";
import { DonateView } from "./screens/DonateView";
import { GiftView } from "./screens/GiftView";
import { SellView } from "./screens/SellView";
import { Settings } from "./screens/Settings";

export type Tab = "home" | "donate" | "gift" | "sell";

export type Route =
  | { screen: "home" }
  | { screen: "room"; roomId: string }
  | { screen: "add"; roomId: string }
  | { screen: "donate" }
  | { screen: "gift" }
  | { screen: "sell" }
  | { screen: "settings" };

export interface Store {
  rooms: Room[];
  items: Item[];
  addRoom(name: string, emoji: string): Promise<Room>;
  removeRoom(roomId: string): Promise<void>;
  saveItem(item: Item): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  updateItem(itemId: string, patch: Partial<Item>): Promise<void>;
}

export default function App() {
  const [route, setRoute] = useState<Route>({ screen: "home" });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    db.loadAll().then(({ rooms, items }) => {
      setRooms(rooms);
      setItems(items);
      setLoaded(true);
    });
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const store: Store = {
    rooms,
    items,
    async addRoom(name, emoji) {
      const room: Room = { id: db.newId(), name, emoji, createdAt: Date.now() };
      await db.putRoom(room);
      setRooms((r) => [...r, room]);
      return room;
    },
    async removeRoom(roomId) {
      await db.deleteRoom(roomId);
      setRooms((r) => r.filter((x) => x.id !== roomId));
      setItems((i) => i.filter((x) => x.roomId !== roomId));
    },
    async saveItem(item) {
      await db.putItem(item);
      setItems((prev) => [item, ...prev.filter((x) => x.id !== item.id)]);
    },
    async removeItem(itemId) {
      await db.deleteItem(itemId);
      setItems((prev) => prev.filter((x) => x.id !== itemId));
    },
    async updateItem(itemId, patch) {
      const current = items.find((x) => x.id === itemId);
      if (!current) return;
      const next = { ...current, ...patch };
      await db.putItem(next);
      setItems((prev) => prev.map((x) => (x.id === itemId ? next : x)));
    },
  };

  const activeTab: Tab =
    route.screen === "donate" || route.screen === "gift" || route.screen === "sell"
      ? route.screen
      : "home";

  if (!loaded) {
    return (
      <main className="screen" aria-busy="true">
        <div className="brand">
          <h1>SettleIn</h1>
          <p>Your moving companion</p>
        </div>
      </main>
    );
  }

  const navigate = (r: Route) => {
    window.scrollTo(0, 0);
    setRoute(r);
  };

  let screen: React.ReactNode;
  switch (route.screen) {
    case "home":
      screen = <Dashboard store={store} navigate={navigate} />;
      break;
    case "room":
      screen = (
        <RoomView
          store={store}
          roomId={route.roomId}
          navigate={navigate}
          showToast={showToast}
        />
      );
      break;
    case "add":
      screen = (
        <AddItem
          store={store}
          roomId={route.roomId}
          navigate={navigate}
          showToast={showToast}
        />
      );
      break;
    case "donate":
      screen = <DonateView store={store} navigate={navigate} />;
      break;
    case "gift":
      screen = <GiftView store={store} showToast={showToast} />;
      break;
    case "sell":
      screen = <SellView store={store} showToast={showToast} />;
      break;
    case "settings":
      screen = <Settings navigate={navigate} showToast={showToast} />;
      break;
  }

  const hideNav = route.screen === "add";

  return (
    <>
      {screen}
      {!hideNav && (
        <BottomNav
          active={activeTab}
          onSelect={(tab) =>
            navigate(tab === "home" ? { screen: "home" } : { screen: tab })
          }
        />
      )}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
}

export function dispositionItems(items: Item[], d: Disposition): Item[] {
  return items.filter((i) => i.disposition === d);
}
