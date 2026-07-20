import type { ReactNode } from "react";

export function MatchCode({ children }: { children: ReactNode }) {
  return <span className="text-[12.5px] font-bold text-subtle">{children}</span>;
}
