import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch, getMatchAttendances } from "@/lib/data/matches";
import { getFormation } from "@/lib/data/formations";
import { getMembers } from "@/lib/data/members";
import { getGuests } from "@/lib/data/guests";
import { getMyProfile } from "@/lib/data/auth";
import { MatchFormation, type PoolPlayer } from "@/components/formation/match-formation";

export default async function MatchFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, initial, members, guests, profile] = await Promise.all([
    getMatchAttendances(id),
    getFormation(id),
    getMembers(),
    getGuests(id),
    getMyProfile(),
  ]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  const numOf = (mn: { uniform: string; number: number }[]) =>
    mn.find((n) => n.uniform === match.uniform)?.number ?? mn[0]?.number ?? null;

  const pool: PoolPlayer[] = [
    ...attendances
      .filter((a) => a.status === "going" && a.members)
      .map((a) => ({ id: a.members!.id, name: a.members!.name, number: numOf(a.members!.member_numbers) })),
    ...guests.map((g) => ({ id: `guest:${g.id}`, name: `${g.name} (용병)`, number: null })),
  ];

  const poolIds = new Set(pool.map((p) => p.id));
  const roster: PoolPlayer[] = members
    .filter((m) => !poolIds.has(m.id))
    .map((m) => ({ id: m.id, name: m.name, number: numOf(m.member_numbers) }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href={`/matches/${id}`} className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">포메이션</span>
        </Link>
      </div>

      {pool.length === 0 && roster.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-12 text-center text-[13px] leading-relaxed text-muted">
          등록된 회원이 없어요.
        </div>
      ) : (
        <MatchFormation matchId={id} opponent={match.opponent} pool={pool} roster={roster} isManager={isManager} initial={initial} />
      )}
    </div>
  );
}
