import Link from "next/link";
import { Flash, GameCard } from "@/components/ui";
import { allGenres, listGames, usedPlatforms } from "@/lib/queries";
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
    sort: one("sort"),
  };
  const games = listGames(filters);
  const platforms = usedPlatforms();
  const genres = allGenres();

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

      <form className="card mb-6 grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-7" method="get">
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
          <label className="label" htmlFor="sort">Ordenar</label>
          <select id="sort" name="sort" defaultValue={filters.sort ?? "titulo"} className="input">
            {Object.entries(SORT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-4 xl:col-span-7">
          <button className="btn-primary" type="submit">Filtrar</button>
          <Link href="/colecao" className="btn-ghost">Limpar</Link>
        </div>
      </form>

      {games.length ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {games.map((g) => <GameCard key={g.id} game={g} />)}
        </div>
      ) : (
        <p className="card p-8 text-center text-ink-2">Nenhum jogo encontrado com esses filtros.</p>
      )}
    </div>
  );
}
