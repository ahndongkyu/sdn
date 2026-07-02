import { createClient } from "@/lib/supabase/server";

export type FormationLayout = Record<
  string,
  { preset: string; assignments: { slot: number; memberId: string }[] }
>;

export async function getFormation(matchId: string): Promise<FormationLayout | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("formations")
    .select("layout")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0]?.layout as FormationLayout) ?? null;
}
