import Link from "next/link";
import { Plus } from "lucide-react";
import { getMatches } from "@/lib/data/matches";
import { getMyProfile } from "@/lib/data/auth";
import { MatchList } from "@/components/match/match-list";

export default async function MatchesPage() {
  const [matches, profile] = await Promise.all([getMatches(), getMyProfile()]);
  const role = (profile?.members as { role?: string } | null)?.role;
  const isManager = role === "manager" || role === "admin";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">매치</h1>
        {isManager && (
          <Link href="/admin/matches/new" className="flex items-center gap-1 rounded-lg bg-red px-3 py-1.5 text-xs text-white">
            <Plus size={15} /> 경기 등록
          </Link>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="rounded-xl border border-divider bg-card soft-card px-4 py-10 text-center text-sm text-muted">아직 등록된 경기가 없어요.</div>
      ) : (
        <MatchList matches={matches} />
      )}
    </div>
  );
}
