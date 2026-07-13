import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Play, Shirt, Crown, CircleCheck, Pencil, Calendar, MapPin, MessageCircle } from "lucide-react";
import { getMatch, getMatchAttendances, getMatchGoals, getMyAttendance, getMvpVotes, isPast } from "@/lib/data/matches";
import { getMatchTalkCount } from "@/lib/data/comments";
import { getMembers } from "@/lib/data/members";
import { getGuests } from "@/lib/data/guests";
import { getMyProfile } from "@/lib/data/auth";
import { formatDateKo } from "@/lib/format";
import { POSITION_BADGE } from "@/lib/mock";
import { RsvpButtons } from "@/components/match/rsvp-buttons";
import { VideoButton } from "@/components/match/video-button";
import { MvpVote } from "@/components/match/mvp-vote";
import { Avatar } from "@/components/ui/avatar";

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  const [attendances, goals, members, profile] = await Promise.all([
    getMatchAttendances(id),
    getMatchGoals(id),
    getMembers(),
    getMyProfile(),
  ]);
  const myMemberId = (profile?.member_id as string | null) ?? null;
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";
  const myStatus = myMemberId ? await getMyAttendance(id, myMemberId) : "undecided";
  const votes = await getMvpVotes(id, myMemberId);
  const guests = await getGuests(id);
  const talkCount = await getMatchTalkCount(id);

  const nameOf = new Map(members.map((m) => [m.id, m.name]));
  const past = isPast(match);
  const d = formatDateKo(match.match_date);

  const going = attendances.filter((a) => a.status === "going");
  const counts = {
    going: attendances.filter((a) => a.status === "going").length,
    notGoing: attendances.filter((a) => a.status === "notGoing").length,
    undecided: attendances.filter((a) => a.status === "undecided").length,
  };
  const r = result(match.score_for, match.score_against);

  // 득점 집계: 득점자별 골 수 + 도움(중복 제거) · 자책골은 별도
  const scorerMap = new Map<string, { name: string; count: number; assists: string[] }>();
  for (const g of goals) {
    if (g.is_own_goal) continue;
    const key = g.scorer_id ?? "?";
    const name = g.scorer_id ? nameOf.get(g.scorer_id) ?? "선수" : "득점";
    const e = scorerMap.get(key) ?? { name, count: 0, assists: [] };
    e.count += 1;
    if (g.assist_id) {
      const an = nameOf.get(g.assist_id);
      if (an && !e.assists.includes(an)) e.assists.push(an);
    }
    scorerMap.set(key, e);
  }
  const scorers = [...scorerMap.values()].sort((a, b) => b.count - a.count);
  const ownGoals = goals.filter((g) => g.is_own_goal).length;

  // MOM 투표 상태: 결과 입력됨 + 마감시각 기준
  const hasResult = match.score_for !== null;
  const voteClosed = hasResult && (!match.mom_vote_close || Date.now() >= new Date(match.mom_vote_close).getTime());
  // 최다 득표자 (마감 후 확정용)
  let topId: string | null = null;
  let topCount = 0;
  for (const [tid, c] of Object.entries(votes.counts)) {
    if (c > topCount) { topCount = c; topId = tid; }
  }
  // 오늘의 MOM = 마감 후 최다 득표자 (순수 투표)
  const momId = voteClosed && topCount > 0 ? topId : null;
  const mvpName = momId ? nameOf.get(momId) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/matches" className="flex items-center gap-2">
          <ArrowLeft size={20} className="text-muted" />
          <span className="text-[15px] font-medium">매치 상세</span>
        </Link>
        {isManager && (
          <div className="flex items-center gap-1.5">
            <Link href={`/admin/matches/${id}/edit`} className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted">
              <Pencil size={13} /> 수정
            </Link>
            <Link href={`/admin/matches/${id}/result`} className="rounded-lg bg-red px-2.5 py-1.5 text-xs text-white">
              결과 입력
            </Link>
          </div>
        )}
      </div>

      {/* 스코어 + 득점 기록 통합 카드 */}
      <section className="rounded-2xl border border-line bg-card soft-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] text-subtle">{match.type === "self" ? "자체전" : "정규 매치"}</span>
          {past && match.score_for !== null && (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: r.color }}>{r.label}</span>
          )}
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="brand-logo mx-auto mb-1.5 flex h-11 w-11 items-center justify-center rounded-[13px] text-[11px] font-bold">SDN</div>
            <div className="text-[12px] font-bold text-fg">SDN</div>
          </div>
          {past && match.score_for !== null ? (
            <div className="text-[30px] font-extrabold leading-none tracking-[1px] text-fg tabular-nums">{match.score_for} : {match.score_against}</div>
          ) : (
            <span className="text-[15px] text-subtle">VS</span>
          )}
          <div className="text-center">
            <div className="mx-auto mb-1.5 flex h-11 w-11 items-center justify-center rounded-[13px] bg-sunken text-[11px] font-bold text-muted">{match.opponent.slice(0, 2)}</div>
            <div className="text-[12px] font-bold text-muted">{match.opponent}</div>
          </div>
        </div>

        <div className="mt-3 text-center leading-relaxed">
          <div className="text-[12px] text-muted"><Calendar size={12} className="mr-1 inline align-[-1px] text-subtle" />{d.full} {match.match_time ?? ""}</div>
          {match.place && <div className="text-[12px] text-muted"><MapPin size={12} className="mr-1 inline align-[-1px] text-subtle" />{match.place}</div>}
        </div>

        {past && (scorers.length > 0 || ownGoals > 0) && (
          <div className="mt-3 flex flex-col items-center gap-2 border-t border-divider pt-3.5">
            {scorers.map((s, i) => (
              <div key={i} className="text-center">
                <span className="text-sm font-medium text-fg">{s.name}</span>{" "}
                <span className="text-[13px] align-[-1px]">{"⚽".repeat(s.count)}</span>
                {s.assists.length > 0 && (
                  <div className="mt-0.5 text-[11px] text-subtle"><span className="text-faint">도움</span> {s.assists.join(" ")}</div>
                )}
              </div>
            ))}
            {ownGoals > 0 && (
              <div className="text-center">
                <span className="text-sm text-muted">자책골</span>{" "}
                <span className="text-[13px] align-[-1px]">{"⚽".repeat(ownGoals)}</span>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 예정: RSVP */}
      {!past && (
        <section className="rounded-2xl border border-divider bg-card soft-card p-3.5">
          <div className="mb-2.5 text-[13px] text-muted">참석 체크</div>
          <RsvpButtons matchId={id} current={myStatus} />
          <div className="mt-2.5 text-center text-[11px] text-muted">
            참석 <span className="font-medium text-[#1d9e75]">{counts.going}</span> · 불참 {counts.notGoing} · 미정 {counts.undecided}
          </div>
        </section>
      )}

      {/* 액션 */}
      <div className="flex gap-2">
        {match.youtube_url ? (
          <VideoButton url={match.youtube_url} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-ink py-2.5 text-[13px] font-medium text-white">
            <Play size={16} className="text-red" fill="currentColor" /> 영상
          </VideoButton>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-sunken py-2.5 text-[13px] text-faint">
            <Play size={16} /> 영상 없음
          </span>
        )}
        <Link href={`/matches/${id}/formation`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-line py-2.5 text-[13px]">
          <Shirt size={17} /> 포메이션
        </Link>
      </div>

      {/* 경기 코멘트 진입 */}
      <Link href={`/matches/${id}/comment`} className="flex items-center justify-center gap-1.5 rounded-lg border border-line bg-card py-2.5 text-[13px] font-medium soft-card">
        <MessageCircle size={16} className="text-accent" /> 경기 코멘트
        {(talkCount.hasPost || talkCount.comments > 0) && (
          <span className="rounded-full bg-tint px-2 py-0.5 text-[11px] font-bold text-accent">{talkCount.hasPost ? "총평 · " : ""}댓글 {talkCount.comments}</span>
        )}
      </Link>

      {/* MVP */}
      {mvpName && (
        <div className="flex items-center gap-3 rounded-xl bg-navy px-3.5 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ef9f27] text-[13px] font-medium text-[#412402]">{mvpName.slice(0, 2)}</div>
          <div className="flex-1">
            <div className="text-[11px] text-[#fac775]"><Crown size={13} className="mr-1 inline align-[-2px]" /> 오늘의 MOM</div>
            <div className="text-sm font-medium">{mvpName}</div>
          </div>
        </div>
      )}

      {/* MVP 투표 (결과 입력 = 경기 종료 시 오픈) */}
      {match.score_for !== null && (
        <MvpVote
          matchId={id}
          pool={going.map((a) => ({ id: a.members!.id, name: a.members!.name }))}
          counts={votes.counts}
          myVote={votes.myVote}
          total={votes.total}
          canVote={myStatus === "going" && !voteClosed}
          closed={voteClosed}
          deadline={match.mom_vote_close}
        />
      )}

      {/* 참가 선수 */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-[13px] text-muted">참가 선수</h2>
          {isManager ? (
            <Link href={`/admin/matches/${id}/attendance`} className="rounded-lg border border-line px-2.5 py-1 text-[11px] text-muted">
              참석 관리
            </Link>
          ) : (
            <div className="text-xs text-subtle"><span className="text-[#1d9e75]">참석 {counts.going}</span> · 불참 {counts.notGoing} · 미정 {counts.undecided}</div>
          )}
        </div>
        {going.length === 0 && guests.length === 0 ? (
          <div className="rounded-xl border border-divider bg-card soft-card px-4 py-6 text-center text-[13px] text-subtle">아직 참석자가 없어요.</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {going.map((a, i) => {
              const m = a.members;
              const badge = m ? POSITION_BADGE[m.position1] : POSITION_BADGE.MF;
              const num = m?.member_numbers?.find((n) => n.uniform === match.uniform)?.number ?? m?.member_numbers?.[0]?.number;
              return (
                <div key={i} className="flex items-center gap-2 rounded-[10px] border border-divider bg-card px-2.5 py-2">
                  {num != null ? (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-medium" style={{ background: badge.bg, color: badge.fg }}>
                      {num}
                    </div>
                  ) : (
                    <Avatar size={28} />
                  )}
                  <span className="flex-1 text-[13px]">{m?.name ?? "게스트"}</span>
                  <CircleCheck size={16} className="text-[#1d9e75]" />
                </div>
              );
            })}
            {guests.map((g) => {
              return (
                <div key={g.id} className="flex items-center gap-2 rounded-[10px] border border-dashed border-line bg-card px-2.5 py-2">
                  <Avatar size={28} guest />
                  <span className="flex-1 text-[13px]">{g.name} <span className="text-[10px] text-faint">용병</span></span>
                  <CircleCheck size={16} className="text-[#1d9e75]" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function result(f: number | null, a: number | null) {
  if (f === null || a === null) return { label: "", color: "#9fb2e0" };
  if (f > a) return { label: "승리", color: "#1d9e75" };
  if (f < a) return { label: "패배", color: "#dc2f3c" };
  return { label: "무승부", color: "#888780" };
}
