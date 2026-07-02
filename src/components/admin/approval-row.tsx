"use client";

import { useState, useTransition } from "react";
import { linkProfile } from "@/lib/actions/approvals";
import { toast } from "@/lib/toast";
import { Avatar } from "@/components/ui/avatar";

export function ApprovalRow({
  profile,
  members,
}: {
  profile: { id: string; kakao_nickname: string | null; email: string | null };
  members: { id: string; name: string; position1: string }[];
}) {
  const [memberId, setMemberId] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-divider bg-card soft-card p-3.5">
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar size={36} />
        <div className="flex-1">
          <div className="text-sm font-medium">{profile.kakao_nickname ?? "카카오 사용자"}</div>
          <div className="text-[11px] text-subtle">{profile.email ?? "카카오 로그인 · 승인 대기"}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
          className="input flex-1"
        >
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
