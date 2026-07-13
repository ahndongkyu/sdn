import Link from "next/link";
import { ArrowLeft, UserPlus, Pencil } from "lucide-react";
import { getMembers } from "@/lib/data/members";
import { POSITION_BADGE } from "@/lib/mock";

export default async function AdminMembersPage() {
  const members = await getMembers();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Link href="/more" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <h1 className="text-[15px] font-medium">회원 관리 <span className="text-[13px] text-subtle">{members.length}명</span></h1>
        </Link>
        <Link href="/admin/members/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
          <UserPlus size={14} /> 회원 등록
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-card soft-card">
        {members.map((m, i) => {
          const badge = POSITION_BADGE[m.position1];
          return (
            <Link
              key={m.id}
              href={`/members/${m.id}/edit`}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < members.length - 1 ? "border-b border-divider" : ""}`}
            >
              <span className="shrink-0 rounded-[8px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{m.position1}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                {m.name}
                {m.role !== "member" && <span className="ml-1.5 rounded bg-red px-1.5 py-px text-[9px] text-white">{m.title ?? "운영진"}</span>}
              </span>
              <Pencil size={14} className="shrink-0 text-faint" />
            </Link>
          );
        })}
      </div>
      <p className="mt-3 text-center text-[11px] text-subtle">이름을 탭하면 수정·삭제할 수 있어요.</p>
    </div>
  );
}
