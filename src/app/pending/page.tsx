import { redirect } from "next/navigation";
import { Clock } from "lucide-react";
import { signOut } from "@/lib/actions/auth";
import { getMyProfile } from "@/lib/data/auth";

export default async function PendingPage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  if (profile.member_id) redirect("/"); // 이미 승인됨

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="hero-card w-full rounded-2xl px-6 py-14 text-center">
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <Clock size={30} className="text-pink" />
        </div>
        <div className="relative mb-1 text-[17px] font-medium text-white">운영진 승인 대기중</div>
        <p className="relative mb-10 text-[12px] leading-relaxed text-navy-muted">
          로그인됐어요. 운영진이 회원 명단과 연결하면
          <br />
          바로 이용할 수 있습니다.
        </p>
        <form action={signOut} className="relative">
          <button className="rounded-[10px] border border-navy-soft px-5 py-2.5 text-[13px] text-navy-muted">
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
