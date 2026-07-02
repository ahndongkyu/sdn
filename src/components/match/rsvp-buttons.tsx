"use client";

import { useTransition } from "react";
import { setAttendance } from "@/lib/actions/matches";
import { toast } from "@/lib/toast";

type Status = "going" | "notGoing" | "undecided";

const OPTS: { v: Status; label: string; activeBg: string }[] = [
  { v: "going", label: "참석", activeBg: "#1d9e75" },
  { v: "undecided", label: "미정", activeBg: "#888780" },
  { v: "notGoing", label: "불참", activeBg: "#dc2f3c" },
];

export function RsvpButtons({ matchId, current }: { matchId: string; current: Status }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex gap-2">
      {OPTS.map((o) => {
        const active = current === o.v;
        return (
          <button
            key={o.v}
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await setAttendance(matchId, o.v);
                toast(`${o.label}(으)로 체크됐어요`);
              })
            }
            className="flex-1 rounded-[12px] py-2.5 text-[13px] font-bold disabled:opacity-60"
            style={
              active
                ? { background: o.activeBg, color: "#fff" }
                : { background: "var(--sdn-surface-2)", color: "var(--sdn-muted)" }
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
