import { todayInSeoul } from "@/lib/date";

export function isPast(m: { match_date: string; score_for: number | null; status?: string }) {
  return m.status === "cancelled" || m.score_for !== null || m.match_date < todayInSeoul();
}
