import Link from "next/link";
import { X } from "lucide-react";
import { createMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { PlaceSearch } from "@/components/match/place-search";
import { MatchTimeField } from "@/components/match/match-time-field";
import { OpponentField } from "@/components/match/opponent-field";

const UNIFORMS = ["빨검", "파랑", "연핑크", "진남색"];

export default function NewMatchPage() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <Link href="/matches" aria-label="경기 등록 취소" className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-sunken">
          <X size={19} />
        </Link>
        <h1 className="text-[17px] font-bold text-fg">경기 등록</h1>
      </div>

      <form action={createMatch} className="space-y-5">
        <Field label="경기 유형">
          <div className="flex rounded-[13px] border border-borderblue bg-card p-1 soft-card">
            <label className="flex-1">
              <input type="radio" name="type" value="match" defaultChecked className="peer hidden" />
              <span className="block rounded-[9px] py-2.5 text-center text-[13px] font-semibold text-muted transition-colors peer-checked:bg-navy peer-checked:text-white">매치</span>
            </label>
            <label className="flex-1">
              <input type="radio" name="type" value="self" className="peer hidden" />
              <span className="block rounded-[9px] py-2.5 text-center text-[13px] font-semibold text-muted transition-colors peer-checked:bg-navy peer-checked:text-white">자체전</span>
            </label>
          </div>
        </Field>

        <OpponentField />

        <section className="rounded-[18px] border border-borderblue bg-card p-3.5 soft-card">
          <div className="mb-3 flex items-center gap-1.5 text-[15px] font-bold text-fg">
            일정
          </div>
          <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2.5">
            <Field label="날짜">
              <input name="match_date" type="date" required defaultValue={today} className="input font-medium tabular-nums" />
            </Field>
            <Field label="시간">
              <MatchTimeField />
            </Field>
          </div>
        </section>

        <PlaceSearch allowUnspecified variant="section" />

        <Field label="유니폼">
          <select name="uniform" className="input">
            <option value="">선택 안 함</option>
            {UNIFORMS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        <Field label="유튜브 영상 URL (선택)">
          <input name="youtube_url" type="url" placeholder="https://youtu.be/..." className="input" />
        </Field>

        <ConfirmSubmit message="이 경기를 등록하시겠습니까?" className="btn-glow w-full rounded-[13px] bg-accent py-3.5 text-sm font-bold text-white">경기 등록</ConfirmSubmit>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 text-[11.5px] font-semibold text-muted">{label}</div>
      {children}
    </div>
  );
}
