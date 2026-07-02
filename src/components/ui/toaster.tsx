"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

export function Toaster() {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const handler = (e: Event) => {
      setMsg((e as CustomEvent<string>).detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 2400);
    };
    window.addEventListener("sdn:toast", handler);
    return () => {
      window.removeEventListener("sdn:toast", handler);
      clearTimeout(timer);
    };
  }, []);

  if (!msg) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(80px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        zIndex: 100,
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full bg-ink/92 px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
        <Check size={15} className="text-[#5dcaa5]" />
        {msg}
      </div>
    </div>
  );
}
