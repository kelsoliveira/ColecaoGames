import Link from "next/link";
import { PlatformBadge, ProgressBar, SectionTitle, StatTile, TrophyCountsView, TrophyIcon } from "@/components/ui";
import { date, parseJson } from "@/lib/format";
import {
  getStats,
  inProgressGames,
  platinumGames,
  rarestAchievements,
  recentAchievements,
  type RecentAchievement,
} from "@/lib/queries";
import { getSetting } from "@/lib/settings";

export const dynamic = "force-dynamic";

function AchList({ items }: { items: RecentAchievement[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((a) => (
        <li key={a.id} className="flex items-center gap-3 py-2">
          {a.icon_url ? <img src={a.icon_url} alt="" className="h-10 w-10 rounded" loading="lazy" /> : <div className="h-10 w-10 rounded bg-panel-2" />}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate text-sm font-medium">
              {a.source === "psn" && a.type ? <TrophyIcon type={a.type as "gold"} className="h-3.5 w-3.5 shrink-0" /> : null}
              {a.name}
            </p>
            <Link href={`/jogo/${a.game_id}`} className="truncate text-xs text-ink-3 hover:text-accent">{a.game_title}</Link>
          </div>
          <div className="text-right text-xs text-ink-3">
            {a.rarity != null ? <p className="text-ink-2">{a.rarity.toLocaleString("pt-BR")}%</p> : null}
            <p>{date(a.earned_at)}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function ConquistasPage() {
  const [s, profile, gamerscore, platinums, inProgress, recent, rarest] = await Promise.all([
    getStats(),
    getSetting("psn_profile"),
    getSetting("xbox_gamerscore"),
    platinumGames(),
    inProgressGames(),
    recentAchievements(25),
    rarestAchievements(15),
  ]);
  const psn = parseJson<{ trophyLevel?: string; progress?: number; tier?: number } | null>(profile, null);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Troféus e conquistas</h1>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Nível PSN" value={psn?.trophyLevel ?? "—"} hint={psn?.progress != null ? <ProgressBar value={psn.progress} className="mt-1" /> : "sincronize a PSN"} />
        <StatTile label="Platinas" value={s.trophies.platinum} />
        <StatTile label="Gamerscore" value={(Number(gamerscore) || s.gamerscore).toLocaleString("pt-BR")} />
        <StatTile label="Jogos 100%" value={platinums.length} />
      </section>

      <section className="card p-4">
        <TrophyCountsView counts={s.trophies} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle>Recentes</SectionTitle>
          <AchList items={recent} />
        </section>
        <section className="card p-5">
          <SectionTitle>Mais raros obtidos</SectionTitle>
          <AchList items={rarest} />
        </section>
      </div>

      <section className="card p-5">
        <SectionTitle>Platinas e jogos 100%</SectionTitle>
        {platinums.length ? (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {platinums.map((g) => (
              <li key={g.id}>
                <Link href={`/jogo/${g.id}`} className="flex items-center gap-3 rounded-lg border border-line p-2 hover:border-accent">
                  <img src={g.psn_icon ?? g.xbox_icon ?? g.cover_url ?? ""} alt="" className="h-12 w-12 rounded object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm">{g.title}</p>
                    <div className="flex items-center gap-2"><PlatformBadge platform={g.platform} /><span className="text-xs text-ink-3">{date(g.plat_at)}</span></div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-2">Nenhuma ainda — sincronize suas contas.</p>
        )}
      </section>

      <section className="card p-5">
        <SectionTitle>Em andamento</SectionTitle>
        <ul className="space-y-2">
          {inProgress.map((g) => (
            <li key={g.id}>
              <Link href={`/jogo/${g.id}`} className="grid grid-cols-[1fr_8rem_3rem] items-center gap-3 text-sm hover:text-accent">
                <span className="truncate">{g.title} <span className="text-ink-3">· {g.platform}</span></span>
                <ProgressBar value={g.psn_progress ?? g.xbox_progress} />
                <span className="text-right tabular-nums text-ink-2">{g.psn_progress ?? g.xbox_progress}%</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
