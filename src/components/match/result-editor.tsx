"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Check } from "lucide-react";
import { saveScore, addGoal } from "@/lib/actions/results";
import { toast } from "@/lib/toast";

type Pool = { id: string; name: string }[];

export function ScoreEditor({ matchId, initialFor, initialAgainst }: { matchId: string; initialFor: number; initialAgainst: number }) {
  const [f, setF] = useState(initialFor);
  const [a, setA] = useState(initialAgainst);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="soft-card-lg rounded-2xl bg-navy p-4 text-white">
      <div className="mb-3 flex items-center justify-around">
        <Stepper label="SDN" value={f} onChange={setF} />
        <span className="text-lg text-navy-muted">:</span>
        <Stepper label="상대" value={a} onChange={setA} />
      </div>
      <button
        disabled={pending}
        onClick={() =>
          start(async () => {
            await saveScore(matchId, f, a);
            router.push(`/matches/${matchId}?toast=${encodeURIComponent("결과가 저장됐어요")}`);
          })
        }
        className="btn-glow w-full rounded-lg bg-red py-2.5 text-[13px] font-medium disabled:opacity-60"
      >
        스코어 저장하고 완료
      </button>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="text-center">
      <div className="mb-2 text-[11px] text-navy-muted">{label}</div>
      <div className="flex items-center gap-2.5">
        <button onClick={() => onChange(Math.max(0, value - 1))} className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10"><Minus size={15} /></button>
        <span className="w-6 text-center text-[26px] font-medium leading-none">{value}</span>
        <button onClick={() => onChange(value + 1)} className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10"><Plus size={15} /></button>
      </div>
    </div>
  );
}

export function GoalAdder({ matchId, pool }: { matchId: string; pool: Pool }) {
  const [scorer, setScorer] = useState<string | null>(null);
  const [assist, setAssist] = useState<string | null>(null);
  const [own, setOwn] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-red/40 bg-card soft-card p-3.5">
      <div className="mb-2.5 text-[13px] font-medium">득점 추가</div>

      {/* 자책골 토글 */}
      <button
        onClick={() => { setOwn((v) => !v); setScorer(null); setAssist(null); }}
        className={`mb-3 flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[12.5px] font-medium ${own ? "border-[#e8b98a] bg-[#fbeee0] text-[#a5641a]" : "border-line bg-sunken text-muted"}`}
      >
        <span className={`flex h-4 w-4 items-center justify-center rounded-[5px] border ${own ? "border-[#e8912b] bg-[#e8912b]" : "border-line"}`}>
          {own && <Check size={12} className="text-white" />}
        </span>
        자책골 <span className="text-faint">(상대 자책 → 우리 득점)</span>
      </button>

      {!own && (pool.length === 0 ? (
        <div className="mb-3.5 rounded-lg bg-sunken px-4 py-4 text-center text-[12px] text-subtle">참석자가 있어야 득점자를 고를 수 있어요.</div>
      ) : (
        <>
          <div className="mb-1.5 text-[12px] text-muted">득점자</div>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {pool.map((p) => (
              <Chip key={p.id} label={p.name} active={scorer === p.id} activeBg="#dc2f3c" onClick={() => setScorer(p.id === scorer ? null : p.id)} />
            ))}
          </div>

          <div className="mb-1.5 text-[12px] text-muted">도움 <span className="text-faint">(선택)</span></div>
          <div className="mb-3.5 flex flex-wrap gap-1.5">
            <Chip label="없음" active={assist === null} activeBg="#888780" onClick={() => setAssist(null)} />
            {pool.filter((p) => p.id !== scorer).map((p) => (
              <Chip key={p.id} label={p.name} active={assist === p.id} activeBg="#185fa5" onClick={() => setAssist(p.id === assist ? null : p.id)} />
            ))}
          </div>
        </>
      ))}

      <button
        disabled={pending || (!own && !scorer)}
        onClick={() => start(async () => {
          await addGoal(matchId, own ? null : scorer, own ? null : assist, own);
          toast(own ? "자책골이 추가됐어요" : "득점이 추가됐어요");
          setScorer(null); setAssist(null); setOwn(false);
        })}
        className="w-full rounded-lg bg-navy py-2.5 text-[13px] font-medium text-white disabled:opacity-40"
      >
        <Plus size={15} className="mr-1 inline align-[-2px]" /> {own ? "자책골 추가" : "이 득점 추가"}
      </button>
    </div>
  );
}

function Chip({ label, active, activeBg, activeFg = "#fff", onClick }: { label: string; active: boolean; activeBg: string; activeFg?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[13px]"
      style={active ? { background: activeBg, color: activeFg } : { background: "var(--sdn-surface-2)", border: "1px solid var(--sdn-border)", color: "var(--sdn-muted)" }}
    >
      {label}
    </button>
  );
}
