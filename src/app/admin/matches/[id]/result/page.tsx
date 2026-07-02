import Link from "next/link";
import { notFound } from "next/navigation";
import { X, Goal, Trash2 } from "lucide-react";
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

      {/* 득점 상세 */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] text-muted">우리 득점 상세 <span className="text-faint">(통계용)</span></span>
          <span className="text-[12px] text-subtle">{goals.length} / {match.score_for ?? 0} 입력됨</span>
        </div>

        {goals.length > 0 && (
          <div className="mb-2.5 overflow-hidden rounded-xl border border-divider bg-card soft-card">
            {goals.map((g, i) => (
              <div key={i} className={`flex items-center gap-2.5 px-3.5 py-2.5 ${i < goals.length - 1 ? "border-b border-divider" : ""}`}>
                <Goal size={16} className="text-[#1d9e75]" />
                <span className="flex-1 text-sm">{g.is_own_goal ? "자책골" : (g.scorer_id ? nameOf.get(g.scorer_id) : "득점")}</span>
                {g.assist_id && <span className="text-xs text-muted">도움 {nameOf.get(g.assist_id)}</span>}
                <DeleteGoalButton goalId={(g as { id?: string }).id} matchId={id} />
              </div>
            ))}
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
