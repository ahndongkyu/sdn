"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Shirt, Lock, ChevronDown } from "lucide-react";
import { setAttendance } from "@/lib/actions/matches";
import { toast } from "@/lib/toast";

type Status = "going" | "notGoing" | "undecided";

const OPTS: { v: Status; label: string; bg: string }[] = [
  { v: "going", label: "참석", bg: "var(--vote-going)" },
  { v: "undecided", label: "미정", bg: "var(--vote-draw)" },
  { v: "notGoing", label: "불참", bg: "var(--vote-lose)" },
];

export function NextMatchActions({
  matchId,
  current,
  hasLineup,
}: {
  matchId: string;
  current: Status;
  hasLineup: boolean;
}) {
  const [status, setStatus] = useState<Status>(current);
  const [chosen, setChosen] = useState(current !== "undecided");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const cur = OPTS.find((o) => o.v === status)!;

  function pick(v: Status) {
    setStatus(v);
    setChosen(true);
    setOpen(false);
    start(async () => {
      await setAttendance(matchId, v);
      toast(`${OPTS.find((o) => o.v === v)!.label}(으)로 체크됐어요`);
    });
  }

  // 펼침: 참석/미정/불참 3버튼
  if (open) {
    return (
      <div className="flex gap-2">
        {OPTS.map((o) => {
          const active = chosen && status === o.v;
          return (
            <button
              key={o.v}
              disabled={pending}
              onClick={() => pick(o.v)}
              className="flex-1 rounded-[12px] py-2.5 text-[13px] font-bold disabled:opacity-60"
              style={active ? { background: o.bg, color: "#fff" } : { background: "var(--sdn-surface-2)", color: "var(--sdn-muted)" }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    );
  }

  // 접힘: [참석 투표하기 / 내 상태] + [라인업]
  return (
    <div className="flex gap-2">
      <button
        onClick={() => setOpen(true)}
        className="flex flex-1 items-center justify-center gap-1 rounded-[12px] py-2.5 text-[13px] font-bold"
        style={chosen ? { background: cur.bg, color: "#fff" } : { background: "var(--sdn-blue-tint)", color: "var(--sdn-blue-tint-tx)" }}
      >
        {chosen ? cur.label : "참석 투표하기"}
        <ChevronDown size={14} className="opacity-70" />
      </button>

      {hasLineup ? (
        <Link
          href={`/matches/${matchId}/formation`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-tint py-2.5 text-[13px] font-bold text-accent"
        >
          <Shirt size={15} /> 라인업
        </Link>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-sunken py-2.5 text-[13px] font-medium text-subtle">
          <Lock size={14} /> 라인업 준비중
        </div>
      )}
    </div>
  );
}
