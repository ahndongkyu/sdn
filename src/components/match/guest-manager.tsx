"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { addGuest, deleteGuest } from "@/lib/actions/guests";
import { toast } from "@/lib/toast";
import { POSITION_BADGE, type Position } from "@/lib/mock";

type Guest = { id: string; name: string; position1: Position };
const POS = ["FW", "MF", "DF", "GK"];

export function GuestManager({ matchId, guests }: { matchId: string; guests: Guest[] }) {
  const [name, setName] = useState("");
  const [pos, setPos] = useState("MF");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <div>
      <div className="mb-2 text-[13px] text-muted">용병 <span className="text-faint">{guests.length}명</span></div>

      {guests.length > 0 && (
        <div className="mb-2 space-y-1.5">
          {guests.map((g) => {
            const badge = POSITION_BADGE[g.position1];
            return (
              <div key={g.id} className="flex items-center gap-2.5 rounded-[10px] border border-divider bg-card px-2.5 py-2">
                <span className="rounded-[10px] px-2 py-0.5 text-[11px]" style={{ background: badge.bg, color: badge.fg }}>{g.position1}</span>
                <span className="flex-1 text-[13px]">{g.name} <span className="text-[10px] text-faint">용병</span></span>
                <button onClick={() => { if (!window.confirm(`${g.name} 용병을 삭제하시겠습니까?`)) return; start(async () => { setError(""); try { const result = await deleteGuest(matchId, g.id); if (!result.ok) { setError(result.message); return; } toast(result.message); } catch { setError("삭제 결과를 확인하지 못했어요. 명단을 다시 확인해주세요."); } }); }} disabled={pending} aria-label={`${g.name} 용병 삭제`} className="flex min-h-11 min-w-11 items-center justify-center">
                  <Trash2 size={15} className="text-faint" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && <p role="alert" className="mb-3 text-sm text-danger">{error}</p>}
      <p className="mb-2 text-xs text-muted">용병 추가·삭제는 즉시 저장돼요.</p>
      <div className="flex items-center gap-2">
        <input
          aria-label="용병 이름"
          disabled={pending}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="용병 이름"
          className="min-w-0 flex-1 rounded-lg border border-line bg-card px-3 py-2.5 text-base placeholder:text-subtle"
        />
        <select
          aria-label="용병 포지션"
          disabled={pending}
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          className="min-h-11 appearance-none w-[68px] shrink-0 rounded-lg border border-line bg-card px-2 py-2.5 text-sm outline-none"
        >
          {POS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          disabled={!name.trim() || pending}
          aria-label="용병 추가"
          onClick={() => start(async () => { setError(""); try { const result = await addGuest(matchId, name, pos); if (!result.ok) { setError(result.message); return; } toast(result.message); setName(""); } catch { setError("저장 결과를 확인하지 못했어요. 입력은 유지되니 명단을 확인해주세요."); } })}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy text-white disabled:opacity-40"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
