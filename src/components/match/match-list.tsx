"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, ChevronDown } from "lucide-react";
import { formatDateKo, dday } from "@/lib/format";
import type { MatchRow } from "@/lib/data/matches";

function past(m: MatchRow) {
  const today = new Date().toISOString().slice(0, 10);
  return m.score_for !== null || m.match_date < today;
}

// 승/무/패
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
  const [openState, setOpenState] = useState<Record<string, boolean>>({});

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

  // 전체 보기(월·상태 필터 없음)일 때만 아코디언 — 최근 2개월 펼침, 나머지 접힘
  const accordion = month === "all" && status === "all";
  const isOpen = (key: string, idx: number) => (accordion ? openState[key] ?? idx < 2 : true);
  const toggle = (key: string, idx: number) => setOpenState((s) => ({ ...s, [key]: !(s[key] ?? idx < 2) }));

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
        <div className="space-y-3">
          {groups.map((g, gi) => {
            const open = isOpen(g.key, gi);
            return (
              <div key={g.key}>
                {/* 월 헤더 (탭하면 접기/펼치기) */}
                <button
                  onClick={() => toggle(g.key, gi)}
                  disabled={!accordion}
                  className="mb-2 flex w-full items-center gap-2 px-0.5 disabled:cursor-default"
                >
                  <span className="text-[13.5px] font-bold text-fg">{g.label}</span>
                  <span className="text-[11px] text-subtle">{g.items.length}경기</span>
                  <span className="h-px flex-1 bg-line" />
                  {accordion && <ChevronDown size={16} className={`text-subtle transition-transform ${open ? "" : "-rotate-90"}`} />}
                </button>

                {open && (
                  <div className="space-y-2">
                    {g.items.map((m) => (
                      <MatchRowCard key={m.id} m={m} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MatchRowCard({ m }: { m: MatchRow }) {
  const d = formatDateKo(m.match_date);
  const day = new Date(m.match_date + "T00:00:00").getDate();
  const done = past(m) && m.score_for !== null;
  const oc = done && m.type !== "self" ? outcome(m.score_for, m.score_against) : null;
  const title = m.type === "self" ? "자체전" : `vs ${m.opponent}`;
  const barColor = !done ? "var(--sdn-accent)" : oc ? oc.color : "var(--sdn-border)";

  return (
    <Link
      href={`/matches/${m.id}`}
      className={`relative flex items-center gap-3 overflow-hidden rounded-[13px] py-2.5 pl-3.5 pr-3 ${
        done ? "border border-divider bg-card" : "soft-card-lg bg-navy text-white"
      }`}
    >
      {/* 좌측 결과 컬러 바 */}
      <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: barColor }} aria-hidden />

      <div className="w-7 shrink-0 text-center">
        <div className="text-[17px] font-extrabold leading-none tabular-nums">{day}</div>
        <div className={`mt-0.5 text-[10px] ${done ? "text-subtle" : "text-navy-muted"}`}>{d.weekday}</div>
      </div>

      <div className="min-w-0 flex-1">
        <div className={`truncate text-[13.5px] font-bold ${done ? "" : "text-white"}`}>{title}</div>
        <div className={`mt-0.5 text-[11px] ${done ? "text-subtle" : "text-navy-muted"}`}>
          <Calendar size={11} className="mr-1 inline align-[-1px]" />
          {m.match_time ?? ""} {m.place ? `· ${m.place}` : ""}
        </div>
      </div>

      {done ? (
        <div className="flex shrink-0 items-center gap-1.5">
          {oc && <span className="text-[11px] font-extrabold" style={{ color: oc.color }}>{oc.label}</span>}
          <span className="min-w-[50px] text-right text-[15px] font-extrabold tabular-nums" style={oc ? { color: oc.color } : undefined}>
            {m.score_for} : {m.score_against}
          </span>
        </div>
      ) : (
        <span className="shrink-0 rounded-[10px] bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white">{dday(m.match_date)}</span>
      )}
    </Link>
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
