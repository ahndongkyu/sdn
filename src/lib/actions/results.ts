"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToMembers } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";

function revalidateMatch(matchId: string) {
  revalidatePath(`/admin/matches/${matchId}/result`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
  revalidatePath("/");
  revalidatePath("/stats");
}

export type ResultAction =
  | { ok: true; message: string }
  | { ok: false; message: string; needsConfirmation?: boolean };

// 최종 스코어 저장
export async function saveScore(
  matchId: string,
  scoreFor: number,
  scoreAgainst: number,
  confirmGoalMismatch = false,
): Promise<ResultAction> {
  if (!(await isManager())) return { ok: false, message: "운영진만 결과를 저장할 수 있어요." };
  if (!Number.isInteger(scoreFor) || !Number.isInteger(scoreAgainst) || scoreFor < 0 || scoreAgainst < 0) {
    return { ok: false, message: "스코어는 0 이상의 정수만 입력할 수 있어요." };
  }
  const supabase = await createClient();

  // MOM 투표 마감시각: 첫 결과 입력 시점 + 1시간 (이미 있으면 유지)
  const [{ data: cur }, { data: match }, { data: attendances }, { count: goalCount }] = await Promise.all([
    supabase.from("matches").select("mom_vote_close, score_for, score_against").eq("id", matchId).single(),
    supabase.from("matches").select("opponent, type, status").eq("id", matchId).single(),
    supabase.from("attendances").select("member_id").eq("match_id", matchId).eq("status", "going"),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("match_id", matchId),
  ]);
  if (!match) return { ok: false, message: "경기를 찾을 수 없어요." };
  if (match.status === "cancelled") return { ok: false, message: "취소된 경기는 결과를 입력할 수 없어요." };
  if ((goalCount ?? 0) !== scoreFor && !confirmGoalMismatch) {
    return {
      ok: false,
      needsConfirmation: true,
      message: `입력한 팀 득점은 ${scoreFor}골인데 개인 득점 기록은 ${goalCount ?? 0}골이에요. 이대로 저장할까요?`,
    };
  }
  const update: Record<string, unknown> = { score_for: scoreFor, score_against: scoreAgainst, status: "past" };
  if (!cur?.mom_vote_close) update.mom_vote_close = new Date(Date.now() + 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("matches").update(update).eq("id", matchId);
  if (error) return { ok: false, message: "결과 저장에 실패했어요. 다시 시도해주세요." };

  const isFirstResult = cur?.score_for === null && cur?.score_against === null;
  const memberIds = (attendances ?? []).map((attendance) => attendance.member_id as string).filter(Boolean);
  const label = match.type === "self" ? match.opponent : `vs ${match.opponent}`;
  const body = `${scoreFor} : ${scoreAgainst} · MOM 투표에 참여해주세요`;
  if (isFirstResult) {
    await recordNotificationEvent(supabase, {
      kind: "result",
      referenceId: matchId,
      title: `${label} 경기 결과`,
      body,
      url: `/matches/${matchId}`,
      audience: "members",
      memberIds,
    });
    try {
      await sendPushToMembers(memberIds, {
        title: "경기 결과",
        body: `${label} ${body}`,
        url: `/matches/${matchId}`,
      });
    } catch {
      /* 푸시 실패 무시 */
    }
  }

  revalidatePath("/notifications");
  revalidateMatch(matchId);
  return { ok: true, message: "결과가 저장됐어요." };
}

// 득점 추가 (자책골이면 득점자·도움 없이 우리 득점 1)
export async function addGoal(
  matchId: string,
  scorerId: string | null,
  assistId: string | null,
  isOwnGoal = false,
): Promise<ResultAction> {
  if (!(await isManager())) return { ok: false, message: "운영진만 득점을 추가할 수 있어요." };
  if (!isOwnGoal && !scorerId) return { ok: false, message: "득점자를 선택해주세요." };
  if (scorerId && scorerId === assistId) return { ok: false, message: "득점자와 도움은 같은 선수를 선택할 수 없어요." };
  const supabase = await createClient();
  const { data: match } = await supabase.from("matches").select("status").eq("id", matchId).maybeSingle();
  if (!match) return { ok: false, message: "경기를 찾을 수 없어요." };
  if (match.status === "cancelled") return { ok: false, message: "취소된 경기에는 득점을 추가할 수 없어요." };

  const playerIds = [scorerId, assistId].filter((id): id is string => Boolean(id));
  if (playerIds.length) {
    const { data: attendees } = await supabase
      .from("attendances")
      .select("member_id")
      .eq("match_id", matchId)
      .eq("status", "going")
      .in("member_id", playerIds);
    if ((attendees ?? []).length !== playerIds.length) {
      return { ok: false, message: "경기 참석자로 등록된 회원만 득점·도움을 기록할 수 있어요." };
    }
  }

  const { error } = await supabase.from("goals").insert({
    match_id: matchId,
    scorer_id: isOwnGoal ? null : scorerId,
    assist_id: isOwnGoal ? null : assistId,
    is_own_goal: isOwnGoal,
  });
  if (error) return { ok: false, message: "득점 기록 추가에 실패했어요." };
  revalidateMatch(matchId);
  return { ok: true, message: isOwnGoal ? "자책골이 추가됐어요." : "득점이 추가됐어요." };
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
