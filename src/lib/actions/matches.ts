"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";

// 매치 등록 (운영진 — RLS의 is_manager()로 강제)
export async function createMatch(formData: FormData) {
  if (!(await isManager())) return;
  const opponent = String(formData.get("opponent") ?? "").trim();
  const match_date = String(formData.get("match_date") ?? "").trim();
  if (!opponent || !match_date) return;

  const supabase = await createClient();
  const { error } = await supabase.from("matches").insert({
    opponent,
    match_date,
    match_time: String(formData.get("match_time") ?? "") || null,
    place: String(formData.get("place") ?? "") || null,
    place_address: String(formData.get("place_address") ?? "") || null,
    type: String(formData.get("type") ?? "match"),
    uniform: String(formData.get("uniform") ?? "") || null,
    youtube_url: String(formData.get("youtube_url") ?? "") || null,
    status: "upcoming",
  });

  if (error) {
    console.error("createMatch", error);
    return;
  }

  try {
    const label = String(formData.get("type") ?? "match") === "self" ? opponent : `vs ${opponent}`;
    const time = String(formData.get("match_time") ?? "");
    await sendPushToAll({ title: "새 경기 등록", body: `${label} · ${match_date} ${time} · 참석 체크하세요`, url: "/matches" });
  } catch {
    /* 푸시 실패 무시 */
  }

  revalidatePath("/matches");
  redirect(`/matches?toast=${encodeURIComponent("경기가 등록됐어요")}`);
}

// 매치 수정 (운영진)
export async function updateMatch(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  const opponent = String(formData.get("opponent") ?? "").trim();
  const match_date = String(formData.get("match_date") ?? "").trim();
  if (!id || !opponent || !match_date) return;

  const supabase = await createClient();
  await supabase
    .from("matches")
    .update({
      opponent,
      match_date,
      match_time: String(formData.get("match_time") ?? "") || null,
      place: String(formData.get("place") ?? "") || null,
      place_address: String(formData.get("place_address") ?? "") || null,
      type: String(formData.get("type") ?? "match"),
      uniform: String(formData.get("uniform") ?? "") || null,
      youtube_url: String(formData.get("youtube_url") ?? "") || null,
    })
    .eq("id", id);

  revalidatePath(`/matches/${id}`);
  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches/${id}?toast=${encodeURIComponent("경기 정보가 수정됐어요")}`);
}

// 매치 삭제 (운영진)
export async function deleteMatch(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("matches").delete().eq("id", id);
  revalidatePath("/matches");
  revalidatePath("/");
  redirect(`/matches?toast=${encodeURIComponent("경기가 삭제됐어요")}`);
}

// 참석 RSVP (본인) — attendances upsert
export async function setAttendance(matchId: string, status: "going" | "notGoing" | "undecided") {
  const profile = await getMyProfile();
  if (!profile?.member_id) return;

  const supabase = await createClient();
  await supabase
    .from("attendances")
    .upsert(
      { match_id: matchId, member_id: profile.member_id, status, source: "self" },
      { onConflict: "match_id,member_id" },
    );

  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/matches");
}

// 운영진 대리 참석 체크 (특정 회원) — RLS의 is_manager()로 강제
export async function setAttendanceFor(
  matchId: string,
  memberId: string,
  status: "going" | "notGoing" | "undecided",
) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase
    .from("attendances")
    .upsert(
      { match_id: matchId, member_id: memberId, status, source: "manager" },
      { onConflict: "match_id,member_id" },
    );
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath("/");
}
