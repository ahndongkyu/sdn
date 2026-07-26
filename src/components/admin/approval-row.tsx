"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AlertTriangle, Check, UserCheck, UserPlus, X } from "lucide-react";
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

type ApprovalMember = {
  id: string;
  name: string;
  position1: string;
  member_numbers: { uniform: string; number: number }[];
  recordGames: number;
  linked: boolean;
};

function numbersLabel(member: ApprovalMember) {
  return member.member_numbers
    .map(({ uniform, number }) => `${uniform} ${number}`)
    .join(" · ");
}

export function ApprovalRow({
  profile,
  members,
}: {
  profile: Profile;
  members: ApprovalMember[];
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, start] = useTransition();

  const selectedMember = useMemo(
    () => linkable.find((member) => member.id === memberId) ?? null,
    [linkable, memberId],
  );

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmOpen(false);
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen]);

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

  function handleConfirmLink() {
    if (!selectedMember) return;
    start(async () => {
      const result = await linkProfile(profile.id, selectedMember.id);
      if (!result.ok) {
        toast(result.message);
        return;
      }
      setConfirmOpen(false);
      toast(result.message);
    });
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
      <div className="mb-2 text-[11px] font-semibold text-muted">기존 회원 연결</div>
      <select value={memberId} onChange={(event) => setMemberId(event.target.value)} className="input mb-2 w-full text-[12px]">
        <option value="">연결할 기존 회원 선택…</option>
        {linkable.map((member) => (
          <option key={member.id} value={member.id}>
            {member.name} · {member.position1}{numbersLabel(member) ? ` · ${numbersLabel(member)}` : ""}
          </option>
        ))}
      </select>

      {selectedMember && (
        <div className="rounded-xl border border-accent bg-tint/60 p-2.5">
          <div className="flex items-center gap-2.5">
            <Avatar size={34} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold text-fg">
                <span>{selectedMember.name}</span>
                <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] text-accent">{selectedMember.position1}</span>
                {numbersLabel(selectedMember) && (
                  <span className="rounded-full bg-card px-1.5 py-0.5 text-[10px] text-muted">{numbersLabel(selectedMember)}</span>
                )}
              </div>
              <div className="mt-0.5 text-[11px] text-muted">기존 참여 {selectedMember.recordGames}경기</div>
            </div>
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white"><Check size={13} strokeWidth={3} /></span>
          </div>
        </div>
      )}

      <button
        disabled={!selectedMember || pending}
        onClick={() => setConfirmOpen(true)}
        className="mt-2 flex w-full items-center justify-center rounded-lg bg-navy py-2.5 text-[13px] font-bold text-white disabled:opacity-40"
      >
        기존 회원으로 연결
      </button>

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

      {confirmOpen && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[2px] sm:items-center sm:p-4" onClick={() => setConfirmOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby={`link-confirm-title-${profile.id}`} onClick={(event) => event.stopPropagation()} className="w-full max-w-[480px] rounded-t-[26px] bg-card px-4 pb-[max(24px,env(safe-area-inset-bottom))] pt-3 shadow-2xl sm:rounded-[26px]">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-start justify-between gap-3 px-1">
              <div>
                <h2 id={`link-confirm-title-${profile.id}`} className="text-[19px] font-extrabold tracking-[-0.035em] text-fg">기존 기록을 연결할까요?</h2>
                <p className="mt-1 text-[11px] leading-4 text-subtle">카카오 계정과 기존 회원 정보를 한 번에 연결합니다.</p>
              </div>
              <button type="button" onClick={() => setConfirmOpen(false)} aria-label="닫기" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-muted"><X size={17} /></button>
            </div>

            <div className="mt-5 rounded-xl border border-divider bg-sunken px-3 py-3">
              <div className="flex items-center gap-2.5">
                <Avatar size={34} />
                <div className="min-w-0 flex-1 text-[13px] font-bold text-fg">
                  {selectedMember.name}
                  <span className="mx-1.5 text-subtle">·</span>{selectedMember.position1}
                  {numbersLabel(selectedMember) && <><span className="mx-1.5 text-subtle">·</span>{numbersLabel(selectedMember)}</>}
                </div>
              </div>
            </div>
            <p className="mt-4 text-[14px] font-bold leading-6 text-fg">기존 기록 {selectedMember.recordGames}경기를 이 카카오 계정에 연결합니다.</p>
            <p className="mt-1 text-[11px] leading-4 text-subtle">기존 회원 명단과 경기 기록은 그대로 유지돼요.</p>

            <div className="mt-6 flex gap-2">
              <button type="button" disabled={pending} onClick={() => setConfirmOpen(false)} className="flex-1 rounded-[12px] border border-divider py-3.5 text-[14px] font-bold text-muted disabled:opacity-40">취소</button>
              <button type="button" disabled={pending} onClick={handleConfirmLink} className="flex-1 rounded-[12px] bg-navy py-3.5 text-[14px] font-extrabold text-white disabled:opacity-40">{pending ? "연결 중…" : "연결 확정"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
