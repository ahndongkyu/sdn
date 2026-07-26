import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { X } from "lucide-react";
import { getMemberById } from "@/lib/data/members";
import { getMyProfile, isAdmin, isManager } from "@/lib/data/auth";
import { updateMember, deactivateMember } from "@/lib/actions/members";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { PositionSelect } from "@/components/member/position-select";

export default async function EditMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [m, profile, manager, admin] = await Promise.all([getMemberById(id), getMyProfile(), isManager(), isAdmin()]);
  if (!m) notFound();

  const mine = ((profile?.member_id as string | null) ?? null) === id;
  if (!manager && !mine) redirect(`/members/${id}`); // 본인·운영진만

  const num = (u: string) => m.member_numbers.find((n) => n.uniform === u)?.number ?? "";

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <Link href={`/members/${id}`}>
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">{mine && !manager ? "내 프로필 수정" : "회원 수정"}</h1>
      </div>

      {error === "duplicate" && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
          같은 이름의 활성 회원이 이미 있어요. 이름과 기존 계정 연결 상태를 확인해주세요.
        </p>
      )}
      {error === "deactivate" && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12px] text-danger">
          회원 비활성화에 실패했어요. 마지막 관리자 계정인지 확인해주세요.
        </p>
      )}

      <form action={updateMember} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <Field label="이름">
          <input name="name" required defaultValue={m.name} className="input" />
        </Field>

        <PositionSelect position1={m.position1} position2={m.position2 ?? undefined} />

        <Field label="유니폼별 등번호">
          <div className="flex flex-col gap-2">
            <NumberRow uniform="빨검" color="#dc2f3c" defaultValue={num("빨검")} />
            <NumberRow uniform="파랑" color="#1e4fd6" defaultValue={num("파랑")} />
          </div>
        </Field>

        {admin && (
          <Field label="권한">
            <select name="role" defaultValue={m.role} className="input">
              <option value="member">회원</option>
              <option value="manager">운영진</option>
              <option value="admin">관리자(admin)</option>
            </select>
          </Field>
        )}

        <ConfirmSubmit message="수정 사항을 저장하시겠습니까?" className="btn-glow w-full rounded-[10px] bg-red py-3 text-sm font-medium text-white">수정 저장</ConfirmSubmit>
      </form>

      {admin && (
        <form action={deactivateMember} className="mt-6 border-t border-divider pt-5">
          <input type="hidden" name="id" value={id} />
          <ConfirmSubmit message="이 회원을 비활성화하시겠습니까? 일반 목록에는 보이지 않지만 기존 기록은 유지됩니다." className="flex w-full items-center justify-center rounded-[10px] border border-danger/40 py-2.5 text-[13px] text-danger">
            회원 비활성화
          </ConfirmSubmit>
        </form>
      )}
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
