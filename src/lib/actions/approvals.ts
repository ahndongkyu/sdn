"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import { sendPushToManagers } from "@/lib/push";

type ApprovalResult = { ok: true; message: string } | { ok: false; message: string };

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
  const { data: current } = await supabase
    .from("profiles")
    .select("claimed_name, signup_rejected_at")
    .eq("id", user.id)
    .maybeSingle();
  const shouldNotifyManagers = !current?.claimed_name || Boolean(current.signup_rejected_at);
  const { error } = await supabase.from("profiles").update({
    claimed_name: name,
    claimed_position1: String(formData.get("position1") ?? "").trim() || null,
    claimed_position2: String(formData.get("position2") ?? "").trim() || null,
    claimed_num_red: toNum(formData.get("num_red")),
    claimed_num_blue: toNum(formData.get("num_blue")),
    // 거절된 신청자가 다시 제출하면 승인 대기 상태로 되돌린다.
    signup_rejected_at: null,
  }).eq("id", user.id);
  if (error) return;
  if (shouldNotifyManagers) {
    await supabase.rpc("record_signup_notification");
    // 최초 신청 또는 거절 후 재신청일 때만 운영진에게 푸시한다.
    await sendPushToManagers({
      title: "SDN · 새 가입 신청",
      body: `${name} 님이 승인을 기다리고 있어요`,
      url: "/admin/approvals",
    });
  }
  revalidatePath("/pending");
  revalidatePath("/admin/approvals");
  revalidatePath("/notifications");
  revalidatePath("/");
}

// 승인(신규): 신청 정보로 새 회원 생성 + 계정 연결
export async function createMemberFromSignup(profileId: string, allowSameName = false): Promise<ApprovalResult> {
  if (!(await isManager())) return { ok: false, message: "운영진만 가입을 승인할 수 있어요." };
  if (!profileId) return { ok: false, message: "가입 신청 정보를 찾을 수 없어요." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("approve_signup_as_new_member", {
    p_profile_id: profileId,
    p_allow_same_name: allowSameName,
  });
  if (error) return { ok: false, message: error.message || "신규 회원 등록에 실패했어요." };

  revalidatePath("/admin/approvals");
  revalidatePath("/members");
  revalidatePath("/more");
  return { ok: true, message: "신규 회원으로 등록하고 계정을 연결했어요." };
}

// 승인: 대기 프로필을 로스터 회원과 연결
export async function linkProfile(profileId: string, memberId: string): Promise<ApprovalResult> {
  if (!(await isManager())) return { ok: false, message: "운영진만 가입을 승인할 수 있어요." };
  if (!profileId || !memberId) return { ok: false, message: "연결할 회원을 선택해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("link_pending_profile", {
    p_profile_id: profileId,
    p_member_id: memberId,
  });
  if (error) return { ok: false, message: error.message || "계정 연결에 실패했어요." };

  revalidatePath("/admin/approvals");
  revalidatePath("/more");
  revalidatePath("/members");
  return { ok: true, message: "기존 회원 기록에 카카오 계정을 연결했어요." };
}

// 가입 신청 거절: 회원은 만들거나 연결하지 않고 대기 목록에서만 제외
export async function rejectSignup(profileId: string): Promise<ApprovalResult> {
  if (!(await isManager())) return { ok: false, message: "운영진만 가입을 처리할 수 있어요." };
  if (!profileId) return { ok: false, message: "가입 신청 정보를 찾을 수 없어요." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ signup_rejected_at: new Date().toISOString() })
    .eq("id", profileId)
    .is("member_id", null);
  if (error) return { ok: false, message: "가입 거절 처리에 실패했어요." };

  revalidatePath("/admin/approvals");
  revalidatePath("/pending");
  revalidatePath("/more");
  return { ok: true, message: "가입 신청을 거절했어요." };
}
