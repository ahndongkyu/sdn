"use client";

import { useState, useRef } from "react";
import { Search, MapPin, Check, X } from "lucide-react";

type Place = { name: string; address: string; lat: number; lng: number };

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
  const [q, setQ] = useState(defaultPlace);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Place | null>(
    defaultPlace ? { name: defaultPlace, address: defaultAddress, lat: defaultLat ?? 0, lng: defaultLng ?? 0 } : null,
  );
  const tRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(v: string) {
    setQ(v);
    setPicked(null);
    if (tRef.current) clearTimeout(tRef.current);
    if (!v.trim()) { setResults([]); return; }
    tRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/places?q=${encodeURIComponent(v.trim())}`);
        const data = await res.json();
        setResults(data.places ?? []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
  }

  function clear() { setQ(""); setResults([]); setPicked(null); }

  return (
    <div>
      {/* 폼 제출용 hidden — 선택 없으면 place만 자유입력값으로 저장(주소·좌표 없음) */}
      <input type="hidden" name="place" value={picked?.name ?? q} />
      <input type="hidden" name="place_address" value={picked?.address ?? ""} />
      <input type="hidden" name="place_lat" value={picked?.lat ?? ""} />
      <input type="hidden" name="place_lng" value={picked?.lng ?? ""} />

      <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-3 py-2.5">
        <Search size={16} className="shrink-0 text-subtle" />
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="운동장·장소 검색 (예: 안산시랑운동장)"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
        />
        {q && <button type="button" onClick={clear} aria-label="지우기"><X size={15} className="text-subtle" /></button>}
      </div>

      {loading && <div className="mt-1.5 text-[12px] text-subtle">검색 중…</div>}

      {!picked && results.length > 0 && (
        <div className="mt-1.5 space-y-1">
          {results.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setPicked(p); setResults([]); setQ(p.name); }}
              className="block w-full rounded-lg border border-line bg-card px-3 py-2 text-left"
            >
              <div className="text-[13px] font-medium">{p.name}</div>
              <div className="text-[11px] text-subtle"><MapPin size={11} className="mr-0.5 inline align-[-1px]" />{p.address || "주소 정보 없음"}</div>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div className="mt-1.5 rounded-lg bg-tint px-3 py-2">
          <div className="mb-0.5 text-[11px] font-bold text-accent"><Check size={11} className="mr-0.5 inline align-[-1px]" />선택됨</div>
          <div className="text-[13px] font-medium">{picked.name}</div>
          {picked.address && <div className="text-[11px] text-subtle">{picked.address}</div>}
        </div>
      )}
    </div>
  );
}
