import { lineupPositionColor } from "./lineup-colors";
import { effectiveLineup, PRESETS, QUARTERS, type LineupDraft, type PoolPlayer } from "./formation-layout";

export async function createLineupImage(draft: LineupDraft, pool: PoolPlayer[], opponent: string, details: string): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 2400;
  canvas.height = 3200;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지를 만들 수 없어요");
  // 공유 파일은 수신자의 화면 테마와 관계없이 동일하게 보인다.
  const ink = "#172333", muted = "#667486", grass = "#deebe2", stripe = "#d3e4d9", mark = "#8aaa97";
  const font = getComputedStyle(document.body).fontFamily;
  function text(value: string, x: number, y: number, size: number, maxWidth: number, color = ink) {
    ctx!.fillStyle = color;
    ctx!.font = `500 ${size}px ${font}`;
    ctx!.fillText(value, x, y, maxWidth);
  }
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, 2400, 3200);
  text(`SDN FC vs ${opponent}`, 100, 130, 64, 2200);
  text(details, 100, 205, 34, 2200, muted);
  QUARTERS.forEach((q, index) => {
    const lineup = effectiveLineup(draft, q);
    const x = 100 + (index % 2) * 1140, y = 330 + Math.floor(index / 2) * 1380;
    const width = 1060, height = 1230;
    text(`${q}쿼터`, x, y - 32, 42, 600);
    ctx.textAlign = "right"; text(lineup.preset, x + width, y - 32, 34, 400, muted); ctx.textAlign = "left";
    ctx.fillStyle = grass; ctx.fillRect(x, y, width, height);
    for (let band = 1; band < 8; band += 2) {
      ctx.fillStyle = stripe; ctx.fillRect(x, y + height * band / 8, width, height / 8);
    }
    ctx.strokeStyle = mark; ctx.lineWidth = 3;
    ctx.strokeRect(x + 26, y + 26, width - 52, height - 52);
    ctx.beginPath(); ctx.moveTo(x + 26, y + height / 2); ctx.lineTo(x + width - 26, y + height / 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + width / 2, y + height / 2, 115, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(x + width * .26, y + 26, width * .48, 165);
    ctx.strokeRect(x + width * .26, y + height - 191, width * .48, 165);
    PRESETS[lineup.preset].forEach((slot, i) => {
      const player = pool.find(p => p.id === lineup.assignments.find(a => a.slot === i)?.memberId);
      const px = x + width * slot.x / 100, py = y + height * slot.y / 100;
      const color = lineupPositionColor(slot.label);
      ctx.strokeStyle = player ? color.border : mark;
      ctx.setLineDash(player ? [] : [8, 6]);
      ctx.beginPath(); ctx.arc(px, py - 18, 48, 0, Math.PI * 2);
      ctx.fillStyle = player ? color.background : grass; ctx.fill(); ctx.stroke();
      ctx.setLineDash([]);
      ctx.textAlign = "center";
      text(slot.label, px, py - 7, 29, 90, player ? color.foreground : muted);
      text(player?.name ?? "미배정", px, py + 66, 38, 190, player ? ink : muted);
      ctx.textAlign = "left";
    });
  });
  text(`SDN FC · 전체 라인업 · 참석 ${pool.length}명`, 100, 3150, 32, 2200, muted);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("이미지 생성 실패")), "image/png"));
}
