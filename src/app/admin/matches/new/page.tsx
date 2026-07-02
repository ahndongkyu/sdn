import Link from "next/link";
import { X } from "lucide-react";
import { createMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

const UNIFORMS = ["빨검", "파랑", "연핑크", "진남색"];

export default function NewMatchPage() {
  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href="/matches">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">경기 등록</h1>
      </div>

      <form action={createMatch} className="space-y-4">
        <Field label="경기 유형">
          <div className="flex gap-1.5">
            <label className="flex-1">
              <input type="radio" name="type" value="match" defaultChecked className="peer hidden" />
              <span className="block rounded-lg border border-line bg-card py-2.5 text-center text-[13px] text-muted peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">매치</span>
            </label>
            <label className="flex-1">
              <input type="radio" name="type" value="self" className="peer hidden" />
              <span className="block rounded-lg border border-line bg-card py-2.5 text-center text-[13px] text-muted peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">자체전</span>
            </label>
          </div>
        </Field>

        <Field label="상대팀">
          <input name="opponent" required placeholder="번개FC (자체전이면 홍/백 등)" className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="날짜">
            <input name="match_date" type="date" required className="input" />
          </Field>
          <Field label="시간">
            <input name="match_time" type="time" defaultValue="21:00" className="input" />
          </Field>
        </div>

        <Field label="장소">
          <input name="place" placeholder="잠실 보조경기장" className="input" />
        </Field>

        <Field label="장소 주소 (선택 · 홈에서 탭하면 복사)">
          <input name="place_address" placeholder="서울 송파구 올림픽로 25" className="input" />
        </Field>

        <Field label="유니폼 (포메이션 등번호에 적용)">
          <select name="uniform" className="input">
            <option value="">선택 안 함</option>
            {UNIFORMS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        <Field label="유튜브 영상 URL (경기 후 입력, 선택)">
          <input name="youtube_url" type="url" placeholder="https://youtu.be/..." className="input" />
        </Field>

        <ConfirmSubmit message="이 경기를 등록하시겠습니까?" className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">경기 등록</ConfirmSubmit>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-xs text-muted">{label}</div>
      {children}
    </div>
  );
}
