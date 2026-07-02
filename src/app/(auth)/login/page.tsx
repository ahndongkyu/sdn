import { redirect } from "next/navigation";
import { KakaoLoginButton } from "@/components/auth/kakao-login-button";
import { getMyProfile } from "@/lib/data/auth";

export default async function LoginPage() {
  const profile = await getMyProfile();
  if (profile?.member_id) redirect("/");
  if (profile) redirect("/pending"); // 로그인했으나 승인 전

  return (
    <div className="app-shell flex items-center justify-center p-4">
      <div className="hero-card w-full rounded-2xl px-6 py-14 text-center">
        <div className="brand-logo relative mx-auto mb-2 flex h-[84px] w-[84px] items-center justify-center rounded-[20px] text-2xl font-medium">
          SDN
        </div>
        <div className="relative mb-12 text-[10px] text-navy-soft">(로고 자리)</div>

        <div className="relative">
          <KakaoLoginButton />
        </div>

        <p className="text-[11px] leading-relaxed text-navy-muted">
          SDN 회원만 이용할 수 있어요.
          <br />
          가입은 운영진에게 문의해주세요.
        </p>
      </div>
    </div>
  );
}
