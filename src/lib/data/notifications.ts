import { createClient } from "@/lib/supabase/server";

export type Notif = {
  id: string;
  kind: "notice" | "match";
  title: string;
  body: string;
  at: string; // ISO
  url: string;
};

// 최근 공지 + 경기 등록을 합친 알림 피드
export async function getNotifications(): Promise<Notif[]> {
  const supabase = await createClient();
  const [noticesRes, matchesRes] = await Promise.all([
    supabase.from("notices").select("id, title, created_at").order("created_at", { ascending: false }).limit(15),
    supabase.from("matches").select("id, opponent, type, match_date, match_time, created_at").order("created_at", { ascending: false }).limit(15),
  ]);

  const notifs: Notif[] = [];
  for (const n of noticesRes.data ?? []) {
    notifs.push({ id: `notice-${n.id}`, kind: "notice", title: "새 공지", body: n.title, at: n.created_at, url: "/notices" });
  }
  for (const m of matchesRes.data ?? []) {
    const label = m.type === "self" ? "자체전" : `vs ${m.opponent}`;
    notifs.push({
      id: `match-${m.id}`,
      kind: "match",
      title: "새 경기 등록",
      body: `${label} · ${m.match_date} ${m.match_time ?? ""}`.trim(),
      at: m.created_at,
      url: `/matches/${m.id}`,
    });
  }

  notifs.sort((a, b) => (a.at < b.at ? 1 : -1));
  return notifs.slice(0, 20);
}
