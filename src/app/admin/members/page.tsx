import { getAdminMembers } from "@/lib/data/members";
import { MemberIndexList } from "@/components/admin/member-index-list";

export default async function AdminMembersPage() {
  let members;
  try {
    members = await getAdminMembers();
  } catch {
    return <section className="space-y-3 rounded-xl border border-line bg-card p-4">
      <h1 className="text-[15px] font-semibold">회원 관리</h1>
      <p role="alert" className="text-sm text-muted">회원 정보 또는 카카오 계정 연결 상태를 불러오지 못했어요. 다시 시도해주세요.</p>
      <a href="/admin/members" className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-white">다시 불러오기</a>
    </section>;
  }
  return <MemberIndexList members={members} />;
}
