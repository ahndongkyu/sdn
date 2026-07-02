import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// 로그인 사용자의 profile + 연결된 member(로스터). member_id가 없으면 승인 대기.
export async function getMyProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, email, kakao_nickname, member_id, members(*)")
    .eq("id", user.id)
    .maybeSingle();

  return data;
}

// 현재 사용자가 운영진(manager/admin)인지
export async function isManager() {
  const profile = await getMyProfile();
  const role = (profile?.members as { role?: string } | null)?.role;
  return role === "manager" || role === "admin";
}
