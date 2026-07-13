import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { PushToggle } from "@/components/push/push-toggle";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { ManagerTitles } from "@/components/settings/manager-titles";
import { isManager } from "@/lib/data/auth";
import { getManagerTitles } from "@/lib/data/titles";
import { getMembers } from "@/lib/data/members";

export default async function SettingsPage() {
  const manager = await isManager();
  const [titles, members] = manager ? await Promise.all([getManagerTitles(), getMembers()]) : [[], []];
  const managers = members
    .filter((m) => m.role === "manager" || m.role === "admin")
    .map((m) => ({ id: m.id, name: m.name, position1: m.position1, title: m.title }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-lg font-medium text-fg">설정</h1>
        </Link>
      </div>

      <div>
        <div className="mb-2 ml-1 text-xs text-subtle">화면</div>
        <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
          <ThemeToggle />
        </div>
      </div>

      <div>
        <div className="mb-2 ml-1 text-xs text-subtle">알림</div>
        <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
          <PushToggle />
        </div>
      </div>

      {manager && (
        <div>
          <div className="mb-2 ml-1 flex items-center gap-1 text-xs text-subtle">
            <Shield size={12} /> 운영진 역할 <span className="text-faint">(권한 동일 · 표시용 직책)</span>
          </div>
          <ManagerTitles titles={titles} managers={managers} />
        </div>
      )}
    </div>
  );
}
