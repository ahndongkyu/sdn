"use client";

import { useState, useTransition } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { linkProfile, createMemberFromSignup } from "@/lib/actions/approvals";
import { toast } from "@/lib/toast";
import { Avatar } from "@/components/ui/avatar";

type Profile = {
  id: string;
  kakao_nickname: string | null;
  claimed_name: string | null;
  claimed_position1: string | null;
  claimed_position2: string | null;
  claimed_num_red: number | null;
  claimed_num_blue: number | null;
  email: string | null;
};

export function ApprovalRow({
  profile,
  members,
}: {
  profile: Profile;
  members: { id: string; name: string; position1: string }[];
}) {
  // 입력한 이름과 같은 회원 자동 매칭 (동명이인이면 매칭 안 함)
  const matches = profile.claimed_name
    ? members.filter((m) => m.name === profile.claimed_name!.trim())
    : [];
  const autoMatch = matches.length === 1 ? matches[0] : null;

  const [memberId, setMemberId] = useState(autoMatch?.id ?? "");
  const [pending, start] = useTransition();

  const pos = [profile.claimed_position1, profile.claimed_position2].filter(Boolean).join(" · ");
  const nums = [
    profile.claimed_num_red != null ? `빨검 ${profile.claimed_num_red}` : null,
    profile.claimed_num_blue != null ? `파랑 ${profile.claimed_num_blue}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="rounded-xl border border-divider bg-card soft-card p-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <Avatar size={36} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {profile.claimed_name ?? profile.kakao_nickname ?? "카카오 사용자"}
            {autoMatch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold text-accent">
                <UserCheck size={11} /> 자동 매칭
              </span>
            )}
          </div>
          <div className="text-[11px] text-subtle">
            {[pos || null, nums || null].filter(Boolean).join(" · ") || (profile.kakao_nickname ? `카카오 ${profile.kakao_nickname}` : "정보 미입력")}
          </div>
        </div>
      </div>

      {matches.length > 1 && (
        <div className="mb-2 rounded-lg bg-sunken px-2.5 py-1.5 text-[11px] text-muted">동명이인 {matches.length}명 — 직접 선택하세요</div>
      )}

      {/* 기존 회원과 연결 */}
      <div className="mb-2 text-[11px] font-semibold text-muted">기존 명단과 연결</div>
      <div className="flex gap-2">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input flex-1">
          <option value="">연결할 회원 선택…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.position1})</option>
          ))}
        </select>
        <button
          disabled={!memberId || pending}
          onClick={() =>
            start(async () => {
              const name = members.find((m) => m.id === memberId)?.name ?? "";
              await linkProfile(profile.id, memberId);
              toast(`${name}(으)로 연결됐어요`);
            })
          }
          className="shrink-0 rounded-lg bg-navy px-4 text-[13px] font-medium text-white disabled:opacity-40"
        >
          연결
        </button>
      </div>

      {/* 또는 신규 등록 */}
      <div className="my-2.5 flex items-center gap-2 text-[10px] text-faint">
        <span className="h-px flex-1 bg-divider" /> 명단에 없으면 <span className="h-px flex-1 bg-divider" />
      </div>
      <button
        disabled={pending || !profile.claimed_name}
        onClick={() =>
          start(async () => {
            await createMemberFromSignup(profile.id);
            toast(`${profile.claimed_name} 신규 회원으로 등록됐어요`);
          })
        }
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-red py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
      >
        <UserPlus size={15} /> 신청 정보로 새 회원 등록
      </button>
    </div>
  );
}
