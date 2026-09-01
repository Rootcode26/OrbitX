import type { ReactNode } from "react";

export type IconName =
  | "analytics"
  | "bell"
  | "calendar"
  | "chevron-left"
  | "chevron-right"
  | "conjunction"
  | "cube"
  | "database"
  | "globe"
  | "history"
  | "minus"
  | "orbit"
  | "overview"
  | "pause"
  | "play"
  | "plus"
  | "satellite"
  | "search"
  | "settings"
  | "target";

export interface IconProps {
  name: IconName;
  className?: string;
}

export interface PanelProps {
  title: string;
  meta?: ReactNode;
  className?: string;
  children: ReactNode;
}
