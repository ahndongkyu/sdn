import { PRESETS, type PoolPlayer, type QuarterLineup } from "@/lib/formation-layout";

export function LineupPitch({ lineup, pool, onSelect }: {
  lineup: QuarterLineup; pool: PoolPlayer[]; onSelect?: (slot: number) => void;
}) {
  return (
    <div className="relative h-[390px] w-full overflow-hidden rounded-2xl bg-[var(--lineup-grass)]" aria-label="선수 배치도">
      <div aria-hidden className="pointer-events-none absolute inset-3 rounded-sm border border-[var(--lineup-mark)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-1/2 border-t border-[var(--lineup-mark)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 size-[72px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[var(--lineup-mark)]" />
      <div aria-hidden className="pointer-events-none absolute left-1/4 top-3 h-[15%] w-1/2 border border-t-0 border-[var(--lineup-mark)]" />
      <div aria-hidden className="pointer-events-none absolute bottom-3 left-1/4 h-[15%] w-1/2 border border-b-0 border-[var(--lineup-mark)]" />
      {PRESETS[lineup.preset].map((slot, i) => {
        const player = pool.find(p => p.id === lineup.assignments.find(a => a.slot === i)?.memberId);
        const style = { left: `${slot.x}%`, top: `${slot.y}%`, translate: "-50% -50%" };
        const content = <>
          <span className={`mx-auto flex size-8 items-center justify-center rounded-full text-[11px] ${player ? "bg-card text-[var(--lineup-player)]" : "border border-dashed border-[var(--lineup-mark)] text-muted"}`}>{!player && onSelect ? "+" : slot.label}</span>
          <span className="mt-1 block w-full truncate rounded bg-[var(--lineup-grass)] text-xs leading-5">{player?.name ?? (onSelect ? `${slot.label} 선택` : "미배정")}</span>
        </>;
        return onSelect ? <button key={i} type="button" data-lineup-slot={i} onClick={() => onSelect(i)} style={style} aria-label={`${slot.label} ${player?.name ?? "빈 자리"} 선수 선택`} className="absolute min-h-14 w-[19%] rounded-lg text-center">{content}</button>
          : <div key={i} style={style} className="absolute w-[19%] text-center" aria-label={`${slot.label} ${player?.name ?? "미배정"}`}>{content}</div>;
      })}
    </div>
  );
}
