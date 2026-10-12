"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

type GuestResult = { ok: boolean; message: string };
function refresh(matchId: string) {
  for (const path of [`/admin/matches/${matchId}/attendance`, `/matches/${matchId}`, `/matches/${matchId}/formation`, `/admin/matches/${matchId}/result`]) revalidatePath(path);
}

export async function addGuest(matchId: string, name: string, position1: string): Promise<GuestResult> {
  if (!(await isManager())) return { ok: false, message: "운영진만 용병을 등록할 수 있어요." };
  const n = name.trim();
  if (!n || !["FW", "MF", "DF", "GK"].includes(position1)) return { ok: false, message: "이름과 포지션을 확인해주세요." };
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase.from("matches").select("status").eq("id", matchId).single();
  if (matchError || !match || match.status === "cancelled") return { ok: false, message: "경기 상태를 확인할 수 없거나 취소된 경기예요." };
  const { error } = await supabase.from("guests").insert({ match_id: matchId, name: n, position1 });
  if (error) return { ok: false, message: "용병을 저장하지 못했어요. 입력은 유지되니 다시 시도해주세요." };
  refresh(matchId);
  return { ok: true, message: `${n} 용병을 추가했어요.` };
}

export async function deleteGuest(matchId: string, guestId: string): Promise<GuestResult> {
  if (!(await isManager())) return { ok: false, message: "운영진만 용병을 삭제할 수 있어요." };
  const supabase = await createClient();
  const { data: match, error: matchError } = await supabase.from("matches").select("status").eq("id", matchId).single();
  if (matchError || !match || match.status === "cancelled") return { ok: false, message: "경기 상태를 확인할 수 없거나 취소된 경기예요." };
  const { data, error } = await supabase.from("guests").delete().eq("id", guestId).eq("match_id", matchId).select("id");
  if (error) return { ok: false, message: error.code === "23503" ? "득점·도움 기록이 있는 용병은 삭제할 수 없어요. 기록을 먼저 확인해주세요." : "용병을 삭제하지 못했어요. 다시 시도해주세요." };
  if (!data?.length) return { ok: false, message: "이미 삭제된 용병이에요. 최신 명단을 확인해주세요." };
  refresh(matchId);
  return { ok: true, message: "용병을 삭제했어요." };
}
