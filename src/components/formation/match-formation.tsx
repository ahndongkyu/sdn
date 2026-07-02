"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, UserPlus, RotateCcw, Check, Share2 } from "lucide-react";
import { toPng } from "html-to-image";
import { POSITION_COLOR, type Position } from "@/lib/mock";
import { saveFormation } from "@/lib/actions/formations";
import { setAttendanceFor } from "@/lib/actions/matches";
import type { FormationLayout } from "@/lib/data/formations";
import { toast } from "@/lib/toast";
import { Pitch } from "./pitch";

export type PoolPlayer = { id: string; name: string; number: number | null };
type Slot = { x: number; y: number; label: string };

// 포메이션별 자리값 고정 (세로 피치, 위쪽=공격). 표시 순서 = 이 순서.
const PRESETS: Record<string, Slot[]> = {
  "4-1-2-3": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 72, label: "LB" }, { x: 40, y: 75, label: "CB" }, { x: 60, y: 75, label: "CB" }, { x: 82, y: 72, label: "RB" },
    { x: 50, y: 58, label: "CDM" },
    { x: 34, y: 44, label: "CM" }, { x: 66, y: 44, label: "CM" },
    { x: 22, y: 22, label: "LW" }, { x: 50, y: 16, label: "ST" }, { x: 78, y: 22, label: "RW" },
  ],
  "4-2-3-1": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 74, label: "LB" }, { x: 40, y: 76, label: "CB" }, { x: 60, y: 76, label: "CB" }, { x: 82, y: 74, label: "RB" },
    { x: 36, y: 58, label: "CDM" }, { x: 64, y: 58, label: "CDM" },
    { x: 22, y: 38, label: "LM" }, { x: 50, y: 36, label: "AM" }, { x: 78, y: 38, label: "RM" },
    { x: 50, y: 18, label: "ST" },
  ],
  "4-3-3": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 72, label: "LB" }, { x: 40, y: 75, label: "CB" }, { x: 60, y: 75, label: "CB" }, { x: 82, y: 72, label: "RB" },
    { x: 28, y: 50, label: "CM" }, { x: 50, y: 46, label: "CDM" }, { x: 72, y: 50, label: "CM" },
    { x: 22, y: 24, label: "LW" }, { x: 50, y: 18, label: "ST" }, { x: 78, y: 24, label: "RW" },
  ],
  "4-4-2": [
    { x: 50, y: 90, label: "GK" },
    { x: 16, y: 72, label: "LB" }, { x: 38, y: 74, label: "CB" }, { x: 62, y: 74, label: "CB" }, { x: 84, y: 72, label: "RB" },
    { x: 16, y: 48, label: "LM" }, { x: 38, y: 50, label: "CM" }, { x: 62, y: 50, label: "CM" }, { x: 84, y: 48, label: "RM" },
    { x: 38, y: 22, label: "ST" }, { x: 62, y: 22, label: "ST" },
  ],
  "3-5-2": [
    { x: 50, y: 90, label: "GK" },
    { x: 30, y: 74, label: "CB" }, { x: 50, y: 76, label: "CB" }, { x: 70, y: 74, label: "CB" },
    { x: 14, y: 54, label: "LM" }, { x: 34, y: 52, label: "CM" }, { x: 50, y: 50, label: "CDM" }, { x: 66, y: 52, label: "CM" }, { x: 86, y: 54, label: "RM" },
    { x: 38, y: 22, label: "ST" }, { x: 62, y: 22, label: "ST" },
  ],
};

const GROUP: Record<string, Position> = {
  GK: "GK",
  LB: "DF", RB: "DF", CB: "DF", LWB: "DF", RWB: "DF",
  CDM: "MF", CM: "MF", LM: "MF", RM: "MF", AM: "MF",
  LW: "FW", RW: "FW", ST: "FW", CF: "FW",
};
const groupOf = (label: string): Position => GROUP[label] ?? "MF";
const QUARTERS = [1, 2, 3, 4];

type Assign = Record<number, string>; // slotIndex → memberId

export function MatchFormation({
  matchId, opponent, pool, roster, isManager, initial,
}: {
  matchId: string;
  opponent: string;
  pool: PoolPlayer[];
  roster: PoolPlayer[];
  isManager: boolean;
  initial: FormationLayout | null;
}) {
  const router = useRouter();
  const [quarter, setQuarter] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(initial != null);
  const [showRoster, setShowRoster] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [captureQs, setCaptureQs] = useState<number[] | null>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const [, startAdd] = useTransition();
  const [presetByQ, setPresetByQ] = useState<Record<number, string>>(() => {
    const s: Record<number, string> = {};
    for (const q of QUARTERS) s[q] = initial?.[q]?.preset ?? "4-1-2-3";
    return s;
  });
  const [assignByQ, setAssignByQ] = useState<Record<number, Assign>>(() => {
    const s: Record<number, Assign> = {};
    for (const q of QUARTERS) {
      const a: Assign = {};
      for (const x of initial?.[q]?.assignments ?? []) {
        if (pool.some((p) => p.id === x.memberId)) a[x.slot] = x.memberId;
      }
      s[q] = a;
    }
    return s;
  });

  const preset = presetByQ[quarter];
  const slots = PRESETS[preset];
  const assign = assignByQ[quarter];
  const assignedIds = new Set(Object.values(assign));
  const bench = pool.filter((p) => !assignedIds.has(p.id));
  const filled = Object.keys(assign).length;
  const nameById = new Map(pool.map((p) => [p.id, p]));

  function onSlotClick(i: number) {
    if (assign[i]) {
      // 채워진 자리 탭 → 비우기
      setAssignByQ((s) => {
        const a = { ...s[quarter] };
        delete a[i];
        return { ...s, [quarter]: a };
      });
      setSelected(null);
    } else {
      setSelected((cur) => (cur === i ? null : i));
    }
  }

  function fillFromBench(memberId: string) {
    let slot = selected;
    if (slot === null || assign[slot]) {
      slot = slots.findIndex((_, i) => !assign[i]);
    }
    if (slot === -1 || slot === null) return;
    setAssignByQ((s) => ({ ...s, [quarter]: { ...s[quarter], [slot!]: memberId } }));
    setSelected(null);
  }

  function applyPreset(name: string) {
    setPresetByQ((s) => ({ ...s, [quarter]: name }));
    setSelected(null);
  }

  // 참석 안 한 회원을 급하게 추가 → 참석(대리) 처리 후 풀에 편입
  function addFromRoster(memberId: string, name: string) {
    startAdd(async () => {
      await setAttendanceFor(matchId, memberId, "going");
      toast(`${name} 참석 처리 · 벤치에 추가됐어요`);
      setShowRoster(false);
      router.refresh();
    });
  }

  async function save() {
    setSaving(true);
    const layout: FormationLayout = {};
    for (const q of QUARTERS) {
      layout[q] = {
        preset: presetByQ[q],
        assignments: Object.entries(assignByQ[q]).map(([slot, memberId]) => ({ slot: Number(slot), memberId })),
      };
    }
    await saveFormation(matchId, layout);
    setSaving(false);
    setSaved(true);
    toast("포메이션이 저장됐어요");
  }

  // 현재 쿼터 라인업만 비우기 (저장해야 실제 반영)
  function resetQuarter() {
    if (Object.keys(assign).length === 0) return;
    if (!window.confirm(`${quarter}쿼터 라인업을 초기화할까요?`)) return;
    setAssignByQ((s) => ({ ...s, [quarter]: {} }));
    setSelected(null);
    toast(`${quarter}쿼터 라인업을 비웠어요 · 저장하면 반영돼요`);
  }

  function startShare(qs: number[]) {
    setShareOpen(false);
    setCaptureQs(qs);
  }

  // captureQs가 정해지면 숨은 캡처 노드를 이미지로 만들어 공유/저장
  useEffect(() => {
    if (!captureQs || !captureRef.current) return;
    let cancelled = false;
    (async () => {
      await new Promise((r) => setTimeout(r, 80)); // DOM/paint 안정화
      try {
        const dataUrl = await toPng(captureRef.current!, { pixelRatio: 2, cacheBust: true, backgroundColor: "#0b1f14" });
        if (cancelled) return;
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `SDN_라인업_vs_${opponent}.png`, { type: "image/png" });
        const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
        if (nav.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: "SDN 라인업", text: `SDN FC vs ${opponent} 라인업` });
        } else {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = file.name;
          a.click();
          toast("라인업 이미지를 저장했어요");
        }
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") toast("공유 이미지를 만들지 못했어요");
      } finally {
        if (!cancelled) setCaptureQs(null);
      }
    })();
    return () => { cancelled = true; };
  }, [captureQs, opponent]);

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {QUARTERS.map((q) => (
          <button key={q} onClick={() => { setQuarter(q); setSelected(null); }} className={`flex-1 rounded-lg py-2 text-[13px] font-medium ${quarter === q ? "bg-navy text-white" : "border border-line bg-card text-muted"}`}>
            {q}쿼터 <span className="text-[10px] opacity-70">{Object.keys(assignByQ[q]).length}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {saved && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#e1f5ee] px-2 py-0.5 text-[10px] font-bold text-[#0f6e56]">
              <Check size={11} /> 등록됨
            </span>
          )}
          <span className="truncate text-[13px] text-muted">vs {opponent} · {preset} · {filled}/11</span>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto">
        {Object.keys(PRESETS).map((name) => (
          <button key={name} onClick={() => applyPreset(name)} className={`shrink-0 rounded-[20px] px-3 py-1.5 text-xs ${preset === name ? "bg-[#1b5e20] text-white" : "border border-line bg-card text-muted"}`}>
            {name}
          </button>
        ))}
      </div>

      <div className="text-center text-[11px] text-subtle">
        {selected !== null ? `${slots[selected].label} 자리 · 아래에서 선수를 탭하세요` : "빈 자리를 탭하고 선수를 넣으세요 · 채운 자리 탭 = 비우기"}
      </div>

      {/* 피치 */}
      <div className="relative w-full select-none">
        <Pitch />
        <div className="absolute inset-0">
          {slots.map((slot, i) => {
            const pid = assign[i];
            const player = pid ? nameById.get(pid) : null;
            const isSel = selected === i;
            return (
              <button
                key={i}
                onClick={() => onSlotClick(i)}
                style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)" }}
                className="flex flex-col items-center"
              >
                {player ? (
                  <>
                    <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium leading-none text-white shadow-md" style={{ background: POSITION_COLOR[groupOf(slot.label)] }}>
                      {slot.label}
                    </span>
                    <span className="mt-0.5 text-[10px] text-white" style={{ textShadow: "0 1px 2px #000" }}>{player.name}</span>
                  </>
                ) : (
                  <>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed text-[10px] font-medium leading-none ${isSel ? "border-white bg-white/25 text-white" : "border-white/60 text-white/80"}`}>
                      {slot.label}
                    </span>
                    <span className="mt-0.5 text-[9px] text-white/60">비어있음</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 벤치 */}
      <div className="rounded-xl border border-divider bg-card soft-card p-3">
        <div className="mb-2 text-[12px] text-muted">
          {selected !== null ? (
            <span className="text-red">{slots[selected].label} 자리에 넣을 선수 선택</span>
          ) : (
            <>미배정 <span className="text-faint">{bench.length}명</span> · 탭하면 투입</>
          )}
        </div>
        {bench.length === 0 ? (
          <div className="py-1 text-center text-[12px] text-faint">전원 배치됨</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {bench.map((p) => (
              <button key={p.id} onClick={() => fillFromBench(p.id)} className="flex items-center gap-1.5 rounded-full border border-line bg-sunken px-2.5 py-1 text-[12px]">
                <Plus size={12} className="text-subtle" />
                {p.number != null && <span className="text-muted">{p.number}</span>}
                {p.name}
              </button>
            ))}
          </div>
        )}

        {isManager && roster.length > 0 && (
          <div className="mt-3 border-t border-divider pt-3">
            <button onClick={() => setShowRoster((v) => !v)} className="flex items-center gap-1 text-[12px] text-blue">
              <UserPlus size={13} /> 명단에서 추가 · 참석 안 한 회원 {roster.length}
            </button>
            {showRoster && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roster.map((r) => (
                  <button key={r.id} onClick={() => addFromRoster(r.id, r.name)} className="rounded-full border border-dashed border-line px-2.5 py-1 text-[12px] text-muted">
                    <Plus size={11} className="mr-1 inline align-[-1px] text-subtle" />
                    {r.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 공유 범위 선택 */}
      {shareOpen && (
        <div className="rounded-xl border border-line bg-card soft-card p-3">
          <div className="mb-2.5 text-center text-[13px] font-medium">무엇을 공유할까요?</div>
          <div className="flex gap-2">
            <button onClick={() => startShare([quarter])} className="flex-1 rounded-[10px] border border-line bg-card py-2.5 text-center text-[13px] font-medium">
              이번 쿼터만<br /><span className="text-[11px] text-subtle">{quarter}쿼터</span>
            </button>
            <button onClick={() => startShare(QUARTERS)} className="flex-1 rounded-[10px] bg-navy py-2.5 text-center text-[13px] font-medium text-white">
              전체 쿼터<br /><span className="text-[11px] text-white/70">1~4쿼터 한 장</span>
            </button>
          </div>
          <button onClick={() => setShareOpen(false)} className="mt-2 w-full py-1 text-[12px] text-subtle">취소</button>
        </div>
      )}

      {/* 하단 액션 */}
      <div className="flex gap-2">
        {isManager && (
          <button onClick={resetQuarter} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-card py-2.5 text-[13px] text-muted">
            <RotateCcw size={14} /> 초기화
          </button>
        )}
        <button onClick={() => setShareOpen((v) => !v)} disabled={captureQs != null} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy py-2.5 text-[13px] font-medium text-white disabled:opacity-60">
          <Share2 size={14} /> {captureQs != null ? "생성 중…" : "공유"}
        </button>
        {isManager && (
          <button onClick={save} disabled={saving} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red py-2.5 text-[13px] font-medium text-white disabled:opacity-50">
            <Save size={14} /> {saved ? "수정 저장" : "저장"}
          </button>
        )}
      </div>

      {/* 숨은 캡처 노드 (공유 이미지 생성용) */}
      {captureQs && (
        <div style={{ position: "fixed", left: -99999, top: 0, pointerEvents: "none" }} aria-hidden>
          <div ref={captureRef} style={{ width: 380, background: "#0b1f14", padding: "18px 16px 14px", fontFamily: "inherit" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(150deg,#2e6bff,#14213d)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>SDN</div>
              <div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>SDN FC <span style={{ color: "#9fb2d6", fontWeight: 400 }}>vs {opponent}</span></div>
            </div>
            {captureQs.map((q) => (
              <div key={q} style={{ marginBottom: 14 }}>
                <div style={{ color: "#cfe0c9", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{q}쿼터 · {presetByQ[q]}</div>
                <div style={{ position: "relative", width: "100%", height: 220, borderRadius: 12, overflow: "hidden", background: "linear-gradient(160deg,#0f3d24,#0a2417)" }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: "50%", borderBottom: "1px solid rgba(255,255,255,.12)" }} />
                  <div style={{ position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)", width: 60, height: 26, border: "1px solid rgba(255,255,255,.2)", borderTop: "none", borderRadius: "0 0 8px 8px" }} />
                  {PRESETS[presetByQ[q]].map((slot, i) => {
                    const pid = assignByQ[q][i];
                    if (!pid) return null;
                    const player = nameById.get(pid);
                    if (!player) return null;
                    return (
                      <div key={i} style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", width: 64 }}>
                        <div style={{ width: 28, height: 28, borderRadius: "50%", border: "2px solid #fff", background: POSITION_COLOR[groupOf(slot.label)], color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>{slot.label}</div>
                        <div style={{ marginTop: 2, fontSize: 9, color: "#fff", textShadow: "0 1px 2px #000", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 64 }}>{player.name}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", color: "#5f7a68", fontSize: 10, marginTop: 2 }}>SDN FC · Saturday Night</div>
          </div>
        </div>
      )}
    </div>
  );
}
