"use client";

import { useEffect, useState } from "react";
import type { TopbarProps } from "./types";
import { AuthControls } from "./auth-controls";

function formatLocalTime(date: Date | null) {
  if (!date) {
    return { time: "--:--:--", date: "LOCAL · -- --- ----" };
  }

  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const timeZone = new Intl.DateTimeFormat("en-GB", { timeZoneName: "short" })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value ?? "LOCAL";
  return { time, date: `${timeZone.toUpperCase()} · ${day} ${month} ${date.getFullYear()}` };
}

export function Topbar({ title, subtitle, action }: TopbarProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setNow(new Date()));
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, []);

  const localTime = formatLocalTime(now);

  return (
    <header className="sticky top-0 z-20 flex h-[56px] items-center justify-between border-b border-[var(--bd)] bg-[rgba(12,12,11,.96)] px-5">
      <div>
        <h1 className="text-[15px] leading-[1.2] font-semibold tracking-[-0.012em]">{title}</h1>
        <p className="mt-1 text-[10.5px] leading-none text-text-tertiary">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3.5">
        {action}
        <div className="w-[112px] text-right">
          <div className="numeric text-[13px] font-medium">{localTime.time}</div>
          <div className="numeric mt-1 text-[8.5px] text-text-tertiary">{localTime.date}</div>
        </div>
        <AuthControls />
      </div>
    </header>
  );
}
