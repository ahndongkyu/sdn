import { CircleCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";

type Participant = { id: string; name: string; number: number | null; badgeBg: string; badgeFg: string };

export function ParticipantGrid({ participants, guests }: { participants: Participant[]; guests: { id: string; name: string }[] }) {
  return <div className="grid grid-cols-2 gap-2">
    {participants.map(p => <div key={p.id} className="flex items-center gap-2 rounded-xl border border-divider bg-card px-2.5 py-2">
      {p.number != null ? <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-xs" style={{ background: p.badgeBg, color: p.badgeFg }}>{p.number}</div> : <Avatar size={28} />}
      <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span><CircleCheck size={16} className="shrink-0 text-win" aria-hidden />
    </div>)}
    {guests.map(g => <div key={g.id} className="flex items-center gap-2 rounded-xl border border-dashed border-line bg-card px-2.5 py-2"><Avatar size={28} guest /><span className="min-w-0 flex-1 truncate text-sm">{g.name} <small className="text-muted">용병</small></span><CircleCheck size={16} className="shrink-0 text-win" aria-hidden /></div>)}
  </div>;
}
