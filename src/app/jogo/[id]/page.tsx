import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteGame,
  mergeGames,
  refreshMetadata,
  setStatus,
  updateGame,
} from "@/app/actions";
import { Cover, Flash, PlatformBadge, ProgressBar, StatTile, StatusBadge, TrophyCountsView, TrophyIcon } from "@/components/ui";
import { brl, date, emptyTrophies, hours, parseJson, platformFamily, secondsToHours } from "@/lib/format";
import { allSagas, gamesForMerge, getAchievements, getGame } from "@/lib/queries";
import { PLATFORMS, STATUSES, STATUS_LABEL, type TrophyCounts } from "@/lib/types";

export const dynamic = "force-dynamic";

function priceLinks(title: string, platform: string) {
  const q = encodeURIComponent(title);
  const fam = platformFamily(platform);
  const links: { label: string; href: string }[] = [];
  if (fam === "playstation") {
    links.push({ label: "PSPrices (histórico de preços)", href: `https://psprices.com/region-br/search/?q=${q}&platform=${platform}` });
    links.push({ label: "PlayStation Store", href: `https://store.playstation.com/pt-br/search/${q}` });
  }
  if (fam === "xbox") {
    links.push({ label: "Microsoft Store (Xbox)", href: `https://www.xbox.com/pt-BR/search/results/games?q=${q}` });
    links.push({ label: "XB Deals", href: `https://xbdeals.net/br-store/search?search_query=${q}` });
  }
  if (fam === "nintendo") links.push({ label: "Nintendo eShop", href: `https://www.nintendo.com/pt-br/search/#q=${q}` });
  links.push({ label: "GG.deals", href: `https://gg.deals/search/?title=${q}` });
  links.push({ label: "Mercado Livre (mídia física)", href: `https://lista.mercadolivre.com.br/${encodeURIComponent(`${title} ${platform}`)}` });
  return links;
}

function guideLinks(title: string, platform: string, slug: string | null) {
  const q = encodeURIComponent(title);
  const fam = platformFamily(platform);
  const links = [{ label: "HowLongToBeat", href: `https://howlongtobeat.com/?q=${q}` }];
  if (fam === "playstation") {
    links.push({ label: "PSNProfiles (guias de platina)", href: `https://psnprofiles.com/search/games?q=${q}` });
    links.push({ label: "PlayStationTrophies.org", href: `https://www.playstationtrophies.org/search/?q=${q}` });
  }
  if (fam === "xbox") {
    links.push({ label: "TrueAchievements", href: `https://www.trueachievements.com/searchresults.aspx?search=${q}` });
    links.push({ label: "XboxAchievements", href: `https://www.xboxachievements.com/search?q=${q}` });
  }
  links.push({ label: "Exophase", href: `https://www.exophase.com/games/?q=${q}` });
  if (slug) links.push({ label: "IGDB", href: `https://www.igdb.com/games/${slug}` });
  return links;
}

export default async function GamePage({ params, searchParams }: PageProps<"/jogo/[id]">) {
  const { id: idParam } = await params;
  const sp = await searchParams;
  const id = Number(idParam);
  const game = await getGame(id);
  if (!game) notFound();

  const [achievements, mergeCandidates, sagas] = await Promise.all([getAchievements(id), gamesForMerge(game), allSagas()]);
  const collectionSiblings = game.collection
    ? mergeCandidates.filter((g) => g.collection === game.collection && g.platform === game.platform)
    : [];
  const earnedCount = achievements.filter((a) => a.earned).length;
  const genres = parseJson<string[]>(game.genres, []);
  const shots = parseJson<string[]>(game.screenshots, []);
  const psnEarned = parseJson<TrophyCounts>(game.psn_earned, emptyTrophies());
  const psnDefined = parseJson<TrophyCounts | null>(game.psn_defined, null);
  const progress = game.psn_progress ?? game.xbox_progress;
  const filter = typeof sp.f === "string" ? sp.f : "todos";
  const shown = achievements.filter((a) => (filter === "obtidos" ? a.earned : filter === "faltando" ? !a.earned : true));

  return (
    <div className="space-y-8">
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} erro={typeof sp.erro === "string" ? sp.erro : undefined} />

      <section className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="mx-auto w-48 md:w-full">
          <Cover game={game} />
        </div>
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <PlatformBadge platform={game.platform} />
              <StatusBadge status={game.status} />
              <span className="text-xs uppercase text-ink-3">{game.format === "fisico" ? "Mídia física" : "Digital"}</span>
            </div>
            <h1 className="text-3xl font-bold">{game.title}</h1>
            {game.edition ? <p className="text-ink-2">{game.edition}</p> : null}
            {game.collection ? (
              <p className="mt-2 text-sm text-ink-2">
                Parte da coletânea{" "}
                <Link href={`/colecao?q=${encodeURIComponent(game.collection)}`} className="text-accent hover:underline">
                  {game.collection}
                </Link>
                {collectionSiblings.length ? (
                  <span className="block text-xs text-ink-3">
                    Também na caixa:{" "}
                    {collectionSiblings.map((sib, i) => (
                      <span key={sib.id}>
                        {i ? ", " : ""}
                        <Link href={`/jogo/${sib.id}`} className="hover:text-accent">{sib.title}</Link>
                      </span>
                    ))}
                  </span>
                ) : null}
              </p>
            ) : null}
            {game.saga ? (
              <Link
                href={`/colecao?agrupar=1&saga=${encodeURIComponent(game.saga)}`}
                className="mt-2 inline-flex rounded-full bg-panel-2 px-2.5 py-0.5 text-xs text-ink-2 hover:text-ink"
              >
                Saga: {game.saga}
              </Link>
            ) : null}
            {platformFamily(game.platform) === "playstation" || platformFamily(game.platform) === "xbox" ? (
              <Link href={`/guias/${id}`} className="btn-ghost mt-3">
                🏆 {platformFamily(game.platform) === "playstation" ? "Guia de platina" : "Guia 100% (1000G)"}
              </Link>
            ) : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div><dt className="text-ink-3">Lançamento</dt><dd>{date(game.release_date)}</dd></div>
            <div><dt className="text-ink-3">Desenvolvedora</dt><dd>{game.developer ?? "—"}</dd></div>
            <div><dt className="text-ink-3">Publicadora</dt><dd>{game.publisher ?? "—"}</dd></div>
            <div>
              <dt className="text-ink-3">Notas</dt>
              <dd>
                {game.critic_rating ? `Crítica ${Math.round(game.critic_rating)}` : "—"}
                {game.igdb_rating ? ` · Usuários ${Math.round(game.igdb_rating)}` : ""}
              </dd>
            </div>
          </dl>
          {genres.length ? (
            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => (
                <Link key={g} href={`/colecao?genre=${encodeURIComponent(g)}`} className="rounded-full bg-panel-2 px-2.5 py-0.5 text-xs text-ink-2 hover:text-ink">
                  {g}
                </Link>
              ))}
            </div>
          ) : null}
          {game.summary ? <p className="max-w-3xl text-sm leading-relaxed text-ink-2">{game.summary}</p> : null}

          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <form key={s} action={setStatus.bind(null, id, s)}>
                <button className={s === game.status ? "btn-primary" : "btn-ghost"} type="submit">
                  {STATUS_LABEL[s]}
                </button>
              </form>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label="Horas jogadas" value={hours(game.playtime_minutes)} hint={game.last_played ? `Última vez: ${date(game.last_played)}` : undefined} />
        <StatTile label="História principal" value={secondsToHours(game.ttb_main)} hint="tempo médio (IGDB)" />
        <StatTile label="História + extras" value={secondsToHours(game.ttb_extra)} />
        <StatTile label="100%" value={secondsToHours(game.ttb_complete)} />
        <StatTile
          label={game.xbox_title_id && !game.psn_np_id ? "Conquistas" : "Troféus"}
          value={progress != null ? `${progress}%` : "—"}
          hint={progress != null ? <ProgressBar value={progress} className="mt-1" /> : "sem dados da PSN/Xbox"}
        />
        <StatTile label="Preço pago" value={brl(game.price_paid)} hint={game.market_value ? `Valor atual: ${brl(game.market_value)}` : undefined} />
      </section>

      {game.psn_np_id || game.xbox_title_id ? (
        <section className="card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Troféus e conquistas</h2>
              {game.psn_np_id ? <TrophyCountsView counts={psnEarned} defined={psnDefined ?? undefined} /> : null}
              {game.xbox_title_id ? (
                <p className="text-sm text-ink-2">
                  {game.xbox_ach_earned}/{game.xbox_ach_total} conquistas · {game.xbox_gs_earned}/{game.xbox_gs_total} G
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {["todos", "obtidos", "faltando"].map((f) => (
                <Link key={f} href={`/jogo/${id}?f=${f}`} className={filter === f ? "btn-primary" : "btn-ghost"} scroll={false}>
                  {f === "todos" ? `Todos (${achievements.length})` : f === "obtidos" ? `Obtidos (${earnedCount})` : `Faltando (${achievements.length - earnedCount})`}
                </Link>
              ))}
            </div>
          </div>
          {shown.length ? (
            <ul className="grid gap-2 lg:grid-cols-2">
              {shown.map((a) => (
                <li key={a.id} className={`flex items-center gap-3 rounded-lg border border-line p-2 ${a.earned ? "bg-panel-2" : "opacity-60"}`}>
                  {a.icon_url ? (
                    <img src={a.icon_url} alt="" className={`h-12 w-12 shrink-0 rounded ${a.earned ? "" : "grayscale"}`} loading="lazy" />
                  ) : (
                    <div className="h-12 w-12 shrink-0 rounded bg-line" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 text-sm font-medium">
                      {a.source === "psn" && a.type ? <TrophyIcon type={a.type as "gold"} className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="truncate">{a.name ?? "Troféu oculto"}</span>
                      {a.points ? <span className="ml-auto shrink-0 text-xs text-ink-3">{a.points} G</span> : null}
                    </p>
                    <p className="line-clamp-2 text-xs text-ink-2">{a.description}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">
                      {a.rarity != null ? `${a.rarity.toLocaleString("pt-BR")}% dos jogadores` : ""}
                      {a.rarity != null && a.rarity < 5 ? " · Ultra raro" : ""}
                      {a.earned && a.earned_at ? ` · Obtido em ${date(a.earned_at)}` : ""}
                      {a.hidden && !a.earned ? " · Oculto" : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-2">Lista ainda não carregada. Sincronize de novo em Contas para buscar os detalhes.</p>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Preços</h2>
          <ul className="space-y-1.5 text-sm">
            {priceLinks(game.title, game.platform).map((l) => (
              <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l.label} ↗</a></li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Guias e tempo para zerar</h2>
          <ul className="space-y-1.5 text-sm">
            {guideLinks(game.title, game.platform, game.igdb_slug).map((l) => (
              <li key={l.href}><a href={l.href} target="_blank" rel="noreferrer" className="text-accent hover:underline">{l.label} ↗</a></li>
            ))}
          </ul>
        </section>
      </div>

      {shots.length ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Imagens</h2>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {shots.map((s) => <img key={s} src={s} alt="" loading="lazy" className="h-40 rounded-lg" />)}
          </div>
        </section>
      ) : null}

      <section className="card p-5">
        <h2 className="mb-4 text-lg font-semibold">Editar</h2>
        <form key={`${game.updated_at}-${game.status}`} action={updateGame.bind(null, id)} className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="label" htmlFor="title">Título</label>
            <input id="title" name="title" defaultValue={game.title} className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="platform">Plataforma</label>
            <select id="platform" name="platform" defaultValue={game.platform} className="input">
              {[...new Set([game.platform, ...PLATFORMS])].map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="format">Mídia</label>
            <select id="format" name="format" defaultValue={game.format} className="input">
              <option value="fisico">Física</option>
              <option value="digital">Digital</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edition">Edição</label>
            <input id="edition" name="edition" defaultValue={game.edition ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="saga">Saga / franquia</label>
            <input id="saga" name="saga" list="sagas" defaultValue={game.saga ?? ""} placeholder="Ex.: Final Fantasy" className="input" />
            <datalist id="sagas">
              {sagas.map((g) => <option key={g} value={g} />)}
            </datalist>
          </div>
          <div>
            <label className="label" htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={game.status} className="input">
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="user_rating">Minha nota (0–10)</label>
            <input id="user_rating" name="user_rating" type="number" min={0} max={10} defaultValue={game.user_rating ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="playtime_hours">Horas jogadas (manual)</label>
            <input id="playtime_hours" name="playtime_hours" type="number" step="0.5" min={0} placeholder={game.playtime_minutes ? String(Math.round(game.playtime_minutes / 6) / 10) : ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="price_paid">Preço pago (R$)</label>
            <input id="price_paid" name="price_paid" inputMode="decimal" defaultValue={game.price_paid ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="purchase_date">Data da compra</label>
            <input id="purchase_date" name="purchase_date" type="date" defaultValue={game.purchase_date ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="market_value">Valor de mercado (R$)</label>
            <input id="market_value" name="market_value" inputMode="decimal" defaultValue={game.market_value ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="target_price">Preço-alvo (R$)</label>
            <input id="target_price" name="target_price" inputMode="decimal" defaultValue={game.target_price ?? ""} className="input" />
          </div>
          <div className="md:col-span-4">
            <label className="label" htmlFor="notes">Anotações</label>
            <textarea id="notes" name="notes" rows={3} defaultValue={game.notes ?? ""} className="input" />
          </div>
          <div className="md:col-span-4">
            <button className="btn-primary" type="submit">Salvar</button>
          </div>
        </form>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold">Metadados (IGDB)</h2>
          <p className="mb-3 text-sm text-ink-2">
            Se a capa ou as informações vieram do jogo errado, informe o ID do IGDB (aparece na página do jogo em igdb.com).
          </p>
          <form action={refreshMetadata.bind(null, id)} className="flex gap-2">
            <input name="igdb_id" placeholder={game.igdb_id ? `Atual: ${game.igdb_id}` : "ID do IGDB (opcional)"} className="input" inputMode="numeric" />
            <button className="btn-ghost shrink-0" type="submit">Buscar metadados</button>
          </form>
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-lg font-semibold">Unir com outro registro</h2>
          <p className="mb-3 text-sm text-ink-2">
            Use quando a sincronização criou um jogo digital que na verdade é este da estante. Troféus, horas e dados de
            PSN/Xbox do outro registro vêm para este.
          </p>
          <form action={mergeGames.bind(null, id)} className="flex gap-2">
            <select name="other_id" className="input" defaultValue="">
              <option value="" disabled>Escolha o jogo…</option>
              {mergeCandidates.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title} — {g.platform} {g.format === "digital" ? "(digital)" : ""}
                </option>
              ))}
            </select>
            <button className="btn-ghost shrink-0" type="submit">Unir</button>
          </form>
        </section>
      </div>

      <form action={deleteGame.bind(null, id)}>
        <button className="btn-danger" type="submit">Remover jogo da coleção</button>
      </form>
    </div>
  );
}
