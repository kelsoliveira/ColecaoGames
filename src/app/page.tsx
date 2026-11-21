import Link from "next/link";
import { BarList, Cover, GameCard, PlatformBadge, ProgressBar, SectionTitle, StatTile, TrophyCountsView, TrophyIcon } from "@/components/ui";
import { brl, date, hours, parseJson } from "@/lib/format";
import { getStats, nearCompletion, recentAchievements } from "@/lib/queries";
import { getSetting } from "@/lib/settings";
import { STATUS_LABEL, type Status } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const s = getStats();
  const recent = recentAchievements(8);
  const near = nearCompletion(6);
  const psn = parseJson<{ trophyLevel?: string; tier?: number } | null>(getSetting("psn_profile"), null);
  const psnId = getSetting("psn_online_id");
  const gamertag = getSetting("xbox_gamertag");
  const totalTrophies = s.trophies.bronze + s.trophies.silver + s.trophies.gold + s.trophies.platinum;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Painel</h1>
          <p className="text-sm text-ink-2">
            {psnId ? `PSN: ${psnId}` : "PSN não conectada"} · {gamertag ? `Xbox: ${gamertag}` : "Xbox não conectado"}
          </p>
        </div>
        {!psnId || !gamertag ? (
          <Link href="/contas" className="btn-primary">
            Conectar contas
          </Link>
        ) : null}
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Jogos" value={s.total} hint={`${s.physical} físicos · ${s.digital} digitais`} />
        <StatTile label="Horas jogadas" value={Math.round(s.minutes / 60).toLocaleString("pt-BR")} hint="PSN (PS4/PS5)" />
        <StatTile
          label="Platinas"
          value={s.trophies.platinum}
          hint={psn?.trophyLevel ? `Nível ${psn.trophyLevel} · ${totalTrophies.toLocaleString("pt-BR")} troféus` : `${totalTrophies} troféus`}
        />
        <StatTile label="Gamerscore" value={s.gamerscore.toLocaleString("pt-BR")} hint={`${s.achievementsXbox} conquistas`} />
        <StatTile label="Conclusão média" value={s.completion != null ? `${s.completion}%` : "—"} hint="jogos com troféus/conquistas" />
        <StatTile label="Valor da coleção" value={brl(s.value)} hint={`Pago: ${brl(s.paid)}`} />
      </section>

      {totalTrophies > 0 ? (
        <section className="card p-4">
          <TrophyCountsView counts={s.trophies} />
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-5">
          <SectionTitle>Por plataforma</SectionTitle>
          <BarList items={s.byPlatform} />
        </section>
        <section className="card p-5">
          <SectionTitle>Por status</SectionTitle>
          <BarList items={s.byStatus.map(([k, v]) => [STATUS_LABEL[k as Status] ?? k, v])} />
          {s.backlogHours > 0 ? (
            <p className="mt-4 text-xs text-ink-2">
              Backlog estimado: <strong className="text-ink">{s.backlogHours.toLocaleString("pt-BR")} h</strong> de história principal.
            </p>
          ) : null}
        </section>
        <section className="card p-5">
          <SectionTitle>Gêneros favoritos</SectionTitle>
          {s.byGenre.length ? (
            <BarList items={s.byGenre} />
          ) : (
            <p className="text-sm text-ink-2">Configure o IGDB em Contas para carregar gêneros, capas e tempos.</p>
          )}
        </section>
      </div>

      {s.recentlyPlayed.length ? (
        <section>
          <SectionTitle action={<Link href="/colecao?sort=recentes" className="text-sm text-accent">Ver todos</Link>}>
            Jogados recentemente
          </SectionTitle>
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {s.recentlyPlayed.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle>Mais jogados</SectionTitle>
          {s.mostPlayed.length ? (
            <BarList items={s.mostPlayed.map((g) => [g.title, Math.round((g.playtime_minutes ?? 0) / 60)])} unit=" h" />
          ) : (
            <p className="text-sm text-ink-2">Sincronize a PSN para ver o tempo de jogo.</p>
          )}
        </section>
        <section className="card p-5">
          <SectionTitle>Perto da platina / 100%</SectionTitle>
          {near.length ? (
            <ul className="space-y-3">
              {near.map((g) => (
                <li key={g.id}>
                  <Link href={`/jogo/${g.id}`} className="flex items-center gap-3 hover:text-accent">
                    <div className="w-10 shrink-0"><Cover game={g} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{g.title}</p>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={g.psn_progress ?? g.xbox_progress} />
                        <span className="text-xs tabular-nums text-ink-3">{g.psn_progress ?? g.xbox_progress}%</span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Nenhum jogo entre 50% e 99% ainda.</p>
          )}
        </section>
      </div>

      {recent.length ? (
        <section className="card p-5">
          <SectionTitle action={<Link href="/conquistas" className="text-sm text-accent">Ver todas</Link>}>
            Últimos troféus e conquistas
          </SectionTitle>
          <ul className="divide-y divide-line">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-2">
                {a.icon_url ? <img src={a.icon_url} alt="" className="h-10 w-10 rounded" /> : <div className="h-10 w-10 rounded bg-panel-2" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.source === "psn" && a.type && a.type !== "gamerscore" ? (
                      <TrophyIcon type={a.type as "gold"} className="mr-1 inline h-3.5 w-3.5" />
                    ) : null}
                    {a.name}
                  </p>
                  <p className="truncate text-xs text-ink-3">{a.game_title}</p>
                </div>
                <PlatformBadge platform={a.game_platform} />
                <span className="hidden text-xs text-ink-3 sm:block">{date(a.earned_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {s.minutes > 0 ? (
        <p className="text-xs text-ink-3">Tempo total registrado: {hours(s.minutes)}.</p>
      ) : null}
    </div>
  );
}
