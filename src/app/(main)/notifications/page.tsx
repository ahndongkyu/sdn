import Link from "next/link";
import { ArrowLeft, Megaphone, CalendarDays, Bell } from "lucide-react";
import { getNotifications } from "@/lib/data/notifications";
import { formatDateKo } from "@/lib/format";
import { NotifSeen } from "@/components/layout/notif-seen";

export default async function NotificationsPage() {
  const notifs = await getNotifications();

  return (
    <div className="space-y-4">
      <NotifSeen />
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-lg font-medium">알림</h1>
        </Link>
      </div>

      {notifs.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">
          <Bell size={22} className="mx-auto mb-2 text-faint" />
          아직 알림이 없어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-divider bg-card soft-card">
          {notifs.map((n, i) => (
            <Link
              key={n.id}
              href={n.url}
              className={`flex items-center gap-3 px-3.5 py-3 ${i < notifs.length - 1 ? "border-b border-divider" : ""}`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: n.kind === "notice" ? "#e6f1fb" : "#eaf3de" }}>
                {n.kind === "notice" ? <Megaphone size={16} className="text-blue" /> : <CalendarDays size={16} className="text-[#3b6d11]" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{n.title}</div>
                <div className="truncate text-[12px] text-muted">{n.body}</div>
              </div>
              <span className="shrink-0 text-[11px] text-faint">{formatDateKo(n.at.slice(0, 10)).short}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
