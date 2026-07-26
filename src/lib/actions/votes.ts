"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/lib/data/auth";

// MVP 투표 (그 경기 참석자만) — 1인 1표, 재투표 시 변경
export async function voteMvp(matchId: string, targetId: string) {
  const profile = await getMyProfile();
  const voterId = profile?.member_id as string | null;
  if (!voterId) return;

  const supabase = await createClient();

  // 본인·투표 대상 모두 참석자여야 하며, 결과 입력 후 마감 전인 경기만 투표할 수 있다.
  const [{ data: myAttendance }, { data: targetAttendance }, { data: match }] = await Promise.all([
    supabase
      .from("attendances")
      .select("status")
      .eq("match_id", matchId)
      .eq("member_id", voterId)
      .maybeSingle(),
    supabase
      .from("attendances")
      .select("status")
      .eq("match_id", matchId)
      .eq("member_id", targetId)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("score_for, status, mom_vote_close")
      .eq("id", matchId)
      .maybeSingle(),
  ]);
  if (myAttendance?.status !== "going") return;
  if (targetAttendance?.status !== "going") return;
  if (!match || match.status === "cancelled" || match.score_for === null || !match.mom_vote_close) return;
  if (new Date(match.mom_vote_close).getTime() <= Date.now()) return;

  await supabase
    .from("mvp_votes")
    .upsert(
      { match_id: matchId, voter_id: voterId, target_id: targetId },
      { onConflict: "match_id,voter_id" },
    );

  revalidatePath(`/matches/${matchId}`);
}
