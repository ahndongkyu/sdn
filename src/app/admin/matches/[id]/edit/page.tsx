import Link from "next/link";
import { notFound } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { getMatch } from "@/lib/data/matches";
import { updateMatch, deleteMatch } from "@/lib/actions/matches";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";

const UNIFORMS = ["빨검", "흰파", "연핑크", "진남색"];

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href={`/matches/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">경기 수정</h1>
      </div>

      <form action={updateMatch} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <Field label="경기 유형">
          <div className="flex gap-1.5">
            <label className="flex-1">
              <input type="radio" name="type" value="match" defaultChecked={match.type === "match"} className="peer hidden" />
              <span className="block rounded-lg border border-line bg-card py-2.5 text-center text-[13px] text-muted peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">매치</span>
            </label>
            <label className="flex-1">
              <input type="radio" name="type" value="self" defaultChecked={match.type === "self"} className="peer hidden" />
              <span className="block rounded-lg border border-line bg-card py-2.5 text-center text-[13px] text-muted peer-checked:border-navy peer-checked:bg-navy peer-checked:text-white">자체전</span>
            </label>
          </div>
        </Field>

        <Field label="상대팀">
          <input name="opponent" required defaultValue={match.opponent} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="날짜">
            <input name="match_date" type="date" required defaultValue={match.match_date} className="input" />
          </Field>
          <Field label="시간">
            <input name="match_time" type="time" defaultValue={match.match_time ?? "21:00"} className="input" />
          </Field>
        </div>

        <Field label="장소">
          <input name="place" defaultValue={match.place ?? ""} placeholder="잠실 보조경기장" className="input" />
        </Field>

        <Field label="유니폼">
          <select name="uniform" defaultValue={match.uniform ?? ""} className="input">
            <option value="">선택 안 함</option>
            {UNIFORMS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        <Field label="유튜브 영상 URL">
          <input name="youtube_url" type="url" defaultValue={match.youtube_url ?? ""} placeholder="https://youtu.be/..." className="input" />
        </Field>

        <button className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">수정 저장</button>
      </form>

      {/* 삭제 */}
      <form action={deleteMatch} className="mt-6 border-t border-divider pt-5">
        <input type="hidden" name="id" value={id} />
        <ConfirmSubmit message="이 경기를 삭제하시겠습니까? 되돌릴 수 없어요." className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-danger/40 py-2.5 text-[13px] text-danger">
          <Trash2 size={15} /> 이 경기 삭제
        </ConfirmSubmit>
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
