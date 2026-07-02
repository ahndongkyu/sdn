const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatDateKo(iso: string) {
  const d = new Date(iso + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  const w = WEEKDAYS[d.getDay()];
  return { full: `${m}월 ${day}일 (${w})`, short: `${m}/${day}`, weekday: w };
}

export function dday(iso: string, today = new Date()) {
  const target = new Date(iso + "T00:00:00");
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((target.getTime() - base.getTime()) / 86400000);
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `${-diff}일 전`;
}
