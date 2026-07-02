"use client";

// 유튜브 영상 열기 — 모바일에선 유튜브 앱 우선(스킴/인텐트), 미설치·PC는 웹으로 폴백
function videoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.searchParams.get("v")) return u.searchParams.get("v");
    const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/);
    if (m) return m[2];
    return null;
  } catch {
    return null;
  }
}

export function VideoButton({ url, className, children }: { url: string; className?: string; children: React.ReactNode }) {
  function open() {
    const id = videoId(url);
    const https = id ? `https://www.youtube.com/watch?v=${id}` : url;
    const ua = navigator.userAgent;

    if (id && /android/i.test(ua)) {
      // 인텐트 — 앱 없으면 브라우저 폴백(S.browser_fallback_url)
      window.location.href =
        `intent://www.youtube.com/watch?v=${id}#Intent;package=com.google.android.youtube;scheme=https;` +
        `S.browser_fallback_url=${encodeURIComponent(https)};end`;
    } else if (id && /iphone|ipad|ipod/i.test(ua)) {
      const t = Date.now();
      window.location.href = `youtube://watch?v=${id}`;
      // 앱이 안 열리면(포그라운드 유지) 웹으로
      setTimeout(() => { if (Date.now() - t < 1400) window.open(https, "_blank"); }, 900);
    } else {
      window.open(https, "_blank");
    }
  }
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
