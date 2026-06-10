import type { Tab } from "../App";

const TABS: { tab: Tab; label: string; icon: string }[] = [
  { tab: "home", label: "Home", icon: "🏠" },
  { tab: "donate", label: "Donate", icon: "🤲" },
  { tab: "gift", label: "Gift", icon: "🎁" },
  { tab: "sell", label: "Sell", icon: "🏷️" },
];

export function BottomNav({
  active,
  onSelect,
}: {
  active: Tab;
  onSelect: (tab: Tab) => void;
}) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ tab, label, icon }) => (
        <button
          key={tab}
          className={active === tab ? "active" : ""}
          aria-current={active === tab ? "page" : undefined}
          onClick={() => onSelect(tab)}
        >
          <span className="nav-icon" aria-hidden="true">
            {icon}
          </span>
          {label}
        </button>
      ))}
    </nav>
  );
}
