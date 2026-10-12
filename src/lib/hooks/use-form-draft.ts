"use client";

import { useCallback, useEffect, useState } from "react";

export function useFormDraft<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  const [recovery, setRecovery] = useState<T | null>(null);
  const [storageFailed, setStorageFailed] = useState(false);
  const dirty = JSON.stringify(value) !== baseline;

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = sessionStorage.getItem(key);
        if (saved) {
          const draft = JSON.parse(saved);
          if (draft.version === 1 && draft.value && JSON.stringify(draft.value) !== baseline) setRecovery(draft.value as T);
        }
      } catch { setStorageFailed(true); }
    });
    return () => { active = false; };
  }, [key, baseline]);

  const change = useCallback((next: T) => {
    setValue(next);
    try { sessionStorage.setItem(key, JSON.stringify({ version: 1, value: next })); }
    catch { setStorageFailed(true); }
  }, [key]);

  function clear() {
    try { sessionStorage.removeItem(key); } catch { setStorageFailed(true); }
    setRecovery(null);
    setBaseline(JSON.stringify(value));
  }
  function discard() {
    try { sessionStorage.removeItem(key); } catch { setStorageFailed(true); }
    setRecovery(null);
  }
  function restore() {
    if (recovery) change(recovery);
    setRecovery(null);
  }

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const beforeLink = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.hasAttribute("download") || link.target === "_blank" || event.ctrlKey || event.metaKey || event.shiftKey || link.href === location.href) return;
      if (!window.confirm(storageFailed ? "아직 저장하지 않은 입력이 있어요. 이 화면을 나갈까요?" : "아직 저장하지 않은 입력이 있어요. 임시 입력을 남기고 이동할까요?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", beforeLink, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", beforeLink, true); };
  }, [dirty, storageFailed]);

  return { value, change, clear, dirty, recovery, restore, discard, storageFailed };
}
