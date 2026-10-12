import { createClient } from "@/lib/supabase/server";
import type { Position } from "@/lib/mock";

export type GuestRow = { id: string; name: string; position1: Position };

export async function getGuests(matchId: string): Promise<GuestRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("guests")
    .select("id, name, position1")
    .eq("match_id", matchId)
    .order("created_at");
  if (error) throw new Error("용병 명단을 불러오지 못했어요. 다시 시도해주세요.");
  return (data ?? []) as GuestRow[];
}
