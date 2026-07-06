import Link from "next/link";
import { notFound } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { getMatch, getMatchAttendances, getMatchGoals } from "@/lib/data/matches";
import { getMembers } from "@/lib/data/members";
import { deleteGoal } from "@/lib/actions/results";
import { ScoreEditor, GoalAdder } from "@/components/match/result-editor";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, goals, members] = await Promise.all([
    getMatchAttendances(id),
    getMatchGoals(id),
    getMembers(),
  ]);

  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const pool = attendances
    .filter((a) => a.status === "going" && a.members)
    .map((a) => ({ id: a.members!.id, name: a.members!.name }));

  // 득점자별 합산 (자책골 별도) + 골 수 체크
  const scorerRows = new Map<string, { name: string; count: number; assists: string[]; lastId?: string }>();
  const ownIds: string[] = [];
  for (const g of goals) {
    const gid = (g as { id?: string }).id;
    if (g.is_own_goal) { if (gid) ownIds.push(gid); continue; }
    const key = g.scorer_id ?? "?";
    const nm = g.scorer_id ? nameOf.get(g.scorer_id) ?? "선수" : "득점";
    const e = scorerRows.get(key) ?? { name: nm, count: 0, assists: [] as string[] };
    e.count += 1;
    if (gid) e.lastId = gid;
    if (g.assist_id) { const an = nameOf.get(g.assist_id); if (an && !e.assists.includes(an)) e.assists.push(an); }
    scorerRows.set(key, e);
  }
  const scorers = [...scorerRows.values()];
  const entered = goals.length;
  const target = match.score_for ?? 0;
  const chkColor = entered === target ? "#1d9e75" : entered < target ? "#e8912b" : "#dc2f3c";
  const chkPct = target > 0 ? Math.min(100, Math.round((entered / target) * 100)) : entered > 0 ? 100 : 0;

  return (
    <div className="space-y-4">
      <div className="mb-1 flex items-center gap-2">
        <Link href={`/matches/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">결과 입력 · vs {match.opponent}</h1>
      </div>

      {/* 스코어 */}
      <div>
        <div className="mb-2 text-[13px] text-muted">최종 스코어</div>
        <ScoreEditor matchId={id} initialFor={match.score_for ?? 0} initialAgainst={match.score_against ?? 0} />
      </div>

      {/* 득점 상세 + 골 수 체크 */}
      <div>
        <div className="mb-2 text-[13px] text-muted">우리 득점 상세 <span className="text-faint">(통계용)</span></div>

        {/* 골 수 체크 바 */}
        <div className="mb-2.5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[12.5px] font-bold" style={{ background: `${chkColor}1f`, color: chkColor }}>
          <span className="shrink-0">득점 {entered}/{target}골</span>
          <span className="h-[7px] flex-1 overflow-hidden rounded-full" style={{ background: "rgba(0,0,0,.09)" }}>
            <span className="block h-full rounded-full" style={{ width: `${chkPct}%`, background: chkColor }} />
          </span>
        </div>

        {(scorers.length > 0 || ownIds.length > 0) && (
          <div className="mb-2.5 overflow-hidden rounded-xl border border-divider bg-card soft-card">
            {scorers.map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                <span className="text-[15px] leading-none tracking-tight">{"⚽".repeat(s.count)}</span>
                <span className="text-sm font-medium">{s.name}</span>
                <span className="flex-1 text-right text-xs text-muted">{s.assists.length ? `도움 ${s.assists.join(" ")}` : ""}</span>
                <DeleteGoalButton goalId={s.lastId} matchId={id} />
              </div>
            ))}
            {ownIds.length > 0 && (
              <div className="flex items-center gap-2.5 border-b border-divider px-3.5 py-2.5 last:border-b-0">
                <span className="text-[15px] leading-none tracking-tight">{"⚽".repeat(ownIds.length)}</span>
                <span className="flex-1 text-sm font-medium text-muted">자책골</span>
                <DeleteGoalButton goalId={ownIds[ownIds.length - 1]} matchId={id} />
              </div>
            )}
          </div>
        )}

        <GoalAdder matchId={id} pool={pool} />
      </div>

      <p className="text-center text-[11px] text-subtle">MOM은 경기 종료 후 참석자 투표로 자동 선정돼요.</p>
    </div>
  );
}

function DeleteGoalButton({ goalId, matchId }: { goalId?: string; matchId: string }) {
  if (!goalId) return null;
  return (
    <form action={deleteGoal}>
      <input type="hidden" name="goalId" value={goalId} />
      <input type="hidden" name="matchId" value={matchId} />
      <button type="submit" aria-label="삭제">
        <Trash2 size={16} className="text-faint" />
      </button>
    </form>
  );
}
