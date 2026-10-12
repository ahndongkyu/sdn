"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function FixedFormActions({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const footer = ref.current;
    const form = footer?.closest<HTMLElement>("[data-match-form]");
    if (!footer || !form) return;
    const resize = () => { form.style.paddingBottom = `${footer.getBoundingClientRect().height + 24}px`; };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(footer);
    return () => { observer.disconnect(); form.style.removeProperty("padding-bottom"); };
  }, []);
  return <div ref={ref} className="fixed inset-x-0 bottom-0 z-40 mx-auto max-h-[55dvh] max-w-[480px] space-y-2 overflow-y-auto border-t border-line bg-card px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">{children}</div>;
}
