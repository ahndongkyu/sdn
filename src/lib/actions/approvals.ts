"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToManagers } from "@/lib/push";

const toNum = (v: FormDataEntryValue | null): number | null => {
  const n = parseInt(String(v ?? "").trim(), 10);
  return Number.isNaN(n) ? null : n;
};

// 가입 대기자가 신청 정보 제출 (이름·포지션·등번호) → 승인 시 매칭 또는 신규 등록에 사용
export async function submitClaimName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !name) return;
  await supabase.from("profiles").update({
    claimed_name: name,
    claimed_position1: String(formData.get("position1") ?? "").trim() || null,
    claimed_position2: String(formData.get("position2") ?? "").trim() || null,
    claimed_num_red: toNum(formData.get("num_red")),
    claimed_num_blue: toNum(formData.get("num_blue")),
  }).eq("id", user.id);
  await supabase.rpc("record_signup_notification");
  // 운영진·관리자에게 가입 신청 알림 푸시
  await sendPushToManagers({
    title: "SDN · 새 가입 신청",
    body: `${name} 님이 승인을 기다리고 있어요`,
    url: "/admin/approvals",
  });
  revalidatePath("/pending");
  revalidatePath("/admin/approvals");
  revalidatePath("/notifications");
  revalidatePath("/");
}

// 승인(신규): 신청 정보로 새 회원 생성 + 계정 연결
export async function createMemberFromSignup(profileId: string) {
  if (!(await isManager())) return;
  if (!profileId) return;
  const supabase = await createClient();
  const { data: p } = await supabase
    .from("profiles")
    .select("claimed_name, claimed_position1, claimed_position2, claimed_num_red, claimed_num_blue")
    .eq("id", profileId)
    .single();
  const prof = p as {
    claimed_name?: string | null;
    claimed_position1?: string | null;
    claimed_position2?: string | null;
    claimed_num_red?: number | null;
    claimed_num_blue?: number | null;
  } | null;
  if (!prof?.claimed_name) return;

  const { data: member } = await supabase
    .from("members")
    .insert({
      name: prof.claimed_name,
      position1: prof.claimed_position1 || "MF",
      position2: prof.claimed_position2 || null,
      role: "member",
    })
    .select("id")
    .single();
  if (!member) return;

  const nums: { member_id: string; uniform: string; number: number }[] = [];
  if (prof.claimed_num_red != null) nums.push({ member_id: member.id, uniform: "빨검", number: prof.claimed_num_red });
  if (prof.claimed_num_blue != null) nums.push({ member_id: member.id, uniform: "파랑", number: prof.claimed_num_blue });
  if (nums.length) await supabase.from("member_numbers").insert(nums);

  await supabase.from("profiles").update({ member_id: member.id }).eq("id", profileId);
  revalidatePath("/admin/approvals");
  revalidatePath("/members");
  revalidatePath("/more");
}

// 승인: 대기 프로필을 로스터 회원과 연결
export async function linkProfile(profileId: string, memberId: string) {
  if (!(await isManager())) return;
  if (!profileId || !memberId) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ member_id: memberId }).eq("id", profileId);

  revalidatePath("/admin/approvals");
  revalidatePath("/more");
}
