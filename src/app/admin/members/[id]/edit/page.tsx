import Link from "next/link";
import { notFound } from "next/navigation";
import { X, Trash2 } from "lucide-react";
import { getMemberById } from "@/lib/data/members";
import { updateMember, deleteMember } from "@/lib/actions/members";

const POSITIONS = [
  { v: "FW", label: "FW 공격수" },
  { v: "MF", label: "MF 미드필더" },
  { v: "DF", label: "DF 수비수" },
  { v: "GK", label: "GK 골키퍼" },
];

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMemberById(id);
  if (!m) notFound();

  const num = (u: string) => m.member_numbers.find((n) => n.uniform === u)?.number ?? "";

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href={`/members/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">회원 수정</h1>
      </div>

      <form action={updateMember} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <Field label="이름">
          <input name="name" required defaultValue={m.name} className="input" />
        </Field>

        <div className="grid grid-cols-2 gap-2.5">
          <Field label="주 포지션">
            <select name="position1" defaultValue={m.position1} className="input">
              {POSITIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="부 포지션 (선택)">
            <select name="position2" defaultValue={m.position2 ?? ""} className="input">
              <option value="">없음</option>
              {POSITIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </Field>
        </div>

        <Field label="주발">
          <select name="foot" defaultValue={m.foot} className="input">
            <option value="R">오른발</option>
            <option value="L">왼발</option>
            <option value="both">양발</option>
          </select>
        </Field>

        <Field label="유니폼별 등번호">
          <div className="flex flex-col gap-2">
            <NumberRow uniform="빨검" color="#dc2f3c" defaultValue={num("빨검")} />
            <NumberRow uniform="흰파" color="#3a7bd5" border defaultValue={num("흰파")} />
          </div>
        </Field>

        <Field label="권한">
          <select name="role" defaultValue={m.role} className="input">
            <option value="member">회원</option>
            <option value="manager">운영진</option>
            <option value="admin">관리자(admin)</option>
          </select>
        </Field>

        <button className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">수정 저장</button>
      </form>

      <form action={deleteMember} className="mt-6 border-t border-divider pt-5">
        <input type="hidden" name="id" value={id} />
        <button className="flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-danger/40 py-2.5 text-[13px] text-danger">
          <Trash2 size={15} /> 이 회원 삭제
        </button>
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

function NumberRow({ uniform, color, border, defaultValue }: { uniform: string; color: string; border?: boolean; defaultValue: number | string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-card px-3 py-2">
      <span className="h-4 w-4 rounded-full" style={border ? { background: "#fff", border: `2px solid ${color}` } : { background: color }} />
      <span className="flex-1 text-[13px]">{uniform}</span>
      <input name={`number_${uniform}`} type="number" inputMode="numeric" placeholder="번호" defaultValue={defaultValue} className="w-16 rounded-md border border-line bg-sunken px-2 py-1.5 text-center text-sm" />
    </div>
  );
}
