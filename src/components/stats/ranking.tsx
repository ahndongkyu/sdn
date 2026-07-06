"use client";

import { useState } from "react";
import { POSITION_BADGE } from "@/lib/mock";
import type { MemberStat } from "@/lib/data/stats";
import { Avatar } from "@/components/ui/avatar";

const TABS: { label: string; unit: string; get: (s: MemberStat) => number; sub?: (s: MemberStat) => string }[] = [
  { label: "득점왕", unit: "골", get: (s) => s.goals },
  { label: "도움왕", unit: "도움", get: (s) => s.assists },
  { label: "공격P", unit: "P", get: (s) => s.attackPoints },
  { label: "출석왕", unit: "경기", get: (s) => s.games, sub: (s) => `${s.attendRate}%` },
  { label: "MOM", unit: "회", get: (s) => s.mvp },
];

export function RankingList({ stats }: { stats: MemberStat[] }) {
  const [tab, setTab] = useState(0);
  const t = TABS[tab];
  const ranked = [...stats].filter((s) => t.get(s) > 0).sort((a, b) => t.get(b) - t.get(a));

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 overflow-x-auto">
        {TABS.map((tb, i) => (
          <button
            key={tb.label}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-[20px] px-3.5 py-1.5 text-xs ${i === tab ? "bg-red text-white" : "border border-divider bg-card text-muted"}`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] text-muted">
          아직 {t.label} 기록이 없어요.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-divider bg-card soft-card">
          {ranked.map((s, i) => {
            const badge = POSITION_BADGE[s.position1];
            const top = i === 0;
            return (
              <div key={s.id} className={`flex items-center gap-2.5 px-3 py-2.5 ${i < ranked.length - 1 ? "border-b border-divider" : ""}`}>
                <span
                  className={`flex h-[19px] w-[19px] items-center justify-center rounded-full text-center ${top ? "text-[12px] font-extrabold" : "text-[13px] text-subtle"}`}
                  style={top ? { background: "var(--sdn-pink)", color: "#6d1832" } : undefined}
                >
                  {i + 1}
                </span>
                <Avatar size={30} />
                <span className="flex-1 text-sm">{s.name}</span>
                <span className="rounded-[10px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{s.position1}</span>
                <span className="text-right text-sm font-medium">
                  {t.get(s)}{t.unit}
                  {t.sub && <span className="ml-1 text-[11px] text-subtle">{t.sub(s)}</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
