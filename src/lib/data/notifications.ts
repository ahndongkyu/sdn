import { createClient } from "@/lib/supabase/server";
import { isManager } from "@/lib/data/auth";

export type Notif = {
  id: string;
  kind: "notice" | "match" | "approval";
  title: string;
  body: string;
  at: string; // ISO
  url: string;
};

// 최근 공지 + 경기 등록을 합친 알림 피드 (운영진은 가입 신청 알림 포함)
export async function getNotifications(): Promise<Notif[]> {
  const supabase = await createClient();
  const manager = await isManager();
  const [noticesRes, matchesRes, approvalsRes] = await Promise.all([
    supabase.from("notices").select("id, title, created_at").order("created_at", { ascending: false }).limit(15),
    supabase.from("matches").select("id, opponent, type, match_date, match_time, created_at").order("created_at", { ascending: false }).limit(15),
    manager
      ? supabase
          .from("profiles")
          .select("id, claimed_name, created_at")
          .is("member_id", null)
          .not("claimed_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(15)
      : Promise.resolve({ data: [] as { id: string; claimed_name: string | null; created_at: string }[] }),
  ]);

  const notifs: Notif[] = [];
  for (const a of approvalsRes.data ?? []) {
    notifs.push({
      id: `approval-${a.id}`,
      kind: "approval",
      title: "새 가입 신청",
      body: `${a.claimed_name} 님이 승인을 기다려요`,
      at: a.created_at,
      url: "/admin/approvals",
    });
  }
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
