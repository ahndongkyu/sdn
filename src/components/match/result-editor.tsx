"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { saveMatchRecord, type GoalInput } from "@/lib/actions/results";
import type { GoalRow } from "@/lib/data/matches";

type Draft = { id?: string; scorer: string; assist: string };
const blank = (): Draft => ({ scorer: "", assist: "" });
const selectClass = "mt-1.5 min-h-12 w-full min-w-0 appearance-none rounded-xl border border-line bg-sunken bg-none px-3 text-base text-fg disabled:opacity-50";

export function ResultEditor({ matchId, opponent, initialFor, initialAgainst, revision, initialGoals, pool, names }: {
  matchId: string; opponent: string; initialFor: number; initialAgainst: number; revision: number;
  initialGoals: GoalRow[]; pool: { id: string; name: string }[]; names: Record<string, string>;
}) {
  const router = useRouter();
  const [scoreFor, setScoreFor] = useState(initialFor);
  const [scoreAgainst, setScoreAgainst] = useState(initialAgainst);
  const [rows, setRows] = useState<Draft[]>(() => {
    const existing = initialGoals.map((g) => ({ id: g.id, scorer: g.is_own_goal ? "own" : g.scorer_id ?? "unknown", assist: g.assist_pending ? "" : g.assist_id ?? "none" }));
    return [...existing, ...Array.from({ length: Math.max(0, initialFor - existing.length) }, blank)];
  });
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const entered = rows.filter((r) => r.scorer !== "" && r.scorer !== "unknown").length;
  const recorded = rows.filter((r) => r.scorer !== "").length;

  function updateScore(value: number) {
    setScoreFor(value);
    setRows((previous) => {
      const next = [...previous];
      while (next.length > value && !next[next.length - 1].scorer && !next[next.length - 1].id) next.pop();
      while (next.length < value) next.push(blank());
      return next;
    });
  }
  function updateRow(index: number, field: "scorer" | "assist", value: string) {
    setRows((previous) => previous.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, [field]: value };
      if (field === "scorer" && (next.scorer === "own" || !next.scorer)) next.assist = "";
      if (next.scorer === next.assist) next.assist = "";
      return next;
    }));
  }
  function removeRow(index: number) {
    if (rows[index].scorer && !window.confirm("이 득점 기록을 지울까요? 경기 기록 저장 시 반영됩니다.")) return;
    setRows((previous) => {
      const next = previous.filter((_, i) => i !== index);
      while (next.length < scoreFor) next.push(blank());
      return next;
    });
  }

  function save(scoreOnly: boolean) {
    setError("");
    if (!scoreOnly && recorded > scoreFor) {
      setError("득점 기록이 팀 점수보다 많아요. 점수를 올리거나 불필요한 득점 기록을 삭제해주세요."); return;
    }
    if (scoreOnly && !window.confirm("현재 점수만 저장할까요? 이번에 수정한 득점자·도움은 저장되지 않고, 기존 기록은 유지됩니다.")) return;
    const goals: GoalInput[] = rows.filter((r) => r.scorer).map((r) => ({
      id: r.id, scorer_id: ["own", "unknown"].includes(r.scorer) ? null : r.scorer,
      assist_id: r.scorer === "own" || !r.assist || r.assist === "none" ? null : r.assist,
      is_own_goal: r.scorer === "own", assist_pending: r.scorer !== "own" && !r.assist,
    }));
    if (!scoreOnly && initialGoals.some((g) => !goals.some((row) => row.id === g.id)) &&
      !window.confirm("지운 기존 득점 기록이 저장 시 삭제됩니다. 계속할까요?")) return;
    start(async () => {
      try {
        const result = await saveMatchRecord(matchId, scoreFor, scoreAgainst, revision, scoreOnly ? null : goals);
        if (!result.ok) { setError(result.message); return; }
        router.push(`/matches/${matchId}?toast=${encodeURIComponent(result.message)}`);
      } catch {
        setError("저장 결과를 확인하지 못했어요. 입력은 유지됩니다. 다시 시도하거나 새로고침으로 저장 상태를 확인해주세요.");
      }
    });
  }

  return (
    <div className="space-y-5">
      <fieldset disabled={pending} className="rounded-2xl border border-line bg-card p-4 disabled:opacity-60">
        <legend className="sr-only">최종 스코어</legend>
        <h2 className="text-sm font-bold">최종 스코어</h2>
        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-1">
          <Stepper label="SDN" value={scoreFor} onChange={updateScore} />
          <span className="text-xl text-muted">:</span>
          <Stepper label={opponent} value={scoreAgainst} onChange={setScoreAgainst} />
        </div>
      </fieldset>
      <div>
        <div className="mb-3 flex items-center justify-between gap-2"><h2 className="text-base font-bold">우리 팀 득점</h2><span aria-live="polite" className="text-xs text-muted">{entered} / {scoreFor}골 입력</span></div>
        {pool.length === 0 && scoreFor > 0 && <Link href={`/admin/matches/${matchId}/attendance`} className="mb-3 block rounded-xl bg-tint p-3 text-sm text-accent">참석자를 등록하면 득점자를 고를 수 있어요. 참석 관리 →</Link>}
        <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">
          <legend className="sr-only">득점별 선수 기록</legend>
          {rows.map((row, i) => (
            <div key={row.id ?? `new-${i}`} className="rounded-2xl border border-line bg-card p-4">
              <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-bold">{i + 1}번째 골</h3><button type="button" onClick={() => removeRow(i)} aria-label={`${i + 1}번째 득점 기록 삭제`} className="-my-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted"><Trash2 size={17} aria-hidden /></button></div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="min-w-0 text-xs text-muted">득점자
                  <select value={row.scorer} onChange={(e) => updateRow(i, "scorer", e.target.value)} className={selectClass} aria-label={`${i + 1}번째 골 득점자`}>
                    <option value="">선수 선택</option>
                    {pool.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    {row.scorer && !["own", "unknown"].includes(row.scorer) && !pool.some((p) => p.id === row.scorer) && <option value={row.scorer}>{names[row.scorer] ?? "기존 선수"} (기존 기록)</option>}
                    {row.scorer === "unknown" && <option value="unknown">기존 득점 · 선수 미상</option>}
                    <option value="own">상대 자책골</option>
                  </select>
                </label>
                <label className="min-w-0 text-xs text-muted">도움
                  <select value={row.scorer === "own" ? "none" : row.assist} disabled={!row.scorer || row.scorer === "own"} onChange={(e) => updateRow(i, "assist", e.target.value)} className={selectClass} aria-label={`${i + 1}번째 골 도움`}>
                    <option value="">나중에 확인</option><option value="none">도움 없음</option>
                    {pool.filter((p) => p.id !== row.scorer).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    {row.assist && row.assist !== "none" && !pool.some((p) => p.id === row.assist) && <option value={row.assist}>{names[row.assist] ?? "기존 선수"} (기존 기록)</option>}
                  </select>
                </label>
              </div>
            </div>
          ))}
        </fieldset>
        {scoreFor === 0 && rows.length === 0 && <p className="rounded-xl bg-card p-6 text-center text-sm text-muted">무득점 경기는 점수만 저장하면 끝이에요.</p>}
        <p className="mt-4 rounded-xl bg-tint p-3 text-xs leading-relaxed text-muted">기억나지 않는 기록은 비워두고 저장해도 돼요. 경기 상세에서 이어서 입력할 수 있어요.</p>
      </div>
      <div className="space-y-2 rounded-2xl border border-line bg-card p-4">
        {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
        <button type="button" disabled={pending} onClick={() => save(false)} className="min-h-12 w-full rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-50">{pending ? "저장 중…" : "경기 기록 저장"}</button>
        <button type="button" disabled={pending} onClick={() => save(true)} className="min-h-11 w-full text-sm font-medium text-accent disabled:opacity-50">점수만 저장 · 나중에 기록</button>
      </div>
      <p className="text-center text-xs text-muted">MOM 투표는 첫 결과 저장 후 1시간 동안 진행돼요.</p>
    </div>
  );
}

function Stepper({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <div className="min-w-0 text-center"><div className="mb-2 break-words text-xs text-muted">{label}</div>
    <div className="flex flex-wrap items-center justify-center gap-1">
      <button type="button" disabled={value === 0} aria-label={`${label} 점수 줄이기`} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-sunken disabled:opacity-40"><Minus size={16} aria-hidden /></button>
      <output className="min-w-7 text-center text-3xl font-bold tabular-nums" aria-label={`${label} 점수`}>{value}</output>
      <button type="button" aria-label={`${label} 점수 늘리기`} onClick={() => onChange(value + 1)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-sunken"><Plus size={16} aria-hidden /></button>
    </div>
  </div>;
}
