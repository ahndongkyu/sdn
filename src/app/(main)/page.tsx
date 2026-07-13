import { Suspense } from "react";
import Link from "next/link";
import { Calendar, MapPin, Cloud, MoonStar, Sun, Droplet, Wind, Play, ClipboardList } from "lucide-react";
import { getMatches, getMatchAttendances, getMyAttendance, getTeamStats, isPast } from "@/lib/data/matches";
import { getFormation } from "@/lib/data/formations";
import { getMyProfile } from "@/lib/data/auth";
import { getNotifications } from "@/lib/data/notifications";
import { getMatchWeather } from "@/lib/weather";
import { formatDateKo, dday, regionLabel } from "@/lib/format";
import { NextMatchActions } from "@/components/match/next-match-actions";
import { AttendanceLists } from "@/components/match/attendance-lists";
import { VideoButton } from "@/components/match/video-button";
import { PlaceCopy } from "@/components/match/place-copy";
import { BellButton } from "@/components/layout/bell-button";

export default async function HomePage() {
  const [matches, profile, team, notifs] = await Promise.all([getMatches(), getMyProfile(), getTeamStats(), getNotifications()]);
  const member = profile?.members as { name?: string } | null;
  const myMemberId = (profile?.member_id as string | null) ?? null;
  const latestNotifAt = notifs[0]?.at ?? null;
  const season = new Date().getFullYear();

  const upcoming = matches.filter((m) => !isPast(m)).sort((a, b) => a.match_date.localeCompare(b.match_date));
  const next = upcoming[0] ?? null;
  const last = matches.filter(isPast)[0] ?? null;

  // 날씨는 외부 API라 Suspense로 분리 스트리밍 (홈 렌더를 막지 않음)
  const [myStatus, nextAtt, nextFormation] = await Promise.all([
    next && myMemberId ? getMyAttendance(next.id, myMemberId) : Promise.resolve("undecided" as const),
    next ? getMatchAttendances(next.id) : Promise.resolve([]),
    next ? getFormation(next.id) : Promise.resolve(null),
  ]);
  const goingNames = nextAtt.filter((a) => a.status === "going" && a.members).map((a) => a.members!.name);
  const notGoingNames = nextAtt.filter((a) => a.status === "notGoing" && a.members).map((a) => a.members!.name);
  const hasLineup = !!nextFormation;
  const diff = team.gf - team.ga;

  return (
    <div className="space-y-4">
      {/* 브랜드 헤더 */}
      <div className="flex items-center justify-between pb-1 pt-1">
        <span className="brand-mark h-7 w-[78px]" role="img" aria-label="SDN FC" />
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-subtle">{member?.name ?? "회원"}님</span>
          <BellButton latestAt={latestNotifAt} />
        </div>
      </div>

      {/* 팀 시즌 성적 — 히어로 */}
      <section className="hero-card px-[22px] py-[20px]">
        <div className="relative flex items-center justify-between">
          <span className="text-[12px] font-bold tracking-[0.2px]" style={{ color: "var(--sdn-hero-accent)" }}>팀 시즌 성적</span>
          <span className="text-[11.5px]" style={{ color: "var(--sdn-on-hero-sub)" }}>{season} · 총 {team.count}경기</span>
        </div>
        <div className="relative mt-4 flex items-end gap-4">
          <div>
            <div className="text-[42px] font-extrabold leading-none tracking-[-1.5px] tabular-nums" style={{ color: "var(--sdn-hero-num)" }}>
              {team.winRate}<span className="text-[22px]">%</span>
            </div>
            <div className="mt-1.5 text-[11.5px]" style={{ color: "var(--sdn-on-hero-sub)" }}>승률</div>
          </div>
          <div className="flex flex-1 justify-end gap-1.5">
            <Pill label="승" value={team.win} />
            <Pill label="무" value={team.draw} />
            <Pill label="패" value={team.loss} />
          </div>
        </div>
        <div className="relative my-[15px] h-px" style={{ background: "var(--sdn-hero-line)" }} />
        <div className="relative flex justify-between text-center">
          <HeroStat value={team.gf} label="총 득점" />
          <div className="w-px" style={{ background: "var(--sdn-hero-line)" }} />
          <HeroStat value={team.ga} label="총 실점" />
          <div className="w-px" style={{ background: "var(--sdn-hero-line)" }} />
          <HeroStat value={`${diff >= 0 ? "+" : ""}${diff}`} label="득실차" accent />
        </div>
      </section>

      {/* 다음 경기 */}
      {next ? (
        <section className="rounded-[20px] border border-line bg-card p-4 soft-card">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-subtle">다음 경기</span>
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-white btn-glow">{dday(next.match_date)}</span>
          </div>
          <Link href={`/matches/${next.id}`} className={`block ${next.place_address || next.place ? "" : "mb-3.5"}`}>
            <div className="mb-3 flex items-center justify-center gap-4">
              <Crest label="우리팀" badge="SDN" />
              <span className="text-[15px] text-muted">VS</span>
              <Crest label={next.opponent} badge={next.opponent.slice(0, 2)} opp />
            </div>
            <div className="text-center text-[13px] text-muted">
              <Calendar size={14} className="mr-1 inline align-[-2px] text-subtle" />
              {formatDateKo(next.match_date).full} {next.match_time ?? ""}
            </div>
          </Link>
          {(next.place_address || next.place) && (
            <div className="mb-3.5 mt-1.5 text-center text-[13px] text-muted">
              {next.place_address ? (
                <div className="flex justify-center"><PlaceCopy place={next.place ?? next.place_address} address={next.place_address} /></div>
              ) : (
                <div><MapPin size={14} className="mr-1 inline align-[-2px] text-subtle" /> {next.place}</div>
              )}
            </div>
          )}
          <NextMatchActions matchId={next.id} current={myStatus} hasLineup={hasLineup} />
          <AttendanceLists going={goingNames} notGoing={notGoingNames} />
        </section>
      ) : (
        <section className="flex items-center gap-3.5 rounded-[20px] border border-dashed bg-card px-[18px] py-4" style={{ borderColor: "var(--sdn-dash)" }}>
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px]" style={{ background: "color-mix(in srgb, var(--sdn-pink) 20%, transparent)" }}>
            <Calendar size={20} style={{ color: "var(--sdn-pink)" }} />
          </span>
          <div>
            <div className="text-[14px] font-bold text-fg">예정된 경기가 없어요</div>
            <div className="mt-0.5 text-[12px] text-subtle">운영진이 경기를 등록하면 여기 표시됩니다</div>
          </div>
        </section>
      )}

      {/* 경기 날씨 (외부 API — 스트리밍) */}
      {next && (
        <Suspense fallback={<WeatherSkeleton region={regionLabel(next.place_address)} />}>
          <WeatherCard date={next.match_date} time={next.match_time} lat={next.place_lat} lng={next.place_lng} region={regionLabel(next.place_address)} />
        </Suspense>
      )}

      {/* 지난 경기 */}
      {last && (
        <section className="rounded-[20px] border border-line bg-card p-3.5 soft-card">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12.5px] font-bold text-subtle">지난 경기</span>
            <LastBadge f={last.score_for} a={last.score_against} />
          </div>
          <div className="mb-3 flex items-start justify-center gap-5">
            <Crest label="SDN" badge="SDN" small />
            <span className="flex h-[46px] items-center text-[32px] font-extrabold leading-none tracking-[1px] text-fg tabular-nums">{last.score_for ?? "-"} : {last.score_against ?? "-"}</span>
            <Crest label={last.opponent} badge={last.opponent.slice(0, 2)} opp small />
          </div>
          <div className="flex gap-2">
            {last.youtube_url && (
              <VideoButton url={last.youtube_url} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-tint py-3 text-[13px] font-bold text-accent">
                <Play size={15} fill="currentColor" /> 경기 영상
              </VideoButton>
            )}
            <Link href={`/matches/${last.id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-[14px] bg-tint py-3 text-[13px] font-bold text-accent">
              <ClipboardList size={15} /> 경기 기록
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function Pill({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-12 rounded-[13px] py-2 text-center" style={{ background: "var(--sdn-hero-chip)" }}>
      <div className="text-[17px] font-extrabold text-white tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10.5px]" style={{ color: "var(--sdn-on-hero-sub)" }}>{label}</div>
    </div>
  );
}
function HeroStat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  return (
    <div className="flex-1">
      <div className="text-[19px] font-extrabold tabular-nums" style={{ color: accent ? "var(--sdn-pink)" : "#fff" }}>{value}</div>
      <div className="mt-0.5 text-[11px]" style={{ color: "var(--sdn-on-hero-sub)" }}>{label}</div>
    </div>
  );
}
function Crest({ label, badge, opp, small }: { label: string; badge: string; opp?: boolean; small?: boolean }) {
  const size = small ? "h-[46px] w-[46px]" : "h-[46px] w-[46px]";
  return (
    <div className="text-center">
      <div
        className={`mx-auto mb-2 flex ${size} items-center justify-center rounded-[14px] text-[11.5px] font-bold ${opp ? "text-muted" : "text-white"}`}
        style={opp ? { background: "var(--sdn-surface-2)" } : { background: "linear-gradient(150deg, var(--sdn-blue), #14213d)" }}
      >
        {badge}
      </div>
      <div className={`max-w-[70px] truncate text-[12px] font-bold ${opp ? "text-muted" : "text-fg"}`}>{label}</div>
    </div>
  );
}
function WeatherShell({ date, time, region, children }: { date?: string; time?: string | null; region: string | null; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] border border-line bg-card p-3.5 soft-card">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] text-muted"><Cloud size={15} className="mr-1 inline align-[-2px]" /> {region ?? "경기 날씨"}</span>
        {date && <span className="text-[11px] text-subtle">{formatDateKo(date).short} {time ?? ""}</span>}
      </div>
      {children}
    </section>
  );
}

async function WeatherCard({ date, time, lat, lng, region }: { date: string; time: string | null; lat: number | null; lng: number | null; region: string | null }) {
  const weather = await getMatchWeather(date, time, lat ?? undefined, lng ?? undefined);
  return (
    <WeatherShell date={date} time={time} region={region}>
      {weather ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {weather.hour >= 19 || weather.hour < 6 ? <MoonStar size={36} className="text-pos-gk" /> : <Sun size={36} className="text-pos-gk" />}
            <div>
              <div className="text-[28px] font-bold leading-none text-fg">{weather.temp}°</div>
              <div className="mt-1 text-xs text-muted">체감 {weather.feels}°</div>
            </div>
          </div>
          <div className="flex gap-4 text-center">
            <WStat icon={<Droplet size={16} className="text-accent" />} v={`${weather.precip}%`} l="강수" />
            <WStat icon={<Wind size={16} className="text-muted" />} v={`${weather.wind}㎧`} l="바람" />
          </div>
        </div>
      ) : (
        <div className="py-2 text-center text-[12px] text-subtle">경기일이 가까워지면 날씨가 표시돼요</div>
      )}
    </WeatherShell>
  );
}

function WeatherSkeleton({ region }: { region: string | null }) {
  return (
    <WeatherShell region={region}>
      <div className="flex animate-pulse items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-sunken" />
        <div className="h-7 w-16 rounded bg-sunken" />
      </div>
    </WeatherShell>
  );
}

function WStat({ icon, v, l }: { icon: React.ReactNode; v: string; l: string }) {
  return (
    <div>
      {icon}
      <div className="mt-0.5 text-sm text-fg">{v}</div>
      <div className="text-[10px] text-subtle">{l}</div>
    </div>
  );
}
function LastBadge({ f, a }: { f: number | null; a: number | null }) {
  const win = f !== null && a !== null && f > a;
  const draw = f === a;
  const label = win ? "승리" : draw ? "무승부" : "패배";
  const bg = win ? "var(--sdn-blue)" : draw ? "var(--sdn-muted)" : "var(--sdn-danger)";
  return <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white" style={{ background: bg }}>{label}</span>;
}
