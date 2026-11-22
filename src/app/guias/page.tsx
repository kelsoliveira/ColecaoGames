import Link from "next/link";
import { Cover, PlatformBadge, ProgressBar, TrophyIcon } from "@/components/ui";
import { all } from "@/lib/db";
import { emptyTrophies, hours, parseJson } from "@/lib/format";
import { allGuideRows, guideAvailable, guideKind } from "@/lib/guide";
import { parseGuide } from "@/lib/guide-schema";
import type { GameRow, TrophyCounts } from "@/lib/types";

export const dynamic = "force-dynamic";

type Filter = "todos" | "playstation" | "xbox" | "andamento" | "com-guia" | "perdiveis";

export default async function GuiasPage({ searchParams }: PageProps<"/guias">) {
  const sp = await searchParams;
  const filter = (typeof sp.f === "string" ? sp.f : "todos") as Filter;

  const [games, guideRows, earnedRows] = await Promise.all([
    all<GameRow>("SELECT * FROM games WHERE status <> 'desejado' ORDER BY title COLLATE NOCASE"),
    allGuideRows(),
    all<{ game_id: number; ext_id: string; earned: number }>("SELECT game_id, ext_id, earned FROM achievements"),
  ]);
  const guides = new Map(guideRows.map((r) => [r.game_id, parseGuide(r)]));
  const earnedByGame = new Map<number, Set<string>>();
  for (const r of earnedRows) {
    if (!r.earned) continue;
    if (!earnedByGame.has(r.game_id)) earnedByGame.set(r.game_id, new Set());
    earnedByGame.get(r.game_id)!.add(r.ext_id);
  }

  const items = games
    .filter((g) => guideKind(g.platform))
    .map((g) => {
      const guide = guides.get(g.id) ?? null;
      const earned = earnedByGame.get(g.id) ?? new Set<string>();
      const missablesLeft = guide
        ? guide.trophies.filter((t) => t.missable && !(t.ext_id && earned.has(t.ext_id))).length
        : 0;
      const progress = guideKind(g.platform) === "platina" ? g.psn_progress : g.xbox_progress;
      const done =
        parseJson<TrophyCounts>(g.psn_earned, emptyTrophies()).platinum > 0 ||
        (!!g.xbox_ach_total && g.xbox_ach_earned === g.xbox_ach_total);
      return { g, guide, missablesLeft, progress, done };
    })
    .filter(({ g, guide, missablesLeft, progress }) => {
      switch (filter) {
        case "playstation":
          return guideKind(g.platform) === "platina";
        case "xbox":
          return guideKind(g.platform) === "100";
        case "andamento":
          return progress != null && progress > 0 && progress < 100;
        case "com-guia":
          return !!guide;
        case "perdiveis":
          return missablesLeft > 0;
        default:
          return true;
      }
    })
    .sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1) || a.g.title.localeCompare(b.g.title, "pt-BR"));

  const FILTERS: [Filter, string][] = [
    ["todos", "Todos"],
    ["playstation", "Platina (PlayStation)"],
    ["xbox", "100% (Xbox)"],
    ["andamento", "Em andamento"],
    ["com-guia", "Com guia"],
    ["perdiveis", "Com perdíveis pendentes"],
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Guias de platina e 100%</h1>
        <p className="text-sm text-ink-2">
          Platina para PlayStation e 100% das conquistas (1000G) para Xbox, com troféus perdíveis destacados e o que falta
          para você em cada jogo.
        </p>
      </header>

      {!guideAvailable() ? (
        <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-200">
          Para gerar guias, cadastre a variável <code>ANTHROPIC_API_KEY</code> na Vercel (veja o DEPLOY.md). As listas de troféus
          e o seu progresso já aparecem sem ela.
        </p>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map(([f, label]) => (
          <Link key={f} href={`/guias?f=${f}`} className={`${filter === f ? "btn-primary" : "btn-ghost"} whitespace-nowrap`}>
            {label}
          </Link>
        ))}
      </nav>

      {items.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ g, guide, missablesLeft, progress, done }) => (
            <li key={g.id}>
              <Link href={`/guias/${g.id}`} className="card flex gap-3 p-3 hover:border-accent">
                <div className="w-16 shrink-0">
                  <Cover game={g} />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate font-medium">{g.title}</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PlatformBadge platform={g.platform} />
                    {done ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-platinum">
                        <TrophyIcon type="platinum" className="h-3.5 w-3.5" /> Concluído
                      </span>
                    ) : null}
                    {guide ? (
                      <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-blue-200">Guia</span>
                    ) : null}
                    {missablesLeft > 0 ? (
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] text-red-200">
                        ⚠ {missablesLeft} perdível(is)
                      </span>
                    ) : null}
                  </div>
                  {progress != null ? (
                    <div className="flex items-center gap-2">
                      <ProgressBar value={progress} />
                      <span className="text-xs tabular-nums text-ink-3">{progress}%</span>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-3">Sem troféus sincronizados</p>
                  )}
                  <p className="text-xs text-ink-3">
                    Jogado: {hours(g.playtime_minutes)}
                    {guide ? ` · Estimativa: ${guide.estimated_hours} h` : ""}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="card p-8 text-center text-ink-2">Nenhum jogo neste filtro.</p>
      )}
    </div>
  );
}
