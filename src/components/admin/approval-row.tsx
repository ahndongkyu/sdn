"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, UserCheck, UserPlus, X } from "lucide-react";
import { linkProfile, createMemberFromSignup, rejectSignup } from "@/lib/actions/approvals";
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
  members: { id: string; name: string; position1: string; linked: boolean }[];
}) {
  // 같은 이름의 활성 명단은 연결 여부와 무관하게 모두 확인한다.
  const matches = profile.claimed_name
    ? members.filter((m) => m.name === profile.claimed_name!.trim())
    : [];
  const linkable = members.filter((m) => !m.linked);
  const linkableMatches = matches.filter((m) => !m.linked);
  const connectedMatches = matches.filter((m) => m.linked);
  const autoMatch = linkableMatches.length === 1 ? linkableMatches[0] : null;
  const hasSameName = matches.length > 0;

  const [memberId, setMemberId] = useState(autoMatch?.id ?? "");
  const [pending, start] = useTransition();

  const pos = [profile.claimed_position1, profile.claimed_position2].filter(Boolean).join(" · ");
  const nums = [
    profile.claimed_num_red != null ? `빨검 ${profile.claimed_num_red}` : null,
    profile.claimed_num_blue != null ? `파랑 ${profile.claimed_num_blue}` : null,
  ].filter(Boolean).join(" · ");

  function handleReject() {
    const name = profile.claimed_name ?? profile.kakao_nickname ?? "이 신청";
    if (!window.confirm(`${name}의 가입 신청을 거절할까요?`)) return;
    start(async () => {
      const result = await rejectSignup(profile.id);
      toast(result.message);
    });
  }

  function handleCreate() {
    const run = async (allowSameName: boolean) => {
      const result = await createMemberFromSignup(profile.id, allowSameName);
      toast(result.message);
    };

    if (hasSameName) {
      const name = profile.claimed_name ?? profile.kakao_nickname ?? "이 신청";
      if (!window.confirm(`${name} 이름의 기존 회원이 있어요. 기존 회원과 다른 동명이인일 때만 신규 등록하세요.`)) return;
      start(() => run(true));
      return;
    }
    start(() => run(false));
  }

  return (
    <div className="rounded-xl border border-divider bg-card soft-card p-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <Avatar size={36} />
        <div className="flex-1">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            {profile.claimed_name ?? profile.kakao_nickname ?? "카카오 사용자"}
            {autoMatch && (
              <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2 py-0.5 text-[10px] font-bold text-accent">
                <UserCheck size={11} /> 연결 후보
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

      {connectedMatches.length > 0 && (
        <div className="mb-2 flex items-start gap-1.5 rounded-lg border border-[#e8912b]/30 bg-[#e8912b]/10 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-[#a5641a]" />
          <span><b className="text-fg">{connectedMatches.map((m) => `${m.name} (${m.position1})`).join(", ")}</b> 회원은 이미 다른 카카오 계정과 연결돼 있어요. 같은 사람이라면 기존 계정 여부를 먼저 확인하세요.</span>
        </div>
      )}

      {/* 기존 회원과 연결 */}
      <div className="mb-2 text-[11px] font-semibold text-muted">기존 명단과 연결</div>
      <div className="flex gap-2">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input flex-1">
          <option value="">연결할 회원 선택…</option>
          {linkable.map((m) => (
            <option key={m.id} value={m.id}>{m.name} ({m.position1})</option>
          ))}
        </select>
        <button
          disabled={!memberId || pending}
          onClick={() =>
            start(async () => {
              const name = members.find((m) => m.id === memberId)?.name ?? "";
              const result = await linkProfile(profile.id, memberId);
              toast(result.ok ? `${name}(으)로 연결됐어요` : result.message);
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
      <div className="grid grid-cols-2 gap-2">
        <button
          disabled={pending || !profile.claimed_name}
          onClick={handleCreate}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-red py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
        >
          <UserPlus size={15} /> {hasSameName ? "동명이인 신규 등록" : "새 회원 등록"}
        </button>
        <button
          disabled={pending}
          onClick={handleReject}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-danger/40 py-2.5 text-[13px] font-bold text-danger disabled:opacity-40"
        >
          <X size={15} /> 가입 거절
        </button>
      </div>
    </div>
  );
}
