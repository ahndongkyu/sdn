import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch, getAttendanceMap } from "@/lib/data/matches";
import { getMembers } from "@/lib/data/members";
import { getMyProfile } from "@/lib/data/auth";
import { getGuests } from "@/lib/data/guests";
import { AttendanceManager } from "@/components/match/attendance-manager";
import { MatchWorkflow } from "@/components/match/match-workflow";
import { GuestManager } from "@/components/match/guest-manager";

export default async function AttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [members, map, guests, profile] = await Promise.all([getMembers(), getAttendanceMap(id), getGuests(id), getMyProfile()]);

  return (
    <div data-match-form className="space-y-4 pb-44">
      <div className="mb-1 flex items-center gap-2">
        <Link href={`/matches/${id}`} aria-label="경기 상세로" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl">
          <ArrowLeft size={20} className="text-muted" aria-hidden />
        </Link>
        <h1 className="flex-1 text-base font-bold">참석 관리</h1>
        <span className="rounded-lg bg-tint px-2 py-1 text-xs text-accent">운영진</span>
      </div>

      <MatchWorkflow current={1} />
      <p className="text-sm text-muted">{match.type === "self" ? match.opponent : `vs ${match.opponent}`}</p>
      {match.status === "cancelled" ? <p className="rounded-xl bg-card p-6 text-sm text-muted">취소된 경기는 참석 명단을 수정할 수 없어요.</p> : members.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">등록된 회원이 없어요.</div>
      ) : (
        <AttendanceManager
          key={`${id}:${profile?.id}`}
          userId={profile?.id ?? ""}
          guestCount={guests.length}
          matchId={id}
          members={members.map((m) => ({ id: m.id, name: m.name, position1: m.position1 }))}
          initial={map}
        />
      )}

      {match.status !== "cancelled" && <div className="border-t border-divider pt-4">
        <GuestManager matchId={id} guests={guests} />
      </div>}
    </div>
  );
}
