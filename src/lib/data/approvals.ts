import { createClient } from "@/lib/supabase/server";
import { todayInSeoul } from "@/lib/date";

export type PendingProfile = {
  id: string;
  kakao_nickname: string | null;
  claimed_name: string | null;
  claimed_position1: string | null;
  claimed_position2: string | null;
  claimed_num_red: number | null;
  claimed_num_blue: number | null;
  email: string | null;
  created_at: string;
};

export type ApprovalMember = {
  id: string;
  name: string;
  position1: string;
  member_numbers: { uniform: string; number: number }[];
  recordGames: number;
};

// 승인 대기 (카카오 로그인했으나 member_id 미연결)
export async function getPendingProfiles(): Promise<PendingProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, kakao_nickname, claimed_name, claimed_position1, claimed_position2, claimed_num_red, claimed_num_blue, email, created_at")
    .is("member_id", null)
    .is("signup_rejected_at", null)
    .order("created_at");
  return (data ?? []) as PendingProfile[];
}

export async function getPendingCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("member_id", null)
    .is("signup_rejected_at", null);
  return count ?? 0;
}

// 이미 계정과 연결된 member id 집합 (중복 연결 방지용)
export async function getLinkedMemberIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("member_id").not("member_id", "is", null);
  return new Set((data ?? []).map((r) => r.member_id as string));
}

// 승인 화면에서 기존 회원 후보를 비교할 때 쓰는 최소 정보다.
// 예정·취소 경기는 제외하고, 실제로 끝난 경기의 참석만 기존 기록으로 센다.
export async function getApprovalMembers(): Promise<ApprovalMember[]> {
  const supabase = await createClient();
  const [membersRes, attendancesRes, matchesRes] = await Promise.all([
    supabase
      .from("members")
      .select("id, name, position1, member_numbers(uniform, number)")
      .eq("status", "active")
      .order("name"),
    supabase.from("attendances").select("match_id, member_id").eq("status", "going"),
    supabase.from("matches").select("id, match_date, status"),
  ]);

  const completedMatchIds = new Set(
    (matchesRes.data ?? [])
      .filter((match) => match.status !== "cancelled" && match.match_date <= todayInSeoul())
      .map((match) => match.id),
  );
  const gamesByMember = new Map<string, number>();
  for (const attendance of attendancesRes.data ?? []) {
    if (!completedMatchIds.has(attendance.match_id)) continue;
    gamesByMember.set(attendance.member_id, (gamesByMember.get(attendance.member_id) ?? 0) + 1);
  }

  return (membersRes.data ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    position1: member.position1,
    member_numbers: (member.member_numbers ?? []) as { uniform: string; number: number }[],
    recordGames: gamesByMember.get(member.id) ?? 0,
  }));
}
