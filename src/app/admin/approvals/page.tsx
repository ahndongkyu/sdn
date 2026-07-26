import Link from "next/link";
import { X } from "lucide-react";
import { getApprovalMembers, getPendingProfiles, getLinkedMemberIds } from "@/lib/data/approvals";
import { ApprovalRow } from "@/components/admin/approval-row";

export default async function ApprovalsPage() {
  const [pending, members, linked] = await Promise.all([
    getPendingProfiles(),
    getApprovalMembers(),
    getLinkedMemberIds(),
  ]);

  const approvalMembers = members.map((m) => ({
    id: m.id,
    name: m.name,
    position1: m.position1,
    member_numbers: m.member_numbers,
    recordGames: m.recordGames,
    linked: linked.has(m.id),
  }));

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center gap-2">
        <Link href="/more">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">가입 승인 <span className="text-[13px] text-subtle">{pending.length}</span></h1>
      </div>

      <p className="text-[11px] leading-relaxed text-muted">
        이름이 명단과 같으면 <span className="font-medium text-accent">연결 후보</span>를 먼저 확인하세요. 포지션·등번호·기존 참여 기록을 비교한 뒤 연결하고, 명단에 없거나 다른 동명이인일 때만 <span className="font-medium text-red">새 회원 등록</span>을 선택하세요.
      </p>

      {pending.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">
          승인 대기 중인 회원이 없어요.
        </div>
      ) : (
        <div className="space-y-2.5">
          {pending.map((p) => (
            <ApprovalRow key={p.id} profile={p} members={approvalMembers} />
          ))}
        </div>
      )}
    </div>
  );
}
