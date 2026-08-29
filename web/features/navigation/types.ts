import type { IconName } from "@/components/ui/types";

export interface NavigationItem {
  label: string;
  href: string;
  icon: IconName;
  count?: number;
  active?: boolean;
}
