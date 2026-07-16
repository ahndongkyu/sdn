import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone, Trash2 } from "lucide-react";
import { getNotice } from "@/lib/data/notices";
import { isManager } from "@/lib/data/auth";
import { deleteNotice } from "@/lib/actions/notices";
import { formatDateKo } from "@/lib/format";
import { noticeContentHtml } from "@/lib/notice-content";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [notice, manager] = await Promise.all([getNotice(id), isManager()]);
  if (!notice) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/notices" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">공지사항</span>
        </Link>
        {manager && (
          <form action={deleteNotice}>
            <input type="hidden" name="id" value={id} />
            <ConfirmSubmit message="이 공지를 삭제하시겠습니까?" className="flex h-9 w-9 items-center justify-center rounded-full border border-danger/30 bg-card text-danger">
              <Trash2 size={15} /><span className="sr-only">공지 삭제</span>
            </ConfirmSubmit>
          </form>
        )}
      </div>

      <article className="overflow-hidden rounded-[20px] border border-divider bg-card soft-card">
        <header className="notice-detail-header px-5 pb-5 pt-5">
          <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-[13px] bg-accent text-white btn-glow"><Megaphone size={18} /></span>
          <h1 className="text-[20px] font-extrabold leading-7 tracking-[-0.025em] text-fg">{notice.title}</h1>
          <div className="mt-3 text-[11px] text-subtle">
            {notice.members?.name ?? "운영진"} · {formatDateKo(notice.created_at.slice(0, 10)).full}
          </div>
        </header>
        <div className="border-t border-divider px-5 py-5">
          <div className="notice-content" dangerouslySetInnerHTML={{ __html: noticeContentHtml(notice.content) }} />
        </div>
      </article>
    </div>
  );
}
