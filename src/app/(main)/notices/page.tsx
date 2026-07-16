import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { getNotices } from "@/lib/data/notices";
import { getMyProfile } from "@/lib/data/auth";
import { formatDateKo } from "@/lib/format";
import { noticePlainText } from "@/lib/notice-content";

export default async function NoticesPage() {
  const [notices, profile] = await Promise.all([getNotices(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <div>
            <h1 className="text-lg font-medium">공지사항</h1>
            <p className="mt-0.5 text-[11px] text-subtle">팀의 중요한 소식을 확인하세요</p>
          </div>
        </Link>
        {isManager && (
          <Link href="/admin/notices/new" className="btn-glow flex items-center gap-1 rounded-[10px] bg-accent px-3 py-2 text-xs font-bold text-white">
            <Plus size={15} /> 작성
          </Link>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-borderblue bg-card px-4 py-12 text-center">
          <div className="text-[13px] font-bold text-fg">아직 등록된 공지가 없어요</div>
          <div className="mt-1 text-[11px] text-subtle">새로운 팀 소식이 등록되면 여기에 표시됩니다</div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-divider bg-card soft-card">
          {notices.map((notice, index) => (
            <Link
              key={notice.id}
              href={`/notices/${notice.id}`}
              className={`tap block px-3.5 py-3 ${index < notices.length - 1 ? "border-b border-divider" : ""}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <strong className="truncate text-[13.5px] font-bold text-fg">{notice.title}</strong>
                {index === 0 && <span className="shrink-0 rounded-full bg-tint px-1.5 py-0.5 text-[9px] font-bold text-accent">최신</span>}
              </div>
              {notice.content && <p className="mt-1 truncate text-[11.5px] text-muted">{noticePlainText(notice.content)}</p>}
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-subtle">
                <span>{notice.members?.name ?? "운영진"}</span>
                <span>·</span>
                <span>{formatDateKo(notice.created_at.slice(0, 10)).short}</span>
                <span>·</span>
                <span>조회 {notice.view_count.toLocaleString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
