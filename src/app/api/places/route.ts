import { NextResponse } from "next/server";
import { isManager } from "@/lib/data/auth";

// 카카오 로컬 키워드 검색 프록시 (REST 키는 서버에만) — 운영진만
export async function GET(req: Request) {
  if (!(await isManager())) return NextResponse.json({ places: [] }, { status: 403 });

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ places: [] });

  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) return NextResponse.json({ places: [], error: "no_key" });

  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(q)}&size=12`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );
    if (!res.ok) return NextResponse.json({ places: [], error: `kakao_${res.status}` });
    const data = await res.json();
    const places = (data.documents ?? []).map((d: Record<string, string>) => ({
      name: d.place_name,
      address: d.road_address_name || d.address_name || "",
      lat: Number(d.y),
      lng: Number(d.x),
    }));
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json({ places: [], error: "fetch_failed" });
  }
}
