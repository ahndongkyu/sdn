import { redirect } from "next/navigation";
import { Clock, Check } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { submitClaimName } from "@/lib/actions/approvals";
import { getMyProfile } from "@/lib/data/auth";

export default async function PendingPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.member_id) redirect("/"); // 이미 승인됨

  const claimed = (profile as { claimed_name?: string | null }).claimed_name ?? "";

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="hero-card w-full rounded-2xl px-6 py-12 text-center">
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Clock size={30} className="text-pink" />
        </div>
        <div className="relative mb-1 text-[17px] font-medium text-white">운영진 승인 대기중</div>
        <p className="relative mb-6 text-[12px] leading-relaxed text-navy-muted">
          본인 이름을 입력하면 운영진이 명단과
          <br />
          빠르게 연결해드려요.
        </p>

        <form action={submitClaimName} className="relative mb-6 flex gap-2">
          <input
            name="name"
            defaultValue={claimed}
            required
            placeholder="이름 (예: 홍길동)"
            className="min-w-0 flex-1 rounded-[10px] border border-navy-soft bg-white/10 px-3 py-2.5 text-[14px] text-white placeholder:text-navy-muted"
          />
          <button className="shrink-0 rounded-[10px] bg-red px-4 text-[13px] font-medium text-white">
            {claimed ? "수정" : "제출"}
          </button>
        </form>

        {claimed && (
          <div className="relative mb-6 flex items-center justify-center gap-1.5 text-[12px] text-navy-muted">
            <Check size={14} className="text-[#5dcaa5]" />
            <span><b className="text-white">{claimed}</b> 님으로 제출됨 · 승인 대기 중</span>
          </div>
        )}

        <form action={signOut} className="relative">
          <button className="rounded-[10px] border border-navy-soft px-5 py-2.5 text-[13px] text-navy-muted">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
