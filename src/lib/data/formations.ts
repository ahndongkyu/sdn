import { createClient } from "@/lib/supabase/server";

export type FormationLayout = Record<
  string,
  { preset: string; assignments: { slot: number; memberId: string }[] }
>;

export async function getFormation(matchId: string): Promise<FormationLayout | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("formations")
    .select("layout")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error("포메이션을 불러오지 못했어요. 다시 시도해주세요.");
  return (data?.[0]?.layout as FormationLayout) ?? null;
}
