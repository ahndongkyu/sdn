"use client";

export function DraftNotice({ available, restore, discard, storageFailed }: {
  available: boolean; restore: () => void; discard: () => void; storageFailed: boolean;
}) {
  return <>
    {available && <section className="rounded-xl border border-borderblue bg-tint p-3" aria-label="임시 입력 복원">
      <h2 className="text-sm font-bold">임시 입력을 찾았어요</h2>
      <p className="mt-1 text-xs text-muted">아래에는 저장된 최신 기록이 보여요. 이전 입력을 이어서 하거나 버릴 수 있어요.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={restore} className="min-h-11 rounded-lg bg-accent px-3 text-sm font-bold text-white">이어서 입력</button>
        <button type="button" onClick={() => { if (window.confirm("이전에 남긴 임시 입력을 버릴까요?")) discard(); }} className="min-h-11 px-3 text-sm text-accent">임시 입력 버리기</button>
      </div>
    </section>}
    {storageFailed && <p role="alert" className="rounded-xl bg-danger/10 p-3 text-sm text-danger">이 기기에 임시 보관할 수 없어요. 화면을 나가기 전에 저장해주세요.</p>}
  </>;
}
