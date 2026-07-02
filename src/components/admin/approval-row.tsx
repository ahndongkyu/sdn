"use client";

import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import { linkProfile } from "@/lib/actions/approvals";
import { toast } from "@/lib/toast";
import { Avatar } from "@/components/ui/avatar";

export function ApprovalRow({
  profile,
  members,
}: {
  profile: { id: string; kakao_nickname: string | null; claimed_name: string | null; email: string | null };
  members: { id: string; name: string; position1: string }[];
}) {
  // 입력한 이름과 같은 회원 자동 매칭 (동명이인이면 매칭 안 함)
  const matches = profile.claimed_name
    ? members.filter((m) => m.name === profile.claimed_name!.trim())
    : [];
  const autoMatch = matches.length === 1 ? matches[0] : null;

  const [memberId, setMemberId] = useState(autoMatch?.id ?? "");
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-divider bg-card soft-card p-3.5">
      <div className="mb-3 flex items-center gap-2.5">
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
            {profile.claimed_name
              ? `본인 입력 이름${profile.kakao_nickname ? ` · 카카오 ${profile.kakao_nickname}` : ""}`
              : profile.kakao_nickname
                ? "이름 미입력 · 카카오 로그인"
                : "카카오 로그인 · 승인 대기"}
          </div>
        </div>
      </div>

      {profile.claimed_name && matches.length > 1 && (
        <div className="mb-2 rounded-lg bg-sunken px-2.5 py-1.5 text-[11px] text-muted">
          동명이인 {matches.length}명 — 직접 선택해주세요
        </div>
      )}

      <div className="flex gap-2">
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="input flex-1">
          <option value="">연결할 회원 선택…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.position1})
            </option>
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
          className="shrink-0 rounded-lg bg-red px-4 text-[13px] font-medium text-white disabled:opacity-40"
        >
          연결
        </button>
      </div>
    </div>
  );
}
