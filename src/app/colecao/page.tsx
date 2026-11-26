import Link from "next/link";
import { addFromCatalog } from "@/app/actions";
import { Flash, GameCard, PlatformBadge } from "@/components/ui";
import { all } from "@/lib/db";
import { sagaProgress } from "@/lib/saga-catalog";
import { allGenres, allSagas, listGames, usedPlatforms } from "@/lib/queries";
import { PLATFORMS, type GameRow } from "@/lib/types";
import { STATUSES, STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

const SORT_LABEL: Record<string, string> = {
  titulo: "Título (A–Z)",
  recentes: "Jogados recentemente",
  progresso: "Progresso de troféus",
  horas: "Horas jogadas",
  nota: "Nota da crítica",
  lancamento: "Lançamento",
  duracao: "Mais curtos para zerar",
  adicionados: "Adicionados recentemente",
};

export default async function ColecaoPage({ searchParams }: PageProps<"/colecao">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const filters = {
    q: one("q"),
    platform: one("platform"),
    format: one("format"),
    status: one("status"),
    genre: one("genre"),
    saga: one("saga"),
    sort: one("sort"),
  };
  const grouped = one("agrupar") === "1";
  const [games, platforms, genres, sagas] = await Promise.all([listGames(filters), usedPlatforms(), allGenres(), allSagas()]);

  // Agrupamento por saga: sagas em ordem alfabética, jogos avulsos no fim.
  const groups = new Map<string, GameRow[]>();
  if (grouped) {
    for (const g of games) {
      const key = g.saga || "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    }
  }
  const everyGame = grouped ? await all<{ id: number; title: string; status: string }>("SELECT id, title, status FROM games") : [];
  const back = `/colecao?${new URLSearchParams(
    Object.entries({ ...filters, agrupar: "1" }).filter((e): e is [string, string] => !!e[1]),
  ).toString()}`;
  const groupKeys = [...groups.keys()].sort((a, b) => (!a ? 1 : !b ? -1 : a.localeCompare(b, "pt-BR")));

  return (
    <div>
      <Flash ok={one("ok")} erro={one("erro")} />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Coleção</h1>
          <p className="text-sm text-ink-2">{games.length} jogo(s)</p>
        </div>
        <Link href="/adicionar" className="btn-primary">+ Adicionar jogo</Link>
      </header>

      <form className="card mb-6 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-8" method="get">
        <div className="col-span-2">
          <label className="label" htmlFor="q">Buscar</label>
          <input id="q" name="q" defaultValue={filters.q} placeholder="Título, desenvolvedora…" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="platform">Plataforma</label>
          <select id="platform" name="platform" defaultValue={filters.platform ?? ""} className="input">
            <option value="">Todas</option>
            {platforms.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="format">Mídia</label>
          <select id="format" name="format" defaultValue={filters.format ?? ""} className="input">
            <option value="">Todas</option>
            <option value="fisico">Física</option>
            <option value="digital">Digital</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={filters.status ?? ""} className="input">
            <option value="">Todos (exceto desejos)</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="genre">Gênero</label>
          <select id="genre" name="genre" defaultValue={filters.genre ?? ""} className="input">
            <option value="">Todos</option>
            {genres.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="saga">Saga</label>
          <select id="saga" name="saga" defaultValue={filters.saga ?? ""} className="input">
            <option value="">Todas</option>
            {sagas.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sort">Ordenar</label>
          <select id="sort" name="sort" defaultValue={filters.sort ?? "titulo"} className="input">
            {Object.entries(SORT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-3 md:col-span-4 xl:col-span-8">
          <label className="inline-flex items-center gap-2 text-sm text-ink-2">
            <input type="checkbox" name="agrupar" value="1" defaultChecked={grouped} className="h-4 w-4 accent-accent" />
            Agrupar por saga
          </label>
          <button className="btn-primary" type="submit">Filtrar</button>
          <Link href="/colecao" className="btn-ghost">Limpar</Link>
        </div>
      </form>

      {games.length && grouped ? (
        <div className="space-y-10">
          {groupKeys.map((key) => {
            const progress = key ? sagaProgress(key, everyGame) : null;
            const missing = progress?.items.filter((i) => !i.owned.length) ?? [];
            return (
              <section key={key || "avulsos"}>
                <h2 className="mb-4 flex flex-wrap items-baseline gap-x-2 border-b border-line pb-2 text-lg font-semibold">
                  {key || "Jogos avulsos"}
                  <span className="text-sm font-normal text-ink-3">
                    {progress
                      ? `${progress.ownedCount} de ${progress.total} jogos principais da saga`
                      : `${groups.get(key)!.length} jogo(s)`}
                  </span>
                </h2>
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {groups.get(key)!.map((g) => <GameCard key={g.id} game={g} />)}
                </div>
                {missing.length ? (
                  <details className="mt-4 rounded-lg border border-dashed border-line bg-panel/50 p-3">
                    <summary className="cursor-pointer text-sm text-ink-2">
                      Faltam {missing.length} jogo(s) da saga na coleção (informativo)
                    </summary>
                    <ul className="mt-3 grid gap-2 md:grid-cols-2">
                      {missing.map(({ entry, wished }) => {
                        const options = entry.platforms.filter((p) => (PLATFORMS as readonly string[]).includes(p));
                        // Sugere a plataforma mais atual em que o jogo existe.
                        const PREFER = ["PS5", "PS4", "Xbox Series", "Switch 2", "Switch", "Xbox One", "PC"];
                        const suggested = PREFER.find((p) => options.includes(p)) ?? options[0] ?? "Outro";
                        return (
                          <li key={entry.title} className="rounded-lg border border-line p-3 opacity-80 hover:opacity-100">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{entry.title}</p>
                                <p className="text-xs text-ink-3">{entry.year}</p>
                              </div>
                              {wished ? (
                                <a href={`/jogo/${wished.id}`} className="shrink-0 rounded bg-fuchsia-500/15 px-1.5 py-0.5 text-[11px] text-fuchsia-200">
                                  Na lista de desejos
                                </a>
                              ) : null}
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {entry.platforms.map((p) => <PlatformBadge key={p} platform={p} />)}
                            </div>
                            {entry.note ? <p className="mt-1 text-xs text-ink-3">{entry.note}</p> : null}
                            {!wished ? (
                              <form action={addFromCatalog} className="mt-2 flex flex-wrap items-center gap-2">
                                <input type="hidden" name="title" value={entry.title} />
                                <input type="hidden" name="saga" value={key} />
                                <input type="hidden" name="back" value={back} />
                                <select name="platform" defaultValue={suggested} className="input w-auto py-1 text-xs" aria-label="Plataforma">
                                  {[...new Set([...options, ...PLATFORMS])].map((p) => <option key={p}>{p}</option>)}
                                </select>
                                <button name="status" value="desejado" className="btn-ghost px-2.5 py-1 text-xs" type="submit">
                                  + Desejos
                                </button>
                                <button name="status" value="backlog" className="btn-ghost px-2.5 py-1 text-xs" type="submit">
                                  + Coleção
                                </button>
                              </form>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : progress ? (
                  <p className="mt-3 text-xs text-emerald-300">✓ Você tem todos os jogos principais desta saga.</p>
                ) : null}
              </section>
            );
          })}
        </div>
      ) : games.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ) : (
        <p className="card p-8 text-center text-ink-2">Nenhum jogo encontrado com esses filtros.</p>
      )}
    </div>
  );
}
