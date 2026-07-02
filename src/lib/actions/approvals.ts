"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

// 승인: 대기 프로필을 로스터 회원과 연결
export async function linkProfile(profileId: string, memberId: string) {
  if (!(await isManager())) return;
  if (!profileId || !memberId) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ member_id: memberId }).eq("id", profileId);

  revalidatePath("/admin/approvals");
  revalidatePath("/more");
}
