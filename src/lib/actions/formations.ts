"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToMembers } from "@/lib/push";
import type { FormationLayout } from "@/lib/data/formations";
import { recordNotificationEvent } from "@/lib/notification-events";

// 포메이션 자동 저장 (운영진) — 알림은 공유 시점에만 보낸다.
export async function saveFormation(matchId: string, layout: FormationLayout) {
  if (!(await isManager())) return false;
  const supabase = await createClient();

  const { error: deleteError } = await supabase.from("formations").delete().eq("match_id", matchId);
  if (deleteError) return false;
  const { error: insertError } = await supabase.from("formations").insert({ match_id: matchId, name: "custom", layout });
  if (insertError) return false;
  revalidatePath(`/matches/${matchId}/formation`);
  revalidatePath("/");
  return true;
}

// 운영진이 라인업 공유를 선택한 시점에만 참석자에게 알림·푸시 발송
export async function publishFormation(matchId: string) {
  if (!(await isManager())) return false;
  const supabase = await createClient();

  const { data: att } = await supabase
    .from("attendances")
    .select("member_id")
    .eq("match_id", matchId)
    .eq("status", "going");
  const memberIds = (att ?? []).map((a) => a.member_id as string).filter(Boolean);
  await recordNotificationEvent(supabase, {
    kind: "lineup",
    referenceId: matchId,
    title: "라인업이 등록됐어요",
    body: "이번 경기 포메이션과 쿼터별 배치를 확인하세요",
    url: `/matches/${matchId}/formation`,
    audience: "members",
    memberIds,
  });
  await sendPushToMembers(memberIds, {
    title: "SDN · 라인업 등록",
    body: "이번 경기 포메이션이 등록됐어요. 라인업을 확인하세요!",
    url: `/matches/${matchId}/formation`,
  });
  revalidatePath("/notifications");
  revalidatePath("/");
  return true;
}
