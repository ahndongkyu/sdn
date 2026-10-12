import { notFound } from "next/navigation";
import { getMatch, getMatchAttendances } from "@/lib/data/matches";
import { getFormation } from "@/lib/data/formations";
import { getGuests } from "@/lib/data/guests";
import { getMyProfile } from "@/lib/data/auth";
import { MatchFormation, type PoolPlayer } from "@/components/formation/match-formation";

export default async function MatchFormationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, initial, guests, profile] = await Promise.all([
    getMatchAttendances(id),
    getFormation(id),
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

  const details = [match.match_date, match.match_time?.slice(0, 5), match.place].filter(Boolean).join(" · ");

  return <MatchFormation key={`${id}:${profile?.id}`} userId={profile?.id ?? "anonymous"} revision={match.formation_revision} matchId={id} opponent={match.opponent} details={details} pool={pool} isManager={isManager} initial={initial} />;
}
