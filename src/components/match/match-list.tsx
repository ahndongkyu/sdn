"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { formatDateKo, dday } from "@/lib/format";
import type { MatchRow } from "@/lib/data/matches";

function past(m: MatchRow) {
  const today = new Date().toISOString().slice(0, 10);
  return m.score_for !== null || m.match_date < today;
}

// 승/무/패 배지
function outcome(f: number | null, a: number | null) {
  if (f == null || a == null) return null;
  if (f > a) return { label: "승", color: "var(--color-win)" };
  if (f < a) return { label: "패", color: "var(--color-lose)" };
  return { label: "무", color: "var(--color-draw)" };
}

type Status = "all" | "upcoming" | "done" | "self";

export function MatchList({ matches }: { matches: MatchRow[] }) {
  const [month, setMonth] = useState<string>("all");
  const [status, setStatus] = useState<Status>("all");

  // 데이터에 존재하는 월 목록
  const months = useMemo(() => {
    const set = new Map<string, number>();
    for (const m of matches) {
      const key = m.match_date.slice(0, 7);
      set.set(key, (set.get(key) ?? 0) + 1);
    }
    return [...set.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [matches]);

  const filtered = useMemo(() => {
    return matches
      .filter((m) => (month === "all" ? true : m.match_date.slice(0, 7) === month))
      .filter((m) => {
        if (status === "all") return true;
        if (status === "self") return m.type === "self";
        if (status === "done") return past(m) && m.score_for !== null;
        if (status === "upcoming") return !past(m);
        return true;
      })
      .sort((a, b) => b.match_date.localeCompare(a.match_date));
  }, [matches, month, status]);

  const counts = {
    all: matches.length,
    upcoming: matches.filter((m) => !past(m)).length,
    done: matches.filter((m) => past(m) && m.score_for !== null).length,
    self: matches.filter((m) => m.type === "self").length,
  };

  // 월별 그룹 (filtered가 날짜 내림차순 → 그룹도 내림차순 유지)
  const groups = useMemo(() => {
    const curYear = new Date().getFullYear();
    const out: { key: string; label: string; items: MatchRow[] }[] = [];
    for (const m of filtered) {
      const key = m.match_date.slice(0, 7);
      let g = out.find((x) => x.key === key);
      if (!g) {
        const [y, mo] = key.split("-");
        const label = Number(y) === curYear ? `${Number(mo)}월` : `${y}년 ${Number(mo)}월`;
        g = { key, label, items: [] };
        out.push(g);
      }
      g.items.push(m);
    }
    return out;
  }, [filtered]);

  return (
    <div className="space-y-3">
      {/* 월별 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <MonthChip active={month === "all"} label="전체" count={matches.length} onClick={() => setMonth("all")} />
        {months.map(([key, cnt]) => (
          <MonthChip key={key} active={month === key} label={`${parseInt(key.slice(5), 10)}월`} count={cnt} onClick={() => setMonth(key)} />
        ))}
      </div>

      {/* 상태 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {([
          ["all", "전체", counts.all],
          ["upcoming", "예정", counts.upcoming],
          ["done", "완료", counts.done],
          ["self", "자체전", counts.self],
        ] as [Status, string, number][]).map(([v, label, cnt]) => (
          <button
            key={v}
            onClick={() => setStatus(v)}
            className={`shrink-0 rounded-[20px] px-3.5 py-1.5 text-xs ${status === v ? "bg-navy text-white" : "border border-divider bg-card text-muted"}`}
          >
            {label} {cnt}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">해당 조건의 경기가 없어요.</div>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              {/* 월 구분 헤더 */}
              <div className="mb-2 flex items-center gap-2 px-0.5">
                <span className="text-[13.5px] font-bold text-fg">{g.label}</span>
                <span className="text-[11px] text-subtle">{g.items.length}경기</span>
                <span className="h-px flex-1 bg-line" />
              </div>
              <div className="space-y-2">
          {g.items.map((m) => {
            const d = formatDateKo(m.match_date);
            const isPastM = past(m);
            const done = isPastM && m.score_for !== null;
            const oc = done && m.type !== "self" ? outcome(m.score_for, m.score_against) : null;
            return (
              <Link key={m.id} href={`/matches/${m.id}`} className="flex items-stretch gap-2.5">
                <div className="flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-divider bg-card py-1">
                  <span className="text-base font-medium leading-none">{new Date(m.match_date + "T00:00:00").getDate()}</span>
                  <span className="mt-0.5 text-[10px] text-subtle">{d.weekday}</span>
                </div>
                <div className={`flex flex-1 items-center gap-2 rounded-lg px-3 py-2.5 ${done ? "border border-divider bg-card" : "soft-card-lg bg-navy text-white"}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      {m.type === "self" && <span className={`rounded px-1.5 py-px text-[10px] ${done ? "bg-sunken text-muted" : "bg-white/10 text-navy-muted"}`}>자체</span>}
                      <span className={`text-[13px] font-medium ${done ? "" : "text-white"}`}>{m.type === "self" ? "자체전" : `vs ${m.opponent}`}</span>
                    </div>
                    <div className={`mt-0.5 text-[11px] ${done ? "text-muted" : "text-navy-muted"}`}>
                      <Calendar size={11} className="mr-1 inline align-[-1px]" />
                      {m.match_time ?? ""} {m.place ? `· ${m.place}` : ""}
                    </div>
                  </div>
                  {done ? (
                    <div className="flex items-center gap-1.5">
                      {oc && <span className="rounded-[8px] px-1.5 py-0.5 text-[11px] font-bold text-white" style={{ background: oc.color }}>{oc.label}</span>}
                      <span className="text-sm font-medium tabular-nums">{m.score_for}:{m.score_against}</span>
                    </div>
                  ) : (
                    <span className="rounded-[10px] bg-red px-2 py-0.5 text-[11px] font-medium text-white">{dday(m.match_date)}</span>
                  )}
                </div>
              </Link>
            );
          })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthChip({ active, label, count, onClick }: { active: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-lg px-3 py-1.5 text-center ${active ? "bg-navy text-white" : "border border-divider bg-card text-muted"}`}
    >
      <div className="text-[13px] font-medium leading-none">{label}</div>
      <div className={`mt-0.5 text-[10px] ${active ? "text-navy-muted" : "text-faint"}`}>{count}경기</div>
    </button>
  );
}
