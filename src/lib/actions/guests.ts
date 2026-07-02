"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

export async function addGuest(matchId: string, name: string, position1: string) {
  if (!(await isManager())) return;
  const n = name.trim();
  if (!n) return;
  const supabase = await createClient();
  await supabase.from("guests").insert({ match_id: matchId, name: n, position1: position1 || "MF" });
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
}

export async function deleteGuest(matchId: string, guestId: string) {
  if (!(await isManager())) return;
  const supabase = await createClient();
  await supabase.from("guests").delete().eq("id", guestId);
  revalidatePath(`/admin/matches/${matchId}/attendance`);
  revalidatePath(`/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}/formation`);
}
