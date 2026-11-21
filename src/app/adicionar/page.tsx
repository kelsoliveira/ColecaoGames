import { createGame } from "@/app/actions";
import { Flash } from "@/components/ui";
import { igdbImage, searchIgdb, type IgdbGame } from "@/lib/igdb";
import { igdbCredentials } from "@/lib/settings";
import { PLATFORMS, STATUSES, STATUS_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdicionarPage({ searchParams }: PageProps<"/adicionar">) {
  const sp = await searchParams;
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const q = one("q");
  const platform = one("platform") ?? "PS5";
  const status = one("status") ?? "backlog";
  const hasIgdb = !!igdbCredentials();

  let results: IgdbGame[] = [];
  let error: string | undefined;
  if (q && hasIgdb) {
    try {
      results = await searchIgdb(q, platform);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  return (
    <div className="space-y-6">
      <Flash erro={one("erro") ?? error} />
      <h1 className="text-2xl font-bold">Adicionar jogo</h1>

      <form method="get" className="card grid gap-3 p-4 md:grid-cols-[1fr_12rem_12rem_auto]">
        <div>
          <label className="label" htmlFor="q">Buscar no IGDB</label>
          <input id="q" name="q" defaultValue={q} placeholder="Ex.: Astro Bot" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="platform">Plataforma</label>
          <select id="platform" name="platform" defaultValue={platform} className="input">
            {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Adicionar como</label>
          <select id="status" name="status" defaultValue={status} className="input">
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" type="submit">Buscar</button>
        </div>
        {!hasIgdb ? (
          <p className="text-sm text-ink-2 md:col-span-4">
            Configure o IGDB (veja em <a href="/contas" className="text-accent">Contas</a>) para buscar com capa e informações. Você ainda pode
            cadastrar manualmente abaixo.
          </p>
        ) : null}
      </form>

      {results.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((r) => (
            <li key={r.id} className="card flex gap-3 p-3">
              {r.cover ? (
                <img src={igdbImage(r.cover.image_id, "t_cover_small_2x")} alt="" className="h-28 w-20 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-28 w-20 shrink-0 rounded bg-panel-2" />
              )}
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="font-medium">{r.name}</p>
                <p className="text-xs text-ink-3">
                  {r.first_release_date ? new Date(r.first_release_date * 1000).getFullYear() : "—"} ·{" "}
                  {r.platforms?.map((p) => p.abbreviation ?? p.name).slice(0, 5).join(", ")}
                </p>
                <form action={createGame} className="mt-auto flex gap-2 pt-2">
                  <input type="hidden" name="title" value={r.name} />
                  <input type="hidden" name="platform" value={platform} />
                  <input type="hidden" name="status" value={status} />
                  <input type="hidden" name="igdb_id" value={r.id} />
                  <select name="format" className="input py-1" defaultValue="fisico" aria-label="Mídia">
                    <option value="fisico">Física</option>
                    <option value="digital">Digital</option>
                  </select>
                  <button className="btn-primary shrink-0 py-1" type="submit">Adicionar</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      ) : q && hasIgdb && !error ? (
        <p className="text-ink-2">Nenhum resultado para “{q}”.</p>
      ) : null}

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Cadastro manual</h2>
        <form action={createGame} className="grid gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <label className="label" htmlFor="m-title">Título</label>
            <input id="m-title" name="title" required className="input" defaultValue={q} />
          </div>
          <div>
            <label className="label" htmlFor="m-platform">Plataforma</label>
            <select id="m-platform" name="platform" defaultValue={platform} className="input">
              {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m-format">Mídia</label>
            <select id="m-format" name="format" className="input">
              <option value="fisico">Física</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="m-edition">Edição</label>
            <input id="m-edition" name="edition" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="m-price">Preço pago (R$)</label>
            <input id="m-price" name="price_paid" inputMode="decimal" className="input" />
          </div>
          <input type="hidden" name="status" value={status} />
          <div className="md:col-span-6">
            <button className="btn-primary" type="submit">Salvar</button>
          </div>
        </form>
      </section>
    </div>
  );
}
