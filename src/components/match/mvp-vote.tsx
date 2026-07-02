"use client";

import { useTransition } from "react";
import { Crown } from "lucide-react";
import { voteMvp } from "@/lib/actions/votes";
import { toast } from "@/lib/toast";
import { Avatar } from "@/components/ui/avatar";

export function MvpVote({
  matchId,
  pool,
  counts,
  myVote,
  total,
  canVote,
  closed,
  deadline,
}: {
  matchId: string;
  pool: { id: string; name: string }[];
  counts: Record<string, number>;
  myVote: string | null;
  total: number;
  canVote: boolean;
  closed: boolean;
  deadline: string | null;
}) {
  const [pending, start] = useTransition();

  const maxCount = pool.reduce((m, p) => Math.max(m, counts[p.id] ?? 0), 0);
  const winners = closed && maxCount > 0 ? pool.filter((p) => (counts[p.id] ?? 0) === maxCount) : [];
  const deadlineLabel = deadline
    ? new Date(deadline).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] text-muted">
          <Crown size={14} className="mr-1 inline align-[-2px] text-[#ef9f27]" /> MOM 투표
        </h2>
        <span className="text-[11px] text-subtle">
          {closed ? `마감 · ${total}표` : deadlineLabel ? `${deadlineLabel} 마감 · ${total}명 참여` : `${total}명 참여`}
        </span>
      </div>

      {pool.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-5 text-center text-[12px] text-subtle">참석자가 있어야 투표할 수 있어요.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {pool.map((p) => {
            const mine = myVote === p.id;
            const isWinner = winners.some((w) => w.id === p.id);
            const c = counts[p.id] ?? 0;
            const highlight = isWinner || (mine && !closed) ? "border-[#ef9f27] bg-[#ef9f27]/15" : "border-divider bg-card";
            return (
              <button
                key={p.id}
                disabled={pending || !canVote || closed}
                onClick={() => start(async () => { await voteMvp(matchId, p.id); toast(`${p.name}에게 투표했어요`); })}
                className={`flex items-center gap-2 rounded-[10px] border px-2.5 py-2 text-left disabled:opacity-100 ${highlight}`}
              >
                <Avatar size={28} />
                <span className="flex-1 truncate text-[13px]">{p.name}</span>
                {isWinner && <Crown size={13} className="text-[#ef9f27]" />}
                {closed && <span className="text-[12px] font-medium text-muted">{c}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-2 text-center text-[11px] text-subtle">
        {closed
          ? winners.length > 0
            ? `MOM: ${winners.map((w) => w.name).join(", ")}`
            : "투표 없이 마감됐어요"
          : canVote
            ? "탭해서 투표 · 결과는 마감 후 공개"
            : "이 경기 참석자만 투표할 수 있어요"}
      </div>
    </div>
  );
}
