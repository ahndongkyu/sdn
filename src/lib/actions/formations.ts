"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";
import type { FormationLayout } from "@/lib/data/formations";

// 포메이션 저장 (운영진) — 매치당 1행으로 교체 저장
export async function saveFormation(matchId: string, layout: FormationLayout) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("formations").delete().eq("match_id", matchId);
  await supabase.from("formations").insert({ match_id: matchId, name: "custom", layout });
  revalidatePath(`/matches/${matchId}/formation`);
}
