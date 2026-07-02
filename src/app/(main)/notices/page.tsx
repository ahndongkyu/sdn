import Link from "next/link";
import { ArrowLeft, Plus, Megaphone } from "lucide-react";
import { getNotices } from "@/lib/data/notices";
import { getMyProfile } from "@/lib/data/auth";
import { formatDateKo } from "@/lib/format";

export default async function NoticesPage() {
  const [notices, profile] = await Promise.all([getNotices(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-lg font-medium">공지사항</h1>
        </Link>
        {isManager && (
          <Link href="/admin/notices/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
            <Plus size={15} /> 작성
          </Link>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">
          <Megaphone size={22} className="mx-auto mb-2 text-faint" />
          아직 공지가 없어요.
        </div>
      ) : (
        <div className="space-y-2">
          {notices.map((n) => (
            <Link key={n.id} href={`/notices/${n.id}`} className="block rounded-xl border border-divider bg-card soft-card p-3.5">
              <div className="mb-1 text-sm font-medium">{n.title}</div>
              {n.content && <div className="mb-1.5 line-clamp-2 text-[13px] text-muted">{n.content}</div>}
              <div className="text-[11px] text-subtle">
                {n.members?.name ?? "운영진"} · {formatDateKo(n.created_at.slice(0, 10)).short}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
