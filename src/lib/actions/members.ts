"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isManager, getMyProfile } from "@/lib/data/auth";

async function hasActiveMemberWithName(name: string, excludeId?: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, name")
    .eq("status", "active");
  const normalized = name.trim().toLocaleLowerCase();
  return (data ?? []).some((member) => member.id !== excludeId && member.name.trim().toLocaleLowerCase() === normalized);
}

// 회원 등록 (운영진). 기존 명단과 같은 이름은 승인 화면에서 연결하도록 유도한다.
export async function createMember(formData: FormData) {
  const [manager, admin] = await Promise.all([isManager(), isAdmin()]);
  if (!manager) return;
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  if (await hasActiveMemberWithName(name)) {
    redirect("/admin/members/new?error=duplicate");
  }

  const position1 = String(formData.get("position1") ?? "MF");
  const position2 = String(formData.get("position2") ?? "");
  const requestedRole = String(formData.get("role") ?? "member");
  const role = admin && requestedRole === "manager" ? "manager" : "member";

  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      name,
      position1,
      position2: position2 || null,
      role,
    })
    .select("id")
    .single();

  if (error || !member) {
    console.error("createMember", error);
    return;
  }

  // 유니폼별 등번호 (빨검 / 파랑)
  const numbers: { member_id: string; uniform: string; number: number }[] = [];
  for (const uniform of ["빨검", "파랑"]) {
    const raw = String(formData.get(`number_${uniform}`) ?? "").trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) numbers.push({ member_id: member.id, uniform, number: n });
    }
  }
  if (numbers.length) {
    await supabase.from("member_numbers").insert(numbers);
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

  if (await hasActiveMemberWithName(name, id)) {
    redirect(`/members/${id}/edit?error=duplicate`);
  }

  const supabase = await createClient();
  const patch: Record<string, string | null> = {
    name,
    position1: String(formData.get("position1") ?? "MF"),
    position2: String(formData.get("position2") ?? "") || null,
  };
  if (admin) {
    const requestedRole = String(formData.get("role") ?? "member");
    patch.role = ["member", "manager", "admin"].includes(requestedRole) ? requestedRole : "member";
  }
  await supabase.from("members").update(patch).eq("id", id);

  // 등번호 교체 (기존 삭제 후 재삽입)
  await supabase.from("member_numbers").delete().eq("member_id", id);
  const numbers: { member_id: string; uniform: string; number: number }[] = [];
  for (const uniform of ["빨검", "파랑"]) {
    const raw = String(formData.get(`number_${uniform}`) ?? "").trim();
    if (raw) {
      const n = parseInt(raw, 10);
      if (!Number.isNaN(n)) numbers.push({ member_id: id, uniform, number: n });
    }
  }
  if (numbers.length) await supabase.from("member_numbers").insert(numbers);

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
