"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus, UserMinus, RotateCcw, Check, Share2, ChevronDown, Search } from "lucide-react";
import { toPng } from "html-to-image";
import { POSITION_COLOR, type Position } from "@/lib/mock";
import { publishFormation, saveFormation } from "@/lib/actions/formations";
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
const TOTAL_SLOTS = 11 * 4; // 필드 11명 × 4쿼터

// 총 출전 쿼터 수 배지 색 (권장 범위 기준 상대 색)
function quarterBadgeColor(c: number, recLo: number, recHi: number): string {
  if (c >= recHi) return "#16b585"; // 충분
  if (c >= recLo) return "#2f9e8b"; // 권장 하한
  if (c === 0) return "#c2cad6"; // 미배치
  if (c >= recLo - 1) return "#e8912b"; // 약간 적음
  return "#dc2f3c"; // 매우 적음
}

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
  const [benchSort, setBenchSort] = useState<"name" | "low">("name");
  const [manageTab, setManageTab] = useState<"add" | "del">("add");
  const [manageQ, setManageQ] = useState("");
  const [manageSel, setManageSel] = useState<Set<string>>(new Set());
  const [shareOpen, setShareOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [captureQs, setCaptureQs] = useState<number[] | null>(null);
  const [publishing, setPublishing] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [pendingPlayer, setPendingPlayer] = useState<string | null>(null);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const pitchRef = useRef<HTMLDivElement>(null);
  const benchRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const lastObservedLayoutRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef(Promise.resolve(true));
  const saveVersionRef = useRef(0);
  const initializedQuartersRef = useRef(new Set(
    QUARTERS.filter((q) => (initial?.[q]?.assignments.length ?? 0) > 0),
  ));
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

  // 선수별 총 출전 쿼터 수 (전 쿼터 배치 합산) + 공평 가이드
  const quarterCountById = new Map<string, number>();
  for (const q of QUARTERS) {
    for (const id of new Set(Object.values(assignByQ[q]))) {
      quarterCountById.set(id, (quarterCountById.get(id) ?? 0) + 1);
    }
  }
  const qCount = (id: string) => quarterCountById.get(id) ?? 0;
  const rec = pool.length ? TOTAL_SLOTS / pool.length : 0;
  const recLo = Math.floor(rec);
  const recHi = Math.ceil(rec);
  const avgQ = pool.length ? [...quarterCountById.values()].reduce((a, b) => a + b, 0) / pool.length : 0;
  const sortedBench =
    benchSort === "low"
      ? [...bench].sort((a, b) => qCount(a.id) - qCount(b.id) || a.name.localeCompare(b.name, "ko"))
      : [...bench].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  const layoutSignature = JSON.stringify({ presetByQ, assignByQ });

  function buildLayout(): FormationLayout {
    const layout: FormationLayout = {};
    for (const q of QUARTERS) {
      layout[q] = {
        preset: presetByQ[q],
        assignments: Object.entries(assignByQ[q]).map(([slot, memberId]) => ({ slot: Number(slot), memberId })),
      };
    }
    return layout;
  }

  function queueSave(layout: FormationLayout) {
    const version = ++saveVersionRef.current;
    setSaving(true);
    const job = saveQueueRef.current
      .catch(() => false)
      .then(async () => {
        const ok = await saveFormation(matchId, layout);
        if (version === saveVersionRef.current) {
          setSaving(false);
          if (ok) setSaved(true);
          else toast("포메이션을 저장하지 못했어요");
        }
        return ok;
      });
    saveQueueRef.current = job;
    return job;
  }

  function scrollTo(ref: React.RefObject<HTMLDivElement | null>) {
    window.setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  useEffect(() => {
    if (!isManager) return;
    if (lastObservedLayoutRef.current === layoutSignature) return;
    if (lastObservedLayoutRef.current === null) {
      lastObservedLayoutRef.current = layoutSignature;
      return;
    }
    lastObservedLayoutRef.current = layoutSignature;
    const timer = window.setTimeout(() => {
      autoSaveTimerRef.current = null;
      void queueSave(buildLayout());
    }, 800);
    autoSaveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (autoSaveTimerRef.current === timer) autoSaveTimerRef.current = null;
    };
  }, [isManager, layoutSignature]);

  function onSlotClick(i: number) {
    if (!isManager) return; // 회원은 보기 전용
    // 선수를 먼저 고른 상태 → 그 자리에 배치 (기존 선수는 밀려나 벤치로)
    if (pendingPlayer) {
      initializedQuartersRef.current.add(quarter);
      setAssignByQ((s) => ({ ...s, [quarter]: { ...s[quarter], [i]: pendingPlayer } }));
      setPendingPlayer(null);
      setSelected(null);
      return;
    }
    if (assign[i]) {
      // 채워진 자리 탭 → 비우기
      initializedQuartersRef.current.add(quarter);
      setAssignByQ((s) => {
        const a = { ...s[quarter] };
        delete a[i];
        return { ...s, [quarter]: a };
      });
      setSelected(null);
    } else {
      setSelected((cur) => (cur === i ? null : i));
      scrollTo(benchRef);
    }
  }

  function fillFromBench(memberId: string) {
    if (!isManager) return; // 회원은 보기 전용
    // 자리를 먼저 고른 상태 → 그 자리에 배치
    if (selected !== null && !assign[selected]) {
      const slot = selected;
      initializedQuartersRef.current.add(quarter);
      setAssignByQ((s) => ({ ...s, [quarter]: { ...s[quarter], [slot]: memberId } }));
      setSelected(null);
      setPendingPlayer(null);
      scrollTo(pitchRef);
      return;
    }
    // 아니면 이 선수를 '배치 대기'로 (다시 탭하면 해제) → 이후 빈 자리 탭
    setPendingPlayer((cur) => (cur === memberId ? null : memberId));
    setSelected(null);
    scrollTo(pitchRef);
  }

  // 배치된 선수 위치 교환/이동 (드래그앤드롭)
  function moveSlot(from: number, to: number) {
    if (from === to) return;
    initializedQuartersRef.current.add(quarter);
    setAssignByQ((s) => {
      const a = { ...s[quarter] };
      const fromPid = a[from];
      if (!fromPid) return s;
      const toPid = a[to];
      if (toPid) { a[from] = toPid; a[to] = fromPid; } // 서로 교환
      else { a[to] = fromPid; delete a[from]; } // 빈 자리로 이동
      return { ...s, [quarter]: a };
    });
  }

  function slotPointerDown(e: React.PointerEvent, i: number) {
    if (!isManager) return; // 회원은 드래그 불가
    if (!assign[i]) return; // 배치된 선수만 드래그
    dragStartRef.current = { x: e.clientX, y: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragFrom(i);
  }
  function slotPointerMove(e: React.PointerEvent) {
    if (dragFrom === null || !dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!dragStartRef.current.moved && Math.hypot(dx, dy) < 6) return;
    dragStartRef.current.moved = true;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (rect) setDragPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }
  function slotPointerUp(e: React.PointerEvent) {
    if (dragFrom === null) return;
    const moved = dragStartRef.current?.moved;
    const rect = pitchRef.current?.getBoundingClientRect();
    if (moved && rect) {
      const px = ((e.clientX - rect.left) / rect.width) * 100;
      const py = ((e.clientY - rect.top) / rect.height) * 100;
      let best = -1, bestD = Infinity;
      slots.forEach((sl, idx) => { const d = Math.hypot(sl.x - px, sl.y - py); if (d < bestD) { bestD = d; best = idx; } });
      if (best >= 0 && bestD < 16 && best !== dragFrom) moveSlot(dragFrom, best);
      suppressClickRef.current = true; // 드래그 뒤 따라오는 click(비우기) 무시
    }
    setDragFrom(null);
    setDragPos(null);
    dragStartRef.current = null;
  }
  function slotClick(i: number) {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    onSlotClick(i);
  }

  function applyPreset(name: string) {
    initializedQuartersRef.current.add(quarter);
    setPresetByQ((s) => ({ ...s, [quarter]: name }));
    setSelected(null);
  }

  function toggleManageSel(id: string) {
    setManageSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function switchManageTab(t: "add" | "del") {
    setManageTab(t);
    setManageSel(new Set());
    setManageQ("");
  }

  // 선택한 회원 일괄 처리: 추가=대리 참석(going), 제거=미정(undecided)로 되돌림
  function applyManage() {
    if (manageSel.size === 0) return;
    const ids = [...manageSel];
    const status = manageTab === "add" ? "going" : "undecided";
    startAdd(async () => {
      for (const id of ids) await setAttendanceFor(matchId, id, status);
      toast(manageTab === "add" ? `${ids.length}명 참석 추가됐어요` : `${ids.length}명 명단에서 제거됐어요`);
      setManageSel(new Set());
      setShowRoster(false);
      router.refresh();
    });
  }

  // 현재 쿼터 라인업만 비우기
  function resetQuarter() {
    if (Object.keys(assign).length === 0) return;
    if (!window.confirm(`${quarter}쿼터 라인업을 초기화할까요?`)) return;
    initializedQuartersRef.current.add(quarter);
    setAssignByQ((s) => ({ ...s, [quarter]: {} }));
    setSelected(null);
    toast(`${quarter}쿼터 라인업을 비웠어요`);
  }

  async function startShare(qs: number[]) {
    setShareOpen(false);
    if (isManager) {
      if (autoSaveTimerRef.current !== null) {
        window.clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setPublishing(true);
      const savedNow = await queueSave(buildLayout());
      if (!savedNow) {
        setPublishing(false);
        return;
      }
      const published = await publishFormation(matchId);
      setPublishing(false);
      if (!published) {
        toast("라인업 알림을 보내지 못했어요");
        return;
      }
      toast("라인업 알림을 보냈어요");
    }
    setCaptureQs(qs);
  }

  function selectQuarter(nextQuarter: number) {
    if (
      nextQuarter === quarter + 1
      && !initializedQuartersRef.current.has(nextQuarter)
      && Object.keys(assignByQ[nextQuarter]).length === 0
    ) {
      const previousQuarter = nextQuarter - 1;
      initializedQuartersRef.current.add(nextQuarter);
      setPresetByQ((s) => ({ ...s, [nextQuarter]: s[previousQuarter] }));
      setAssignByQ((s) => ({ ...s, [nextQuarter]: { ...s[previousQuarter] } }));
    }
    setQuarter(nextQuarter);
    setSelected(null);
    setPendingPlayer(null);
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
          <button key={q} onClick={() => selectQuarter(q)} className={`flex-1 rounded-lg py-2 text-[13px] font-medium ${quarter === q ? "bg-navy text-white" : "border border-line bg-card text-muted"}`}>
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
          {isManager && (
            <span className="shrink-0 text-[10px] text-subtle">{saving ? "저장 중…" : "자동 저장"}</span>
          )}
          <span className="truncate text-[13px] text-muted">vs {opponent} · {preset} · {filled}/11</span>
        </div>
      </div>

      {/* 액션 — 포메이션(드롭다운) · 초기화 · 공유 */}
      <div className="relative flex gap-1.5">
        {isManager && (
          <>
            <button onClick={() => setPresetOpen((v) => !v)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-card py-2.5 text-[12px] font-bold text-fg">
              {preset} <ChevronDown size={13} className="text-subtle" />
            </button>
            {presetOpen && (
              <div className="absolute top-[calc(100%+6px)] left-0 z-10 w-40 overflow-hidden rounded-xl border border-line bg-card soft-card">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => { applyPreset(name); setPresetOpen(false); }}
                    className={`flex w-full items-center justify-between px-3.5 py-2.5 text-[13px] ${preset === name ? "bg-tint font-bold text-accent" : "text-fg"}`}
                  >
                    {name} {preset === name && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
            <button onClick={resetQuarter} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-line bg-card py-2.5 text-[12px] text-muted">
              <RotateCcw size={13} /> 초기화
            </button>
          </>
        )}
        <button onClick={() => setShareOpen((v) => !v)} disabled={captureQs != null || publishing} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-navy py-2.5 text-[12px] font-medium text-white disabled:opacity-60">
          <Share2 size={13} /> {captureQs != null ? "생성 중…" : "공유"}
        </button>
      </div>

      {/* 공유 범위 선택 */}
      {shareOpen && (
        <div className="rounded-xl border border-line bg-card soft-card p-3">
          <div className="mb-2.5 text-center text-[13px] font-medium">무엇을 공유할까요?</div>
          <div className="flex gap-2">
            <button onClick={() => { void startShare([quarter]); }} disabled={publishing} className="flex-1 rounded-[10px] border border-line bg-card py-2.5 text-center text-[13px] font-medium disabled:opacity-50">
              이번 쿼터만<br /><span className="text-[11px] text-subtle">{quarter}쿼터</span>
            </button>
            <button onClick={() => { void startShare(QUARTERS); }} disabled={publishing} className="flex-1 rounded-[10px] bg-navy py-2.5 text-center text-[13px] font-medium text-white disabled:opacity-50">
              전체 쿼터<br /><span className="text-[11px] text-white/70">1~4쿼터 한 장</span>
            </button>
          </div>
          <button onClick={() => setShareOpen(false)} className="mt-2 w-full py-1 text-[12px] text-subtle">취소</button>
        </div>
      )}

      <div className="text-center text-[11px] text-subtle">
        {!isManager
          ? "라인업 보기 · 쿼터 탭으로 전환"
          : pendingPlayer
            ? `${nameById.get(pendingPlayer)?.name ?? ""} 선수를 넣을 자리를 탭하세요`
            : selected !== null
              ? `${slots[selected].label} 자리 · 아래에서 선수를 탭하세요`
              : "빈 자리·선수를 탭해 배치 · 배치된 선수는 드래그로 위치 교환"}
      </div>

      {/* 피치 */}
      <div ref={pitchRef} className="relative w-full select-none">
        <Pitch />
        <div className="absolute inset-0">
          {slots.map((slot, i) => {
            const pid = assign[i];
            const player = pid ? nameById.get(pid) : null;
            const isSel = selected === i;
            const droppable = !!pendingPlayer && !player;
            return (
              <button
                key={i}
                onClick={() => slotClick(i)}
                onPointerDown={(e) => slotPointerDown(e, i)}
                onPointerMove={slotPointerMove}
                onPointerUp={slotPointerUp}
                style={{ position: "absolute", left: `${slot.x}%`, top: `${slot.y}%`, transform: "translate(-50%,-50%)", touchAction: "none", opacity: dragFrom === i ? 0.35 : 1 }}
                className="flex flex-col items-center"
              >
                {player ? (
                  <>
                    <span className="relative">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium leading-none text-white shadow-md" style={{ background: POSITION_COLOR[groupOf(slot.label)] }}>
                        {slot.label}
                      </span>
                      <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border border-white/90 px-1 text-[8px] font-extrabold leading-none text-white" style={{ background: quarterBadgeColor(qCount(pid), recLo, recHi) }}>
                        {qCount(pid)}Q
                      </span>
                    </span>
                    <span className="mt-0.5 text-[10px] text-white" style={{ textShadow: "0 1px 2px #000" }}>{player.name}</span>
                  </>
                ) : (
                  <>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-[10px] font-medium leading-none ${isSel || droppable ? "border-solid border-white bg-white/25 text-white" : "border-dashed border-white/60 text-white/80"}`}>
                      {slot.label}
                    </span>
                    <span className="mt-0.5 text-[9px] text-white/60">비어있음</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {dragFrom !== null && dragPos && assign[dragFrom] && (
          <div style={{ position: "absolute", left: dragPos.x, top: dragPos.y, transform: "translate(-50%,-50%)", pointerEvents: "none", zIndex: 20 }} className="flex flex-col items-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium leading-none text-white shadow-lg" style={{ background: POSITION_COLOR[groupOf(slots[dragFrom].label)] }}>
              {slots[dragFrom].label}
            </span>
          </div>
        )}
      </div>

      {/* 벤치 (운영진만 편집) */}
      {isManager && (
      <div ref={benchRef} className="rounded-xl border border-divider bg-card soft-card p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-[12px] text-muted">
            {pendingPlayer ? (
              <span className="text-accent">{nameById.get(pendingPlayer)?.name} 선택됨 · 자리를 탭하세요</span>
            ) : selected !== null ? (
              <span className="text-red">{slots[selected].label} 자리에 넣을 선수 선택</span>
            ) : (
              <>미배정 <span className="text-faint">{bench.length}명</span> · 탭하면 배치</>
            )}
          </div>
          {bench.length > 0 && pendingPlayer === null && selected === null && (
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => setBenchSort("name")}
                className={`rounded-md px-2 py-1 text-[11px] font-bold ${benchSort === "name" ? "bg-navy text-white" : "bg-sunken text-muted"}`}
              >
                이름순
              </button>
              <button
                onClick={() => setBenchSort("low")}
                className={`rounded-md px-2 py-1 text-[11px] font-bold ${benchSort === "low" ? "bg-navy text-white" : "bg-sunken text-muted"}`}
              >
                덜 뛴 순
              </button>
            </div>
          )}
        </div>

        {bench.length > 0 && (
          <div className="mb-2.5 rounded-lg bg-sunken px-2.5 py-1.5 text-[11px] text-subtle">
            평균 <b className="text-accent">{avgQ.toFixed(1)}</b>쿼터 · 참석 {pool.length}명 · 권장 {recLo === recHi ? recLo : `${recLo}~${recHi}`}쿼터
          </div>
        )}

        {bench.length === 0 ? (
          <div className="py-1 text-center text-[12px] text-faint">전원 배치됨</div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {sortedBench.map((p) => {
              const active = pendingPlayer === p.id;
              const c = qCount(p.id);
              const low = !active && c < recLo;
              return (
                <button
                  key={p.id}
                  onClick={() => fillFromBench(p.id)}
                  style={low ? { borderColor: quarterBadgeColor(c, recLo, recHi) } : undefined}
                  className={`flex items-center gap-1.5 rounded-[11px] border px-2.5 py-2 text-[13px] ${active ? "border-accent bg-tint font-bold text-accent" : low ? "bg-sunken" : "border-line bg-sunken"}`}
                >
                  <Plus size={13} className={active ? "text-accent" : "text-subtle"} />
                  <span className="min-w-0 flex-1 truncate text-left">{p.name}</span>
                  <span className="flex h-[18px] min-w-[24px] items-center justify-center rounded-full px-1.5 text-[10px] font-extrabold text-white" style={{ background: quarterBadgeColor(c, recLo, recHi) }}>
                    {c}Q
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {isManager && (
          <div className="mt-3 border-t border-divider pt-3">
            <button onClick={() => setShowRoster((v) => !v)} className="flex items-center gap-1 text-[12px] text-blue">
              <UserPlus size={13} /> 명단 관리 (대리 참석·제거)
            </button>
            {showRoster && (() => {
              const q = manageQ.trim();
              const memberPool = pool.filter((p) => !p.id.startsWith("guest:"));
              const list = (manageTab === "add" ? roster : memberPool).filter((m) => m.name.includes(q));
              return (
                <div className="mt-2.5 space-y-2">
                  <div className="flex gap-1.5">
                    <button onClick={() => switchManageTab("add")} className={`flex-1 rounded-lg py-1.5 text-[12px] font-bold ${manageTab === "add" ? "bg-navy text-white" : "bg-sunken text-muted"}`}>미참석 추가 {roster.length}</button>
                    <button onClick={() => switchManageTab("del")} className={`flex-1 rounded-lg py-1.5 text-[12px] font-bold ${manageTab === "del" ? "bg-navy text-white" : "bg-sunken text-muted"}`}>참석자 제거 {memberPool.length}</button>
                  </div>

                  <div className="flex items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-2">
                    <Search size={14} className="text-subtle" />
                    <input value={manageQ} onChange={(e) => setManageQ(e.target.value)} placeholder="이름 검색" className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-subtle" />
                  </div>

                  {list.length === 0 ? (
                    <div className="py-3 text-center text-[12px] text-faint">{manageTab === "add" ? "추가할 미참석 회원이 없어요" : "참석자가 없어요"}</div>
                  ) : (
                    <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                      {list.map((m) => {
                        const on = manageSel.has(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleManageSel(m.id)}
                            className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left ${on ? "border-accent bg-tint" : "border-line bg-card"}`}
                          >
                            <span className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border ${on ? "border-accent bg-accent" : "border-line"}`}>
                              {on && <Check size={12} className="text-white" />}
                            </span>
                            <span className="flex-1 text-[13px]">{m.name}</span>
                            {m.number != null && <span className="text-[11px] text-subtle">{m.number}</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={applyManage}
                    disabled={manageSel.size === 0}
                    className={`flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold text-white disabled:opacity-40 ${manageTab === "add" ? "bg-accent" : "bg-danger"}`}
                  >
                    {manageTab === "add" ? <UserPlus size={14} /> : <UserMinus size={14} />}
                    {manageSel.size ? `선택 ${manageSel.size}명 ${manageTab === "add" ? "참석 추가" : "제거"}` : `${manageTab === "add" ? "추가" : "제거"}할 회원 선택`}
                  </button>
                </div>
              );
            })()}
          </div>
        )}
      </div>
      )}

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
