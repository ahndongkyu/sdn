"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { saveAttendanceSelection } from "@/lib/actions/matches";
import { useFormDraft } from "@/lib/hooks/use-form-draft";
import { FixedFormActions } from "./fixed-form-actions";
import { DraftNotice } from "./draft-notice";
import { type Position } from "@/lib/mock";

type St = "going" | "notGoing" | "undecided";
type Member = { id: string; name: string; position1: Position };
const labels: Record<St, string> = { going: "참석", notGoing: "불참", undecided: "미정" };

export function AttendanceManager({ matchId, members, initial, userId, guestCount }: {
  matchId: string;
  userId: string;
  guestCount: number;
  members: Member[];
  initial: Record<string, { status: St; source: "self" | "manager" }>;
}) {
  const router = useRouter();
  const draft = useFormDraft(`attendance:${userId}:${matchId}:v1`, { changes: {} as Record<string, St>, initial });
  const { changes, initial: base } = draft.value;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<St | "all">("all");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const statusOf = (id: string) => changes[id] ?? base[id]?.status ?? "undecided";
  const counts = { going: 0, notGoing: 0, undecided: 0 };
  members.forEach((m) => counts[statusOf(m.id)]++);
  const visible = members.filter((m) => m.name.includes(query.trim()) && (filter === "all" || statusOf(m.id) === filter));

  function change(id: string, value: St) {
    const next = { ...changes };
    if (value === (base[id]?.status ?? "undecided")) delete next[id];
    else next[id] = value;
    draft.change({ ...draft.value, changes: next });
  }

  function save(formation: boolean) {
    setError("");
    start(async () => {
      try {
        const result = await saveAttendanceSelection(matchId, Object.entries(changes).map(([memberId, status]) => ({
          memberId, status, expectedStatus: base[memberId]?.status ?? null,
        })));
        if (!result.ok) { setError(result.message); return; }
        draft.clear();
        router.push(`${formation ? `/matches/${matchId}/formation` : `/matches/${matchId}`}?toast=${encodeURIComponent(result.message)}`);
      } catch {
        setError("명단을 저장하지 못했어요. 선택은 유지되니 다시 시도해주세요.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <DraftNotice available={!!draft.recovery} restore={draft.restore} discard={draft.discard} storageFailed={draft.storageFailed} />
      <h2 className="text-xl font-bold tracking-tight">이번 경기, 누가 뛰나요?</h2>
      <p className="text-sm text-muted">참석할 회원을 선택해주세요.</p>
      <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
        <Search size={18} className="shrink-0 text-muted" aria-hidden />
        <input type="search" aria-label="회원 이름 검색" placeholder="회원 이름 검색" value={query} onChange={(e) => setQuery(e.target.value)} className="min-h-12 min-w-0 flex-1 bg-transparent text-base text-fg" />
      </div>
      <div className="flex flex-wrap gap-2" aria-label="참석 상태 필터">
        {(["all", "going", "undecided", "notGoing"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}
            className={`min-h-11 rounded-xl px-3 text-xs font-medium ${filter === value ? "bg-tint text-accent" : "bg-card text-muted"}`}>
            {value === "all" ? "전체" : labels[value]} {value === "all" ? members.length : counts[value]}
          </button>
        ))}
      </div>
      <fieldset disabled={pending || !!draft.recovery} className="overflow-hidden rounded-2xl border border-line bg-card disabled:opacity-60">
        <legend className="sr-only">회원별 참석 여부</legend>
        {visible.map((m) => {
          const status = statusOf(m.id);
          return (
            <div key={m.id} className="flex items-center gap-2 border-b border-divider px-3 last:border-0">
              <label className="flex min-h-[76px] min-w-0 flex-1 cursor-pointer items-center gap-3 py-3">
                <input type="checkbox" checked={status === "going"} onChange={(e) => change(m.id, e.target.checked ? "going" : "undecided")}
                  aria-label={`${m.name} 참석`} className="h-5 w-5 shrink-0 accent-[var(--sdn-blue)]" />
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunken text-xs text-muted">{m.position1}</span>
                <span className="min-w-0"><span className="block break-words text-sm font-semibold">{m.name}</span>
                  <span className="text-xs text-muted">{changes[m.id] ? "저장 대기" : base[m.id]?.source === "self" ? "본인 투표" : base[m.id]?.source === "manager" ? "운영진 등록" : "아직 응답 없음"}</span>
                </span>
              </label>
              <select aria-label={`${m.name} 참석 상태`} value={status} onChange={(e) => change(m.id, e.target.value as St)}
                className="min-h-11 shrink-0 appearance-none rounded-lg border border-line bg-sunken bg-none px-3 text-sm text-fg">
                {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
          );
        })}
        {visible.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted">해당하는 회원이 없어요.</p>}
      </fieldset>
      <p className="text-xs leading-relaxed text-muted">본인 투표도 같은 명단에 반영돼요. 선택 해제 시 미정으로 변경되며, 불참은 상태에서 선택할 수 있어요.</p>
      <FixedFormActions>
        <div className="flex items-center justify-between"><strong className="text-sm" aria-live="polite">참석 {counts.going + guestCount}명</strong><span className="text-xs text-muted">{Object.keys(changes).length}명 변경 · 임시 보관</span></div>
        {error && <div role="alert" className="text-sm text-danger">{error}<button type="button" onClick={() => window.location.assign(`/matches/${matchId}`)} className="block min-h-11 text-accent">입력 보관하고 최신 기록 보기</button></div>}
        <button type="button" disabled={pending || !!draft.recovery} onClick={() => save(true)} className="min-h-12 w-full rounded-xl bg-accent px-4 font-semibold text-white disabled:opacity-50">{pending ? "저장 중…" : "저장하고 포메이션 만들기 →"}</button>
        <button type="button" disabled={pending || !!draft.recovery} onClick={() => save(false)} className="min-h-11 w-full text-sm font-medium text-accent disabled:opacity-50">저장하고 나가기</button>
      </FixedFormActions>
    </div>
  );
}
