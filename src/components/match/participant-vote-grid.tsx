"use client";

import { useTransition } from "react";
import { CircleCheck, Crown, Trophy } from "lucide-react";
import { voteMvp } from "@/lib/actions/votes";
import { toast } from "@/lib/toast";
import { Avatar } from "@/components/ui/avatar";

type Participant = { id: string; name: string; number: number | null; badgeBg: string; badgeFg: string };
type Vote = {
  closed: boolean;
  canVote: boolean;
  myVote: string | null;
  counts: Record<string, number>;
  total: number;
  deadlineLabel: string | null;
};

export function ParticipantVoteGrid({
  matchId,
  participants,
  guests,
  vote,
}: {
  matchId: string;
  participants: Participant[];
  guests: { id: string; name: string }[];
  vote: Vote | null;
}) {
  const [pending, start] = useTransition();
  const votingOpen = !!vote && !vote.closed && vote.canVote;
  const inProgress = !!vote && !vote.closed;
  const maxCount = vote?.closed ? participants.reduce((m, p) => Math.max(m, vote.counts[p.id] ?? 0), 0) : 0;
  const winnerNames = vote?.closed && maxCount > 0 ? participants.filter((p) => (vote.counts[p.id] ?? 0) === maxCount).map((p) => p.name) : [];

  return (
    <div>
      {/* MOM 투표 박스 (진행중이면 글로우) */}
      {vote && (
        <div className={`mb-3 flex items-center gap-3 rounded-2xl px-4 py-3 ${inProgress ? "mom-glow border border-[#efbf6a] bg-[#fff8ee]" : "border border-divider bg-sunken"}`}>
          <Trophy size={22} className={inProgress ? "text-[#e8912b]" : "text-muted"} />
          <div className="min-w-0 flex-1">
            <div className={`flex items-center gap-1.5 text-[14px] font-extrabold ${inProgress ? "text-[#7a4f0c]" : "text-fg"}`}>
              {inProgress ? "MOM 투표" : "MOM 투표 마감"}
              {inProgress && <span className="h-[7px] w-[7px] rounded-full bg-[#e8912b]" style={{ boxShadow: "0 0 0 3px rgba(232,145,43,.2)" }} />}
            </div>
            <div className={`mt-0.5 truncate text-[11px] ${inProgress ? "text-[#a5793a]" : "text-subtle"}`}>
              {inProgress
                ? `${vote.deadlineLabel ? `${vote.deadlineLabel} 마감 · ` : ""}${votingOpen ? "탭해서 투표" : "참석자만 투표"}`
                : winnerNames.length
                  ? `오늘의 MOM · ${winnerNames.join(", ")}`
                  : "투표 없이 마감"}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-[22px] font-extrabold leading-none tabular-nums ${inProgress ? "text-[#e8912b]" : "text-fg"}`}>{vote.total}</div>
            <div className="mt-0.5 text-[10px] text-subtle">{inProgress ? "현재 표" : "총 표"}</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {participants.map((p) => {
          const c = vote?.counts[p.id] ?? 0;
          const mine = vote?.myVote === p.id;
          const winner = !!vote?.closed && maxCount > 0 && c === maxCount;
          const gold = (votingOpen && mine) || winner;
          const inner = (
            <>
              {p.number != null ? (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-medium" style={{ background: p.badgeBg, color: p.badgeFg }}>{p.number}</div>
              ) : (
                <Avatar size={28} />
              )}
              <span className="flex-1 truncate text-left text-[13px]">{p.name}</span>
              {votingOpen ? (
                mine ? <span className="text-[13px] font-extrabold text-[#ef9f27]">✓</span> : null
              ) : vote?.closed ? (
                <span className="flex items-center gap-1">
                  {winner && <Crown size={13} className="text-[#ef9f27]" />}
                  <span className="text-[12px] font-medium text-muted">{c}</span>
                </span>
              ) : (
                <CircleCheck size={16} className="text-[#1d9e75]" />
              )}
            </>
          );
          const cls = `flex items-center gap-2 rounded-[10px] border px-2.5 py-2 ${gold ? "border-[#ef9f27] bg-[#ef9f27]/10" : "border-divider bg-card"}`;
          return votingOpen ? (
            <button key={p.id} disabled={pending} onClick={() => start(async () => { await voteMvp(matchId, p.id); toast(`${p.name}에게 투표했어요`); })} className={cls}>
              {inner}
            </button>
          ) : (
            <div key={p.id} className={cls}>{inner}</div>
          );
        })}
        {guests.map((g) => (
          <div key={g.id} className="flex items-center gap-2 rounded-[10px] border border-dashed border-line bg-card px-2.5 py-2">
            <Avatar size={28} guest />
            <span className="flex-1 truncate text-[13px]">{g.name} <span className="text-[10px] text-faint">용병</span></span>
            <CircleCheck size={16} className="text-[#1d9e75]" />
          </div>
        ))}
      </div>

    </div>
  );
}
