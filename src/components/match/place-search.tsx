"use client";

import { useState } from "react";
import { MapPin, Check, Search } from "lucide-react";

// 다음(카카오) 우편번호 서비스 — 무료·키 불필요
const DAUM_SRC = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

type DaumData = { roadAddress?: string; jibunAddress?: string; address?: string; buildingName?: string };
type DaumNS = { Postcode: new (opts: { oncomplete: (d: DaumData) => void }) => { open: () => void } };
function getDaum(): DaumNS | undefined {
  return (window as unknown as { daum?: DaumNS }).daum;
}
function loadDaum(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (getDaum()) return resolve();
    const s = document.createElement("script");
    s.src = DAUM_SRC;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("script"));
    document.head.appendChild(s);
  });
}

export function PlaceSearch({
  defaultPlace = "",
  defaultAddress = "",
  defaultLat,
  defaultLng,
}: {
  defaultPlace?: string;
  defaultAddress?: string;
  defaultLat?: number | null;
  defaultLng?: number | null;
}) {
  const [place, setPlace] = useState(defaultPlace);
  const [address, setAddress] = useState(defaultAddress);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    defaultLat != null && defaultLng != null ? { lat: defaultLat, lng: defaultLng } : null,
  );
  const [geo, setGeo] = useState<"idle" | "loading" | "done" | "fail">(defaultLat != null ? "done" : "idle");

  async function search() {
    try {
      await loadDaum();
      const daum = getDaum();
      if (!daum) return;
      new daum.Postcode({
        oncomplete: async (data) => {
          const addr = data.roadAddress || data.address || data.jibunAddress || "";
          setAddress(addr);
          if (!place && data.buildingName) setPlace(data.buildingName);
          setGeo("loading");
          setCoords(null);
          try {
            const res = await fetch(`/api/geocode?q=${encodeURIComponent(addr)}`);
            const d = await res.json();
            if (d.lat != null && d.lng != null) {
              setCoords({ lat: d.lat, lng: d.lng });
              setGeo("done");
            } else {
              setGeo("fail");
            }
          } catch {
            setGeo("fail");
          }
        },
      }).open();
    } catch {
      /* 스크립트 로드 실패 무시 */
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="place" value={place} />
      <input type="hidden" name="place_address" value={address} />
      <input type="hidden" name="place_lat" value={coords?.lat ?? ""} />
      <input type="hidden" name="place_lng" value={coords?.lng ?? ""} />

      <input
        value={place}
        onChange={(e) => setPlace(e.target.value)}
        placeholder="장소명 (예: 안산시랑운동장)"
        className="input"
      />

      <button
        type="button"
        onClick={search}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-line bg-card py-2.5 text-[13px] font-medium text-accent"
      >
        <Search size={15} /> {address ? "주소 다시 찾기" : "주소 찾기"}
      </button>

      {address && (
        <div className="rounded-lg bg-tint px-3 py-2 text-[12px]">
          <div className="flex items-start gap-1 text-fg">
            <MapPin size={13} className="mt-0.5 shrink-0 text-accent" /> {address}
          </div>
          <div className="mt-1 text-[11px]">
            {geo === "loading" ? (
              <span className="text-subtle">좌표 확인 중…</span>
            ) : geo === "done" ? (
              <span className="text-[#0f6e56]"><Check size={11} className="mr-0.5 inline align-[-1px]" />날씨 위치 설정됨</span>
            ) : geo === "fail" ? (
              <span className="text-subtle">좌표를 못 찾았어요 (날씨는 서울 기준)</span>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
