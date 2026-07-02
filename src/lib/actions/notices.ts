"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyProfile, isManager } from "@/lib/data/auth";
import { sendPushToAll } from "@/lib/push";

export async function createNotice(formData: FormData) {
  if (!(await isManager())) return;
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const profile = await getMyProfile();

  const supabase = await createClient();
  await supabase.from("notices").insert({
    title,
    content: String(formData.get("content") ?? "") || null,
    author_id: (profile?.member_id as string | null) ?? null,
  });

  try {
    await sendPushToAll({ title: "새 공지", body: title, url: "/notices" });
  } catch {
    /* 푸시 실패는 무시 */
  }

  revalidatePath("/notices");
  redirect(`/notices?toast=${encodeURIComponent("공지가 등록됐어요")}`);
}

export async function deleteNotice(formData: FormData) {
  if (!(await isManager())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("notices").delete().eq("id", id);
  revalidatePath("/notices");
  redirect(`/notices?toast=${encodeURIComponent("공지가 삭제됐어요")}`);
}
