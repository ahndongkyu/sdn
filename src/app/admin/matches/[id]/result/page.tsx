import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch, getMatchAttendances, getMatchGoals } from "@/lib/data/matches";
import { getGuests } from "@/lib/data/guests";
import { getMyProfile } from "@/lib/data/auth";
import { getMembers } from "@/lib/data/members";
import { ResultEditor } from "@/components/match/result-editor";
import { MatchWorkflow } from "@/components/match/match-workflow";
import { formatDateKo } from "@/lib/format";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const [attendances, goals, members, guests, profile] = await Promise.all([getMatchAttendances(id), getMatchGoals(id), getMembers(), getGuests(id), getMyProfile()]);
  const pool = [...attendances.filter((a) => a.status === "going" && a.members)
    .map((a) => ({ id: a.members!.id, name: a.members!.name })), ...guests.map(g => ({ id: `guest:${g.id}`, name: `${g.name} (용병)` }))];
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Link href={`/matches/${id}`} aria-label="경기 상세로" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl"><ArrowLeft size={20} aria-hidden /></Link>
        <h1 className="flex-1 text-base font-bold">경기 기록</h1><span className="rounded-lg bg-tint px-2 py-1 text-xs text-accent">운영진</span>
      </header>
      {match.status === "cancelled" ? <p className="rounded-xl bg-card p-6 text-center text-sm text-muted">취소된 경기는 기록할 수 없어요.</p> : <>
        <MatchWorkflow current={3} />
        <div><h2 className="text-xl font-bold tracking-tight">오늘 경기, 기록해볼까요?</h2><p className="mt-1 text-sm text-muted">{match.type === "self" ? match.opponent : `vs ${match.opponent}`} · {formatDateKo(match.match_date).short}</p></div>
        <ResultEditor key={`${id}:${profile?.id}:${match.result_revision}`} userId={profile?.id ?? ""} matchId={id} opponent={match.opponent} initialFor={match.score_for ?? goals.length} initialAgainst={match.score_against ?? 0}
          revision={match.result_revision} initialGoals={goals} pool={pool} names={Object.fromEntries([...members.map((m) => [m.id, m.name]), ...guests.map(g => [`guest:${g.id}`, `${g.name} (용병)`])])} />
      </>}
    </div>
  );
}
