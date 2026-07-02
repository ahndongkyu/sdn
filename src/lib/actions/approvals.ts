"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

// 가입 대기자가 본인 이름 제출 → 운영진 승인 화면에서 자동 매칭에 사용
export async function submitClaimName(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !name) return;
  await supabase.from("profiles").update({ claimed_name: name }).eq("id", user.id);
  revalidatePath("/pending");
  revalidatePath("/admin/approvals");
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
