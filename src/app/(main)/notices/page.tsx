import Link from "next/link";
import { ArrowLeft, ChevronRight, Megaphone, Plus } from "lucide-react";
import { getNotices } from "@/lib/data/notices";
import { getMyProfile } from "@/lib/data/auth";
import { formatDateKo } from "@/lib/format";
import { noticePlainText } from "@/lib/notice-content";

export default async function NoticesPage() {
  const [notices, profile] = await Promise.all([getNotices(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";
  const latest = notices[0] ?? null;
  const previous = notices.slice(1);

  return (
    <div className="space-y-5">
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

      {!latest ? (
        <div className="rounded-[18px] border border-dashed border-borderblue bg-card px-4 py-14 text-center text-[13px] text-muted">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-tint text-accent"><Megaphone size={20} /></span>
          <div className="font-bold text-fg">아직 등록된 공지가 없어요</div>
          <div className="mt-1 text-[11px] text-subtle">새로운 팀 소식이 등록되면 여기에 표시됩니다</div>
        </div>
      ) : (
        <>
          <Link href={`/notices/${latest.id}`} className="notice-featured tap block p-5">
            <div className="relative flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-accent text-white btn-glow"><Megaphone size={18} /></span>
              <ChevronRight size={17} className="mt-2.5 shrink-0 text-accent" />
            </div>
            <div className="relative mt-4">
              <h2 className="text-[17px] font-extrabold tracking-[-0.02em] text-fg">{latest.title}</h2>
              {latest.content && <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-muted">{noticePlainText(latest.content)}</p>}
              <div className="mt-3 text-[10.5px] text-subtle">
                {latest.members?.name ?? "운영진"} · {formatDateKo(latest.created_at.slice(0, 10)).full}
              </div>
            </div>
          </Link>

          {previous.length > 0 && (
            <section>
              <div className="mb-2.5 flex items-center gap-1.5 px-0.5">
                <h2 className="text-[13.5px] font-bold text-fg">지난 공지</h2>
                <span className="text-[11px] text-subtle">{previous.length}개</span>
              </div>
              <div className="overflow-hidden rounded-[16px] border border-divider bg-card soft-card">
                {previous.map((notice, index) => (
                  <Link key={notice.id} href={`/notices/${notice.id}`} className={`tap grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3.5 py-3.5 ${index < previous.length - 1 ? "border-b border-divider" : ""}`}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-tint text-accent"><Megaphone size={15} /></span>
                    <span className="min-w-0">
                      <strong className="block truncate text-[13.5px] font-bold text-fg">{notice.title}</strong>
                      {notice.content && <span className="mt-1 block truncate text-[11.5px] text-muted">{noticePlainText(notice.content)}</span>}
                      <span className="mt-1 block text-[10px] text-subtle">{notice.members?.name ?? "운영진"} · {formatDateKo(notice.created_at.slice(0, 10)).short}</span>
                    </span>
                    <ChevronRight size={15} className="text-faint" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
