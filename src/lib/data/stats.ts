import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/lib/mock";
import { currentSeason } from "@/lib/season";

export type MemberStat = {
  id: string;
  name: string;
  position1: Position;
  position2: string | null; // 상세 포지션 코드 (WF·CF·CM…)
  goals: number;
  assists: number;
  attackPoints: number; // 득점 + 도움
  games: number; // 참석(출전) 경기 수
  attendRate: number; // %
  mvp: number;
};

function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export async function getMemberStats(season: number = currentSeason()): Promise<MemberStat[]> {
  const supabase = await createClient();
  const [membersRes, goalsRes, attRes, matchesRes, votesRes] = await Promise.all([
    supabase.from("members").select("id, name, position1, position2").eq("status", "active"),
    supabase.from("goals").select("match_id, scorer_id, assist_id"),
    supabase.from("attendances").select("match_id, member_id").eq("status", "going"),
    supabase.from("matches").select("id, match_date, mom_vote_close"),
    supabase.from("mvp_votes").select("match_id, target_id"),
  ]);

  const members = membersRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const today = todayInSeoul();
  // 해당 시즌(연도) 중 오늘까지 진행된 경기 id 집합 — 예정 경기는 출전/출석률에서 제외
  const inSeason = new Set(
    matches
      .filter((m) => Number(m.match_date.slice(0, 4)) === season && m.match_date <= today)
      .map((m) => m.id),
  );
  const goals = (goalsRes.data ?? []).filter((g) => inSeason.has(g.match_id));
  const att = (attRes.data ?? []).filter((a) => inSeason.has(a.match_id));
  const votes = (votesRes.data ?? []).filter((v) => inSeason.has(v.match_id));
  const totalMatches = inSeason.size;

  const g: Record<string, number> = {};
  const a: Record<string, number> = {};
  const att2: Record<string, number> = {};
  const mvp: Record<string, number> = {};
  for (const row of goals) {
    if (row.scorer_id) g[row.scorer_id] = (g[row.scorer_id] ?? 0) + 1;
    if (row.assist_id) a[row.assist_id] = (a[row.assist_id] ?? 0) + 1;
  }
  for (const row of att) att2[row.member_id as string] = (att2[row.member_id as string] ?? 0) + 1;

  // MOM = 마감된 경기의 최다 득표자 (동점 시 공동)
  const now = Date.now();
  const closedIds = new Set(
    matches
      .filter((m) => inSeason.has(m.id) && m.mom_vote_close && now >= new Date(m.mom_vote_close).getTime())
      .map((m) => m.id),
  );
  const tally: Record<string, Record<string, number>> = {};
  for (const v of votes) {
    if (!closedIds.has(v.match_id)) continue;
    (tally[v.match_id] ??= {})[v.target_id] = (tally[v.match_id]?.[v.target_id] ?? 0) + 1;
  }
  for (const matchId of Object.keys(tally)) {
    const c = tally[matchId];
    const max = Math.max(...Object.values(c));
    if (max <= 0) continue;
    for (const [tid, cnt] of Object.entries(c)) if (cnt === max) mvp[tid] = (mvp[tid] ?? 0) + 1;
  }

  return members.map((m) => {
    const goalsN = g[m.id] ?? 0;
    const assistsN = a[m.id] ?? 0;
    const games = att2[m.id] ?? 0;
    return {
      id: m.id,
      name: m.name,
      position1: m.position1 as Position,
      position2: ((m as { position2?: string | null }).position2 as string | null) ?? null,
      goals: goalsN,
      assists: assistsN,
      attackPoints: goalsN + assistsN,
      games,
      attendRate: totalMatches ? Math.round((games / totalMatches) * 100) : 0,
      mvp: mvp[m.id] ?? 0,
    };
  });
}

export async function getMemberStat(id: string, season: number = currentSeason()): Promise<MemberStat | null> {
  const all = await getMemberStats(season);
  return all.find((s) => s.id === id) ?? null;
}
