import type { ReactNode } from "react";
import type { IconProps } from "./types";

const paths: Record<IconProps["name"], ReactNode> = {
  analytics: <path d="M4 19V9m5 10V5m5 14v-7m5 7V3M2 21h20" />,
  bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  calendar: <><rect x="3" y="4.5" width="18" height="16.5" rx="1" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  "chevron-left": <path d="m14 6-6 6 6 6" />,
  "chevron-right": <path d="m10 6 6 6-6 6" />,
  conjunction: <path d="M4 18c4-1 6-4 8-13m8 13c-4-1-6-4-8-13M7 19h10M12 5V2" />,
  cube: <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Zm0 9 8-4.5M12 12 4 7.5M12 12v9" />,
  database: <path d="M4 6c0-2 3.6-3 8-3s8 1 8 3-3.6 3-8 3-8-1-8-3Zm0 0v6c0 2 3.6 3 8 3s8-1 8-3V6M4 12v6c0 2 3.6 3 8 3s8-1 8-3v-6" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2M5.6 5.6 3 5v-2" /></>,
  minus: <path d="M5 12h14" />,
  orbit: <><ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(-30 12 12)" /><circle cx="17" cy="7" r="1.4" fill="currentColor" stroke="none" /></>,
  overview: <path d="M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 5 11 7-11 7V5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  satellite: <path d="m8 12 4-4 4 4-4 4-4-4Zm-5-5 4-4 3 3-4 4-3-3Zm11 11 4-4 3 3-4 4-3-3ZM5 19l4-4M15 9l4-4" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5M10.5 7.5v6M7.5 10.5h6" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9 7 7m10 10 2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1" /></>,
  target: <><circle cx="12" cy="12" r="7" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" /><circle cx="12" cy="12" r="1.5" /></>,
};

export function Icon({ name, className = "h-4 w-4" }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
