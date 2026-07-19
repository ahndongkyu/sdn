"use client";

import { useState } from "react";

export function MatchTimeField() {
  const [time, setTime] = useState("08:00");
  const [unspecified, setUnspecified] = useState(false);

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="match_time" value={unspecified ? "" : time} />
      <div className="flex items-center gap-2">
        <input
          type="time"
          lang="en-GB"
          value={time}
          disabled={unspecified}
          onChange={(event) => setTime(event.target.value)}
          aria-label="경기 시간"
          className="input min-w-0 flex-1 font-medium tabular-nums disabled:cursor-not-allowed disabled:bg-sunken disabled:text-subtle"
        />
        <button
          type="button"
          aria-pressed={unspecified}
          onClick={() => setUnspecified((value) => !value)}
          className={`shrink-0 rounded-[10px] border px-2.5 py-2 text-[12px] font-semibold transition-colors ${unspecified ? "border-accent bg-tint text-accent" : "border-borderblue bg-card text-muted"}`}
        >
          시간 미정
        </button>
      </div>
    </div>
  );
}
