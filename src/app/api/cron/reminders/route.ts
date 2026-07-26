import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToSubscriptions } from "@/lib/push";
import { recordNotificationEvent } from "@/lib/notification-events";

// D-1 경기 리마인드. Vercel Cron이 매일 호출 (Authorization: Bearer CRON_SECRET).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service key not configured" }, { status: 503 });

  // 내일 날짜 (KST)
  const kstNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
  kstNow.setDate(kstNow.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  const tomorrow = `${kstNow.getFullYear()}-${pad(kstNow.getMonth() + 1)}-${pad(kstNow.getDate())}`;

  const { data: matches } = await admin
    .from("matches")
    .select("id, opponent, match_time, type")
    .eq("match_date", tomorrow)
    .neq("status", "cancelled");

  if (!matches || matches.length === 0) return NextResponse.json({ tomorrow, matches: 0, sent: 0 });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, members(status)")
    .not("member_id", "is", null);
  const profileIds = (profiles ?? [])
    .filter((profile) => {
      const member = Array.isArray(profile.members) ? profile.members[0] : profile.members;
      return member?.status === "active";
    })
    .map((profile) => profile.id as string);
  const { data: subs } = profileIds.length
    ? await admin.from("push_subscriptions").select("endpoint, p256dh, auth").in("profile_id", profileIds)
    : { data: [] as { endpoint: string; p256dh: string; auth: string }[] };
  const list = (subs ?? []) as { endpoint: string; p256dh: string; auth: string }[];

  for (const m of matches) {
    const { error: deliveryError } = await admin
      .from("reminder_deliveries")
      .insert({ match_id: m.id, reminder_date: tomorrow });
    // 이미 발송한 리마인드는 재실행해도 다시 보내지 않는다.
    if (deliveryError?.code === "23505") continue;
    if (deliveryError) {
      return NextResponse.json({ error: "reminder delivery lock failed" }, { status: 500 });
    }
    const label = m.type === "self" ? m.opponent : `vs ${m.opponent}`;
    const body = `${label}${m.match_time ? ` · ${m.match_time}` : ""} · 아직 참석 전이라면 알려주세요`;
    await recordNotificationEvent(admin, {
      kind: "reminder",
      referenceId: m.id,
      title: "내일 경기",
      body,
      url: `/matches/${m.id}`,
      audience: "all",
    });
    await sendToSubscriptions(list, {
      title: "내일 경기",
      body,
      url: `/matches/${m.id}`,
    });
  }

  revalidatePath("/notifications");
  revalidatePath("/");

  return NextResponse.json({ tomorrow, matches: matches.length, sent: list.length });
}
