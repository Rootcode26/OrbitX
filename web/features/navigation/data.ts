import type { NavigationItem } from "./types";

export const navigationItems: NavigationItem[] = [
  { label: "Overview", href: "/", icon: "overview" },
  { label: "Orbital Objects", href: "/orbital-objects", icon: "cube" },
  { label: "History", href: "/history", icon: "history" },
  { label: "Conjunctions", href: "/conjunctions", icon: "conjunction", count: 16 },
  { label: "Live Tracking", href: "/live-tracking", icon: "globe" },
  { label: "Satellite Finder", href: "/satellite-finder", icon: "search" },
  { label: "Satellite Maker", href: "/satellite-maker", icon: "satellite" },
  { label: "Alerts", href: "/alerts", icon: "bell", count: 3 },
  { label: "Analytics", href: "/analytics", icon: "analytics" },
  { label: "Data Sources", href: "/data-sources", icon: "database" },
];
