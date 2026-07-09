"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

// 다음 경기 참석/불참 인원 + 드롭다운으로 명단 확인 (전원 열람)
export function AttendanceLists({ going, notGoing }: { going: string[]; notGoing: string[] }) {
  const [open, setOpen] = useState<"going" | "notGoing" | null>(null);
  const list = open === "going" ? going : open === "notGoing" ? notGoing : [];

  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-center gap-5 text-[12px]">
        <button onClick={() => setOpen((o) => (o === "going" ? null : "going"))} className="flex items-center gap-1">
          <span className="font-bold text-[#1d9e75]">{going.length}명 참석</span>
          <ChevronDown size={13} className={`text-subtle transition-transform ${open === "going" ? "rotate-180" : ""}`} />
        </button>
        <button onClick={() => setOpen((o) => (o === "notGoing" ? null : "notGoing"))} className="flex items-center gap-1">
          <span className="font-medium text-muted">{notGoing.length}명 불참</span>
          <ChevronDown size={13} className={`text-subtle transition-transform ${open === "notGoing" ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="mt-2.5 flex flex-wrap justify-center gap-1.5">
          {list.length === 0 ? (
            <span className="text-[12px] text-faint">아직 없어요</span>
          ) : (
            list.map((n, i) => (
              <span key={i} className="rounded-full bg-sunken px-2.5 py-1 text-[12px] text-fg">{n}</span>
            ))
          )}
        </div>
      )}
    </div>
  );
}
