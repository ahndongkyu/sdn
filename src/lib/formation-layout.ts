import type { FormationLayout } from "./data/formations";

type Slot = { x: number; y: number; label: string };

// 포메이션별 자리값 고정 (세로 피치, 위쪽=공격). 표시 순서 = 이 순서.
export const PRESETS: Record<string, Slot[]> = {
  "4-1-2-3": [
    { x: 50, y: 90, label: "GK" },
    { x: 13, y: 71, label: "LB" }, { x: 38, y: 73, label: "CB" }, { x: 62, y: 73, label: "CB" }, { x: 87, y: 71, label: "RB" },
    { x: 50, y: 53, label: "CDM" },
    { x: 29, y: 35, label: "CM" }, { x: 71, y: 35, label: "CM" },
    { x: 17, y: 13, label: "LW" }, { x: 50, y: 11, label: "ST" }, { x: 83, y: 13, label: "RW" },
  ],
  "4-2-3-1": [
    { x: 50, y: 90, label: "GK" },
    { x: 18, y: 74, label: "LB" }, { x: 40, y: 74, label: "CB" }, { x: 60, y: 74, label: "CB" }, { x: 82, y: 74, label: "RB" },
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
    { x: 30, y: 74, label: "CB" }, { x: 50, y: 74, label: "CB" }, { x: 70, y: 74, label: "CB" },
    { x: 10, y: 54, label: "LM" }, { x: 30, y: 52, label: "CM" }, { x: 50, y: 50, label: "CDM" }, { x: 70, y: 52, label: "CM" }, { x: 90, y: 54, label: "RM" },
    { x: 38, y: 22, label: "ST" }, { x: 62, y: 22, label: "ST" },
  ],
};

export const QUARTERS = [1, 2, 3, 4] as const;
export type QuarterLineup = FormationLayout[string];
export type LineupDraft = { base: QuarterLineup; overrides: Record<number, QuarterLineup> };
export type PoolPlayer = { id: string; name: string; number: number | null };

function clean(lineup: QuarterLineup | undefined, ids: Set<string>): QuarterLineup {
  const seen = new Set<string>();
  const slots = new Set<number>();
  return {
    preset: lineup && PRESETS[lineup.preset] ? lineup.preset : "4-1-2-3",
    assignments: (lineup?.assignments ?? []).filter(({ slot, memberId }) => {
      if (!Number.isInteger(slot) || slot < 0 || slot >= 11 || !ids.has(memberId) || seen.has(memberId) || slots.has(slot)) return false;
      seen.add(memberId); slots.add(slot); return true;
    }).sort((a, b) => a.slot - b.slot),
  };
}

export function readLineup(initial: FormationLayout | null, pool: PoolPlayer[]): LineupDraft {
  const ids = new Set(pool.map(p => p.id));
  const base = clean(initial?.base ?? initial?.[1], ids);
  const overrides: Record<number, QuarterLineup> = {};
  for (const q of QUARTERS) {
    // 과거 쿼터별 저장값은 빈 쿼터까지 보존한다.
    const explicit = initial?.[`override:${q}`];
    const lineup = clean(explicit ?? initial?.[q], ids);
    if (explicit || (initial && JSON.stringify(lineup) !== JSON.stringify(base))) overrides[q] = lineup;
  }
  return { base, overrides };
}

export function effectiveLineup(draft: LineupDraft, q: number | "base"): QuarterLineup {
  return q === "base" ? draft.base : draft.overrides[q] ?? draft.base;
}

export function updateLineup(draft: LineupDraft, q: number | "base", lineup: QuarterLineup): LineupDraft {
  return q === "base" ? { ...draft, base: lineup } : { ...draft, overrides: { ...draft.overrides, [q]: lineup } };
}

export function serializeLineup(draft: LineupDraft): FormationLayout {
  return {
    base: draft.base,
    ...Object.fromEntries(QUARTERS.map(q => [q, effectiveLineup(draft, q)])),
    ...Object.fromEntries(Object.entries(draft.overrides).map(([q, lineup]) => [`override:${q}`, lineup])),
  };
}
