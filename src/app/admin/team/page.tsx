import Link from "next/link";
import { X, Shirt, Calendar, Users } from "lucide-react";
import { getMembers } from "@/lib/data/members";

const UNIFORMS = [
  { name: "빨검", color: "#dc2f3c", border: false },
  { name: "흰파", color: "#3a7bd5", border: true },
  { name: "연핑크", color: "#f6c9d8", border: false },
  { name: "진남색", color: "#16234d", border: false },
];

export default async function TeamSettingsPage() {
  const members = await getMembers();
  const managers = members.filter((m) => m.role !== "member").length;

  return (
    <div className="space-y-5">
      <div className="mb-1 flex items-center gap-2">
        <Link href="/more">
          <X size={20} className="text-muted" />
        </Link>
        <h1 className="text-[15px] font-medium">팀 설정</h1>
      </div>

      {/* 팀 정보 */}
      <div className="hero-card rounded-2xl p-4 text-white">
        <div className="relative flex items-center gap-3">
          <div className="brand-logo flex h-12 w-12 items-center justify-center rounded-xl text-sm font-medium">SDN</div>
          <div>
            <div className="text-[16px] font-medium">SDN FC</div>
            <div className="text-[11px] text-navy-muted">Saturday Night</div>
          </div>
        </div>
        <div className="relative mt-4 flex justify-around border-t border-navy-soft pt-3">
          <Info icon={<Calendar size={15} />} v="2026" l="시즌" />
          <Info icon={<Users size={15} />} v={`${members.length}명`} l="회원" />
          <Info icon={<Shirt size={15} />} v={`${managers}명`} l="운영진" />
        </div>
      </div>

      {/* 유니폼 */}
      <div>
        <h2 className="mb-2.5 text-[13px] text-muted">유니폼</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {UNIFORMS.map((u) => (
            <div key={u.name} className="flex items-center gap-2.5 rounded-xl border border-divider bg-card px-3 py-2.5">
              <span className="h-7 w-7 rounded-full" style={u.border ? { background: "#fff", border: `2px solid ${u.color}` } : { background: u.color }} />
              <span className="text-[13px]">{u.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-subtle">유니폼별 등번호는 회원 등록/수정에서 관리해요.</p>
      </div>

      <p className="text-center text-[11px] text-faint">팀명·시즌·유니폼 편집은 곧 지원할 예정이에요.</p>
    </div>
  );
}

function Info({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div className="text-center">
      <div className="mb-1 flex justify-center text-navy-muted">{icon}</div>
      <div className="text-[15px] font-medium">{v}</div>
      <div className="text-[11px] text-navy-muted">{l}</div>
    </div>
  );
}
