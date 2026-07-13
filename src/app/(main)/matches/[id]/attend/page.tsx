import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getMatch, getMatchAttendances } from "@/lib/data/matches";
import { getMembers } from "@/lib/data/members";
import { getMyProfile } from "@/lib/data/auth";
import { getAttendComments } from "@/lib/data/attend";
import { formatDateKo } from "@/lib/format";
import { AttendPollView } from "@/components/match/attend-poll-view";

type Status = "going" | "notGoing" | "undecided";
type Person = { name: string; position1: string };

export default async function AttendPollPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [match, attendances, members, profile, comments] = await Promise.all([
    getMatch(id),
    getMatchAttendances(id),
    getMembers(),
    getMyProfile(),
    getAttendComments(id),
  ]);
  if (!match) notFound();

  const myMemberId = (profile?.member_id as string | null) ?? null;
  const toP = (a: { members: { name: string; position1: string } | null }): Person => ({ name: a.members!.name, position1: a.members!.position1 });

  const going = attendances.filter((a) => a.status === "going" && a.members).map(toP);
  const notGoing = attendances.filter((a) => a.status === "notGoing" && a.members).map(toP);
  const undecided = attendances.filter((a) => a.status === "undecided" && a.members).map(toP);

  const respondedIds = new Set(attendances.filter((a) => a.members).map((a) => a.members!.id));
  const noResponse: Person[] = members
    .filter((m) => m.role !== "admin" && !respondedIds.has(m.id))
    .map((m) => ({ name: m.name, position1: m.position1 }));

  const myRow = attendances.find((a) => a.members?.id === myMemberId);
  const myStatus = (myRow?.status as Status | undefined) ?? null;

  const title = `${formatDateKo(match.match_date).full} · ${match.type === "self" ? "자체전" : `vs ${match.opponent}`}`;
  const subtitle = `${match.match_time ?? ""}${match.place ? ` · ${match.place}` : ""}`.trim();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">참석 투표</span>
        </Link>
      </div>

      <AttendPollView
        matchId={id}
        title={title}
        subtitle={subtitle}
        groups={{ going, notGoing, undecided, noResponse }}
        myStatus={myStatus}
        comments={comments}
        canInteract={!!myMemberId}
      />
    </div>
  );
}
