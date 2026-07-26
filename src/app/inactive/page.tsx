import { redirect } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { getMyProfile } from "@/lib/data/auth";

export default async function InactivePage() {
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  const member = profile.members as { status?: string } | null;
  if (profile.member_id && member?.status === "active") redirect("/");
  if (!profile.member_id) redirect("/pending");

  return (
    <div className="app-shell flex min-h-dvh items-center justify-center p-4">
      <div className="hero-card w-full rounded-2xl px-6 py-12 text-center">
        <h1 className="relative text-[18px] font-bold text-white">계정이 비활성화됐어요</h1>
        <p className="relative mt-2 text-[12px] leading-relaxed text-navy-muted">
          현재 이 계정으로는 서비스를 이용할 수 없어요.
          <br />
          이용이 필요하면 운영진에게 문의해주세요.
        </p>
        <form action={signOut} className="relative mt-7">
          <button className="rounded-[10px] border border-navy-soft px-5 py-2.5 text-[12px] text-navy-muted">로그아웃</button>
        </form>
      </div>
    </div>
  );
}
