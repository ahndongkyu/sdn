import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { getNotice } from "@/lib/data/notices";
import { isManager } from "@/lib/data/auth";
import { deleteNotice } from "@/lib/actions/notices";
import { formatDateKo } from "@/lib/format";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [n, manager] = await Promise.all([getNotice(id), isManager()]);
  if (!n) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/notices" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">공지</span>
        </Link>
        {manager && (
          <form action={deleteNotice}>
            <input type="hidden" name="id" value={id} />
            <button className="flex items-center gap-1 rounded-lg border border-danger/40 px-2.5 py-1.5 text-xs text-danger">
              <Trash2 size={13} /> 삭제
            </button>
          </form>
        )}
      </div>

      <div className="rounded-xl border border-divider bg-card soft-card p-4">
        <h1 className="mb-1.5 text-[17px] font-medium">{n.title}</h1>
        <div className="mb-4 text-[11px] text-subtle">
          {n.members?.name ?? "운영진"} · {formatDateKo(n.created_at.slice(0, 10)).full}
        </div>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg">{n.content ?? ""}</div>
      </div>
    </div>
  );
}
