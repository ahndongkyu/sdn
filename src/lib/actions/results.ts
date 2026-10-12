"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToMembers } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";

export type GoalInput = {
  id?: string;
  scorer_id: string | null;
  assist_id: string | null;
  scorer_guest_id: string | null;
  assist_guest_id: string | null;
  is_own_goal: boolean;
  assist_pending: boolean;
};

export async function saveMatchRecord(
  matchId: string, scoreFor: number, scoreAgainst: number, revision: number, goals: GoalInput[] | null,
): Promise<{ ok: boolean; message: string }> {
  if (!(await isManager())) return { ok: false, message: "운영진만 결과를 저장할 수 있어요." };
  if (![scoreFor, scoreAgainst, revision].every((n) => Number.isInteger(n) && n >= 0)) {
    return { ok: false, message: "스코어는 0 이상의 정수로 입력해주세요." };
  }
  const supabase = await createClient();
  const { data: firstResult, error } = await supabase.rpc("save_match_record", {
    p_match_id: matchId, p_score_for: scoreFor, p_score_against: scoreAgainst,
    p_revision: revision, p_goals: goals,
  });
  if (error) return {
    ok: false,
    message: error.code === "P0001" ? error.message : "경기 기록 저장에 실패했어요. 입력은 유지되니 다시 시도해주세요.",
  };

  // 알림 실패로 이미 저장된 경기 기록을 실패로 표시하지 않는다.
  if (firstResult) {
    try {
      const [{ data: match }, { data: attendances }] = await Promise.all([
        supabase.from("matches").select("opponent, type").eq("id", matchId).single(),
        supabase.from("attendances").select("member_id").eq("match_id", matchId).eq("status", "going"),
      ]);
      if (match) {
        const memberIds = (attendances ?? []).map((a) => a.member_id as string);
        const label = match.type === "self" ? match.opponent : `vs ${match.opponent}`;
        const body = `${scoreFor} : ${scoreAgainst} · 경기 기록을 확인해주세요`;
        await recordNotificationEvent(supabase, {
          kind: "result", referenceId: matchId, title: `${label} 경기 결과`, body,
          url: `/matches/${matchId}`, audience: "members", memberIds,
        });
        await sendPushToMembers(memberIds, { title: "경기 결과", body: `${label} ${body}`, url: `/matches/${matchId}` });
      }
    } catch { /* 기록 저장은 완료됨 */ }
  }
  for (const path of [`/admin/matches/${matchId}/result`, `/matches/${matchId}`, "/matches", "/", "/stats", "/notifications"]) revalidatePath(path);
  return { ok: true, message: goals === null ? "점수를 저장했어요. 득점 기록은 나중에 이어서 입력할 수 있어요." : "경기 기록을 저장했어요." };
}
