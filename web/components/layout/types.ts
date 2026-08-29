import type { ReactNode } from "react";

export interface AppShellProps {
  children: ReactNode;
  title: string;
  subtitle: string;
  activePath: string;
  unacknowledgedAlerts?: number;
  topbarAction?: ReactNode;
}

export interface TopbarProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}
