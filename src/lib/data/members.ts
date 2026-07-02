import { createClient } from "@/lib/supabase/server";
import type { Position, Role } from "@/lib/mock";

export type MemberRow = {
  id: string;
  name: string;
  nickname: string | null;
  position1: Position;
  position2: Position | null;
  foot: "L" | "R" | "both";
  role: Role;
  member_numbers: { uniform: string; number: number }[];
};

export async function getMembers(): Promise<MemberRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("members")
    .select("id, name, nickname, position1, position2, foot, role, member_numbers(uniform, number)")
    .eq("status", "active")
    .order("name");
  if (error) {
    console.error("getMembers", error);
    return [];
  }
  return (data ?? []) as MemberRow[];
}

export async function getMemberById(id: string): Promise<MemberRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, name, nickname, position1, position2, foot, role, member_numbers(uniform, number)")
    .eq("id", id)
    .maybeSingle();
  return (data as MemberRow) ?? null;
}
