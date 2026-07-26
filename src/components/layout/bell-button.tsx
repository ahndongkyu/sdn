"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};

export function BellButton({ latestAt }: { latestAt: string | null }) {
  const unread = useSyncExternalStore(subscribeToNothing, () => {
    if (!latestAt) return false;
    const seen = localStorage.getItem("sdn_notif_seen");
    return !seen || new Date(latestAt).getTime() > new Date(seen).getTime();
  }, () => false);

  return (
    <Link href="/notifications" className="relative" aria-label="알림">
      <Bell size={22} className="text-muted" />
      {unread && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pink" />}
    </Link>
  );
}
