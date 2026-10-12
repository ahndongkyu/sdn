export function MatchWorkflow({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol aria-label="경기 기록 단계" className="mb-6 flex gap-2">
      {["참석", "포메이션", "경기 기록"].map((label, i) => (
        <li key={label} aria-current={current === i + 1 ? "step" : undefined}
          className={`flex-1 border-t-[3px] pt-2 text-xs ${current === i + 1 ? "border-accent font-bold text-accent" : "border-line text-muted"}`}>
          0{i + 1} {label}
        </li>
      ))}
    </ol>
  );
}
