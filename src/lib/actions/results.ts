"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";

function revalidateMatch(matchId: string) {
  revalidatePath(`/admin/matches/${matchId}/result`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
  revalidatePath("/stats");
}

// 최종 스코어 저장
export async function saveScore(matchId: string, scoreFor: number, scoreAgainst: number) {
  if (!(await isManager())) return;
  const supabase = await createClient();

  // MOM 투표 마감시각: 첫 결과 입력 시점 + 1시간 (이미 있으면 유지)
  const { data: cur } = await supabase.from("matches").select("mom_vote_close").eq("id", matchId).single();
  const update: Record<string, unknown> = { score_for: scoreFor, score_against: scoreAgainst, status: "past" };
  if (!cur?.mom_vote_close) update.mom_vote_close = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  await supabase.from("matches").update(update).eq("id", matchId);

  try {
    const { data: m } = await supabase.from("matches").select("opponent").eq("id", matchId).single();
    await sendPushToAll({
      title: "경기 결과",
      body: `vs ${m?.opponent ?? ""} ${scoreFor} : ${scoreAgainst} · MOM 투표하세요`,
      url: `/matches/${matchId}`,
    });
  } catch {
    /* 푸시 실패 무시 */
  }

  revalidateMatch(matchId);
}

// 득점 추가 (자책골이면 득점자·도움 없이 우리 득점 1)
export async function addGoal(matchId: string, scorerId: string | null, assistId: string | null, isOwnGoal = false) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("goals").insert({
    match_id: matchId,
    scorer_id: isOwnGoal ? null : scorerId,
    assist_id: isOwnGoal ? null : assistId,
    is_own_goal: isOwnGoal,
  });
  revalidateMatch(matchId);
}

// 득점 삭제
export async function deleteGoal(formData: FormData) {
  if (!(await isManager())) return;
  const goalId = String(formData.get("goalId") ?? "");
  const matchId = String(formData.get("matchId") ?? "");
  if (!goalId) return;
  const supabase = await createClient();
  await supabase.from("goals").delete().eq("id", goalId);
  revalidateMatch(matchId);
}
