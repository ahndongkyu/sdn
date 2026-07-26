"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isManager, getMyProfile } from "@/lib/data/auth";

function numbersFrom(formData: FormData) {
  return ["빨검", "파랑"].flatMap((uniform) => {
    const raw = String(formData.get(`number_${uniform}`) ?? "").trim();
    const number = Number.parseInt(raw, 10);
    return raw && !Number.isNaN(number) ? [{ uniform, number }] : [];
  });
}

// 회원 등록 (운영진). 기존 명단과 같은 이름은 승인 화면에서 연결하도록 유도한다.
export async function createMember(formData: FormData) {
  const [manager, admin] = await Promise.all([isManager(), isAdmin()]);
  if (!manager) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  const position1 = String(formData.get("position1") ?? "MF");
  const position2 = String(formData.get("position2") ?? "");
  const requestedRole = String(formData.get("role") ?? "member");
  const role = admin && requestedRole === "manager" ? "manager" : "member";

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_member_with_numbers", {
    p_name: name,
    p_position1: position1,
    p_position2: position2,
    p_role: role,
    p_numbers: numbersFrom(formData),
  });
  if (error) {
    redirect(`/admin/members/new?error=${error.message.includes("같은 이름") ? "duplicate" : "save"}`);
  }

  revalidatePath("/members");
  redirect(`/members?toast=${encodeURIComponent(`${name} 회원이 등록됐어요`)}`);
}

// 회원 수정 — 운영진은 전원, 회원은 본인만. 권한(role)은 관리자만 변경 가능(트리거로도 강제).
export async function updateMember(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!id || !name) return;

  const [manager, admin, me] = await Promise.all([isManager(), isAdmin(), getMyProfile()]);
  const mine = ((me?.member_id as string | null) ?? null) === id;
  if (!manager && !mine) return;

  const supabase = await createClient();
  const requestedRole = String(formData.get("role") ?? "member");
  const { error } = await supabase.rpc("update_member_with_numbers", {
    p_member_id: id,
    p_name: name,
    p_position1: String(formData.get("position1") ?? "MF"),
    p_position2: String(formData.get("position2") ?? ""),
    p_role: admin && ["member", "manager", "admin"].includes(requestedRole) ? requestedRole : "member",
    p_numbers: numbersFrom(formData),
  });
  if (error) {
    redirect(`/members/${id}/edit?error=${error.message.includes("같은 이름") ? "duplicate" : "save"}`);
  }

  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  redirect(`/members/${id}?toast=${encodeURIComponent("수정됐어요")}`);
}

// 회원 비활성화 (관리자). 기록과 카카오 계정 연결은 보존한다.
export async function deactivateMember(formData: FormData) {
  if (!(await isAdmin())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ status: "inactive" }).eq("id", id);
  if (error) {
    redirect(`/members/${id}/edit?error=deactivate`);
  }
  revalidatePath("/members");
  revalidatePath("/admin/members");
  revalidatePath("/admin/approvals");
  redirect(`/members?toast=${encodeURIComponent("회원이 비활성화됐어요. 기존 기록은 보존됩니다.")}`);
}
