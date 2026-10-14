// 편집 화면과 공유 이미지에 같은 포지션 색상을 사용한다.
export const LINEUP_POSITION_COLORS = {
  GK: { background: "#f8dca0", foreground: "#70490c", border: "#c69a45" },
  DF: { background: "#c4dcf5", foreground: "#244f7e", border: "#7c9fc3" },
  MF: { background: "#c6e4d6", foreground: "#265a44", border: "#78ac92" },
  FW: { background: "#f2ccd9", foreground: "#79354f", border: "#bf8b9d" },
} as const;

export function lineupPositionColor(label: string) {
  if (label === "GK") return LINEUP_POSITION_COLORS.GK;
  if (["LB", "RB", "CB", "LWB", "RWB"].includes(label)) return LINEUP_POSITION_COLORS.DF;
  if (["LW", "RW", "ST", "CF"].includes(label)) return LINEUP_POSITION_COLORS.FW;
  return LINEUP_POSITION_COLORS.MF;
}
