"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Share2, SlidersHorizontal, X } from "lucide-react";
import { publishFormation, saveFormation } from "@/lib/actions/formations";
import type { FormationLayout } from "@/lib/data/formations";
import { effectiveLineup, PRESETS, QUARTERS, readLineup, serializeLineup, updateLineup, type LineupDraft, type PoolPlayer, type QuarterLineup } from "@/lib/formation-layout";
import { createLineupImage } from "@/lib/lineup-image";
import { toast } from "@/lib/toast";
import { MatchWorkflow } from "@/components/match/match-workflow";
import { LineupPitch } from "./lineup-pitch";

export type { PoolPlayer } from "@/lib/formation-layout";
const secondary = "min-h-11 rounded-xl border border-line bg-card px-3 py-2 text-sm disabled:opacity-50";
const primary = "min-h-12 w-full rounded-xl bg-accent px-3 py-3 text-sm font-bold text-white disabled:opacity-50";

export function MatchFormation({ matchId, opponent, details, pool, isManager, initial }: {
  matchId: string; opponent: string; details: string; pool: PoolPlayer[];
  isManager: boolean; initial: FormationLayout | null;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => readLineup(initial, pool));
  const [quarter, setQuarter] = useState<number | "base">(isManager ? "base" : 1);
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareQuarter, setShareQuarter] = useState(1);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "dirty" | "saving" | "error">(initial ? "saved" : "idle");
  const [busy, setBusy] = useState(false);
  const [generated, setGenerated] = useState<{ url: string; file: File } | null>(null);
  const [canShare, setCanShare] = useState(false);
  const [search, setSearch] = useState("");
  const draftRef = useRef(draft);
  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const urlRef = useRef<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const lineup = effectiveLineup(draft, quarter);
  const assignedIds = new Set(lineup.assignments.map(a => a.memberId));
  const bench = pool.filter(p => !assignedIds.has(p.id));
  const customCount = Object.keys(draft.overrides).length;

  const persist = useCallback((snapshot: LineupDraft, revision: number) => {
    setSaveStatus("saving");
    const job = queueRef.current.catch(() => false).then(async () => {
      let ok = false;
      try { ok = await saveFormation(matchId, serializeLineup(snapshot)); } catch { /* 재시도 버튼으로 복구 */ }
      if (revision === revisionRef.current) {
        dirtyRef.current = !ok;
        setSaveStatus(ok ? "saved" : "error");
      }
      return ok;
    });
    queueRef.current = job;
    return job;
  }, [matchId]);

  const flush = useCallback(async () => {
    if (!isManager) return true;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (!dirtyRef.current) return queueRef.current;
    return persist(draftRef.current, revisionRef.current);
  }, [isManager, persist]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      if (timerRef.current) clearTimeout(timerRef.current);
      // 다른 앱 내 메뉴로 이동해도 마지막 편집값을 저장한다.
      if (dirtyRef.current) void flush();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [flush]);

  useEffect(() => {
    if (selected !== null) {
      pickerRef.current?.scrollIntoView({ block: "nearest" });
      pickerRef.current?.querySelector("input")?.focus({ preventScroll: true });
    }
  }, [selected]);

  function change(next: LineupDraft) {
    if (!isManager || busy) return;
    setDraft(next); draftRef.current = next;
    dirtyRef.current = true;
    const revision = ++revisionRef.current;
    setSaveStatus("dirty");
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null; setGenerated(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void persist(next, revision);
    }, 600);
  }

  function edit(next: QuarterLineup) { change(updateLineup(draftRef.current, quarter, next)); }
  function closePicker() {
    const slot = selected;
    setSelected(null); setSearch("");
    requestAnimationFrame(() => boardRef.current?.querySelector<HTMLButtonElement>(`[data-lineup-slot="${slot}"]`)?.focus({ preventScroll: true }));
  }
  function assign(memberId?: string) {
    if (selected === null) return;
    edit({ ...lineup, assignments: [...lineup.assignments.filter(a => a.slot !== selected && a.memberId !== memberId), ...(memberId ? [{ slot: selected, memberId }] : [])].sort((a, b) => a.slot - b.slot) });
    closePicker();
  }
  async function navigate(path: string) {
    setBusy(true);
    if (await flush()) router.push(path);
    else toast("저장하지 못했어요. 다시 시도해 주세요.");
    setBusy(false);
  }
  function switchQuarter(q: number | "base") {
    setQuarter(q); setSelected(null); setSearch("");
    requestAnimationFrame(() => editorRef.current?.scrollIntoView({ block: "start" }));
  }
  function setSharing(open: boolean) {
    setShareOpen(open);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ block: "start" }));
  }
  async function generate() {
    setBusy(true);
    try {
      if (!(await flush())) { toast("라인업 저장 후 다시 시도해 주세요."); return; }
      const blob = await createLineupImage(draftRef.current, pool, opponent, details);
      const file = new File([blob], `SDN_라인업_${opponent.replace(/[\\/:*?"<>|]/g, "_")}_전체.png`, { type: "image/png" });
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setGenerated({ url, file });
      setCanShare(Boolean(navigator.canShare?.({ files: [file] })));
    } catch { toast("공유 이미지를 만들지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  async function shareFile() {
    if (!generated) return;
    setBusy(true);
    try { await navigator.share({ files: [generated.file], title: "SDN 라인업" }); }
    catch (error) { if ((error as Error).name !== "AbortError") toast("공유하지 못했어요. 이미지 저장을 이용해 주세요."); }
    finally { setBusy(false); }
  }
  async function notify() {
    setBusy(true);
    try {
      if (!(await flush())) { toast("라인업 저장 후 알림을 보낼 수 있어요."); return; }
      toast(await publishFormation(matchId) ? "참석자에게 라인업 알림을 보냈어요" : "알림을 보내지 못했어요");
    } catch { toast("알림을 보내지 못했어요. 다시 시도해 주세요."); }
    finally { setBusy(false); }
  }
  const shown = effectiveLineup(draft, shareQuarter);

  return <div ref={topRef} className="lineup-surface space-y-4">
    <div className="flex items-center justify-between">
      <button type="button" disabled={busy} onClick={() => shareOpen ? setSharing(false) : void navigate(`/matches/${matchId}`)} className="flex min-h-11 items-center gap-2 text-[15px] font-medium"><ArrowLeft size={20} />포메이션</button>
      {isManager && <span className="rounded-lg bg-tint px-2 py-1 text-xs text-accent">운영진</span>}
    </div>
    {shareOpen ? <>
      <div className="flex items-center justify-between"><h1 className="text-base font-bold">라인업 공유 미리보기</h1><button type="button" aria-label="공유 미리보기 닫기" disabled={busy} onClick={() => setSharing(false)} className="flex size-11 items-center justify-center"><X size={20} /></button></div>
      <QuarterTabs value={shareQuarter} onChange={setShareQuarter} />
      <section className="space-y-3 rounded-2xl border border-line bg-card p-3" aria-label={`${shareQuarter}쿼터 공유 미리보기`}>
        <div><h2 className="break-words font-bold">SDN FC <span className="text-sm font-normal text-muted">vs {opponent}</span></h2><p className="mt-1 text-xs text-muted">{details}</p></div>
        <div className="flex justify-between text-xs"><span>{shareQuarter}쿼터</span><span className="text-muted">{shown.preset}</span></div>
        <LineupPitch lineup={shown} pool={pool} />
        <p className="border-t border-line pt-3 text-xs text-muted">{shareQuarter}쿼터 · {shown.assignments.length}/11명 배치 · 참석 {pool.length}명</p>
      </section>
      <p className="text-xs text-muted">쿼터를 눌러 선수 배치를 하나씩 확인하세요.</p>
      <div className="rounded-xl bg-tint p-4"><p className="text-sm font-bold">공유할 때는 전체를 한 장으로</p><p className="mt-1 text-xs text-muted">1~4쿼터를 고해상도 2×2 이미지로 만들어요.</p></div>
      <button type="button" onClick={() => void generate()} disabled={busy} className={primary}>{busy ? "처리 중…" : "전체 4쿼터 이미지 만들기"}</button>
      {generated && <section className="space-y-3 rounded-xl border border-line bg-card p-3">
        <div role="status"><h2 className="text-sm font-bold">공유 이미지 준비 완료</h2><p className="mt-1 text-xs text-muted">2400 × 3200px · PNG · 1~4쿼터 2×2</p></div>
        <Image unoptimized src={generated.url} alt="1~4쿼터 라인업을 2×2로 묶은 공유 이미지" width={2400} height={3200} className="h-auto w-full rounded-lg" />
        {canShare && <button type="button" onClick={() => void shareFile()} disabled={busy} className={primary}>이미지 공유하기</button>}
        <a href={generated.url} download={generated.file.name} className={`${secondary} flex w-full items-center justify-center`}>이미지 저장</a>
      </section>}
      {isManager && <button type="button" onClick={() => void notify()} disabled={busy} className={`${secondary} w-full`}>참석자에게 라인업 알림 보내기</button>}
      <button type="button" disabled={busy} onClick={() => setSharing(false)} className={`${secondary} w-full`}>{isManager ? "라인업 편집으로 돌아가기" : "라인업으로 돌아가기"}</button>
    </> : <>
      {isManager && <MatchWorkflow current={2} />}
      <div><h1 className="text-xl font-bold">{isManager ? "오늘 뛸 자리를 정해요" : "오늘의 라인업"}</h1><p className="mt-1 text-xs text-muted">vs {opponent} · 참석 {pool.length}명</p></div>
      {!isManager && <QuarterTabs value={quarter as number} onChange={switchQuarter} />}
      <div ref={editorRef} className="scroll-mt-4 flex items-center justify-between gap-3">
        <div><h2 className="text-sm font-bold">{quarter === "base" ? "기본 라인업" : `${quarter}쿼터 라인업`}</h2><p className="mt-1 text-xs text-muted">{quarter === "base" ? customCount ? "별도 배치한 쿼터 제외 · 공통 적용" : "1~4쿼터 공통" : draft.overrides[quarter] ? "이 쿼터만 별도로 배치" : "기본 라인업 사용 중"}</p></div>
        {isManager ? <label><span className="sr-only">포메이션 선택</span><select value={lineup.preset} disabled={selected !== null || busy} onChange={e => edit({ ...lineup, preset: e.target.value })} className="min-h-11 appearance-none rounded-xl border border-line bg-card px-3 text-base font-medium">{Object.keys(PRESETS).map(p => <option key={p}>{p}</option>)}</select></label> : <span className="text-sm text-muted">{lineup.preset}</span>}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{lineup.assignments.length} / 11명 배치</span>{isManager && <span role="status">{saveStatus === "error" ? <button type="button" onClick={() => void flush()} className="min-h-11 text-danger">저장 실패 · 다시 시도</button> : saveStatus === "saving" || saveStatus === "dirty" ? "저장 중…" : saveStatus === "idle" ? "자동 저장" : "자동 저장됨"}</span>}</div>
      {selected === null ? <div ref={boardRef}><LineupPitch lineup={lineup} pool={pool} onSelect={isManager ? slot => setSelected(slot) : undefined} /><p className="mt-3 text-center text-xs text-muted">{isManager ? "빈 자리나 선수를 누르면 배치·교체할 수 있어요." : "쿼터를 눌러 선수 배치를 확인하세요."}</p></div> : <section ref={pickerRef} aria-label="선수 선택" className="min-h-[390px] rounded-2xl border border-line bg-card p-4" onKeyDown={e => { if (e.key === "Escape") closePicker(); }}>
        <div className="flex items-center justify-between"><h2 className="font-bold">{PRESETS[lineup.preset][selected].label} 선수 선택</h2><button type="button" aria-label="선수 선택 닫기" onClick={closePicker} className="flex size-11 items-center justify-center"><X size={20} /></button></div>
        <p className="mb-3 text-xs text-muted">현재 라인업에 아직 배치되지 않은 선수</p>
        <label><span className="sr-only">선수 이름 검색</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="이름 검색" className="input !text-base" /></label>
        <div className="mt-3 grid grid-cols-2 gap-2">{pool.filter(p => (!assignedIds.has(p.id) || lineup.assignments.some(a => a.slot === selected && a.memberId === p.id)) && p.name.includes(search.trim())).map(p => <button type="button" key={p.id} onClick={() => assign(p.id)} aria-pressed={lineup.assignments.some(a => a.slot === selected && a.memberId === p.id)} className={`${secondary} break-words text-left aria-pressed:border-accent aria-pressed:bg-tint`}>{p.name}</button>)}</div>
        {bench.length === 0 && !lineup.assignments.some(a => a.slot === selected) && <p className="mt-4 text-sm text-muted">배치할 대기 선수가 없어요.</p>}
        {lineup.assignments.some(a => a.slot === selected) && <button type="button" onClick={() => assign()} className="mt-3 min-h-11 w-full text-sm text-accent">이 자리 비우기</button>}
      </section>}
      <section className="rounded-2xl border border-line bg-card p-4">
        <div className="flex items-center justify-between gap-2"><h2 className="text-sm font-bold">대기 선수 {bench.length}명</h2>{isManager && <button type="button" disabled={busy} onClick={() => void navigate(`/admin/matches/${matchId}/attendance`)} className="min-h-11 text-sm text-accent">참석 관리 ›</button>}</div>
        <div className="mt-2 flex flex-wrap gap-2">{bench.map(p => <span key={p.id} className="rounded-lg bg-sunken px-2 py-2 text-xs text-muted">{p.name}</span>)}</div>
        {pool.length === 0 && <p className="mt-2 text-sm text-muted">참석자를 등록하면 라인업을 배치할 수 있어요.</p>}
        {pool.length > 0 && !bench.length && <p className="mt-2 text-xs text-muted">참석자 전원이 배치됐어요.</p>}
      </section>
      {isManager && <section className="rounded-2xl border border-line bg-card p-4">
        <button type="button" aria-expanded={expanded} aria-controls="quarter-options" onClick={() => { setExpanded(!expanded); if (expanded) switchQuarter("base"); }} className="flex min-h-11 w-full items-center justify-between gap-3 text-left"><span><strong className="text-sm">쿼터별로 다르게 배치</strong><small className="mt-1 block text-xs text-muted">{customCount ? `${customCount}개 쿼터 별도 배치 중` : "필요한 쿼터만 바꿔도 돼요"}</small></span><SlidersHorizontal className="shrink-0" size={18} /></button>
        {expanded && <div id="quarter-options" className="mt-3 space-y-3">
          <div className="flex gap-1" role="group" aria-label="편집할 라인업">{(["base", ...QUARTERS] as const).map(q => <button type="button" key={q} onClick={() => switchQuarter(q)} aria-pressed={quarter === q} className="min-h-14 min-w-0 flex-1 rounded-lg border border-line bg-sunken px-1 text-xs aria-pressed:border-accent aria-pressed:bg-tint aria-pressed:text-accent">{q === "base" ? "기본" : `${q}Q`}<small className="mt-1 block">{q === "base" ? "공통" : draft.overrides[q] ? "별도" : "기본"}</small></button>)}</div>
          <p className="text-xs text-muted">별도로 바꾸지 않은 쿼터는 기본 라인업을 따라가요.</p>
          {quarter !== "base" && draft.overrides[quarter] && <button type="button" onClick={() => { const overrides = { ...draft.overrides }; delete overrides[quarter]; change({ ...draft, overrides }); setSelected(null); }} className="min-h-11 text-left text-sm text-accent">이 쿼터를 기본 라인업으로 되돌리기</button>}
        </div>}
      </section>}
      <button type="button" onClick={() => { setShareQuarter(quarter === "base" ? 1 : quarter); setSharing(true); }} className={`${primary} flex items-center justify-center gap-2`}><Share2 size={17} />라인업 공유하기</button>
      {isManager && <button type="button" disabled={busy} onClick={() => void navigate(`/admin/matches/${matchId}/result`)} className="min-h-11 w-full text-sm text-accent">경기 끝났나요? 결과 입력 →</button>}
    </>}
  </div>;
}

function QuarterTabs({ value, onChange }: { value: number; onChange: (q: number) => void }) {
  return <div className="flex gap-1 rounded-xl border border-line bg-card p-1" role="group" aria-label="미리 볼 쿼터">
    {QUARTERS.map(q => <button type="button" key={q} aria-pressed={value === q} onClick={() => onChange(q)} className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${value === q ? "bg-tint text-accent" : "text-muted"}`}>{q}Q</button>)}
  </div>;
}
