import Link from "next/link";
import { notFound } from "next/navigation";
import { requestGuideAction, toggleMissableAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Cover, Flash, PlatformBadge, ProgressBar, StatTile, TrophyIcon } from "@/components/ui";
import { all, get } from "@/lib/db";
import { date, hours, parseJson } from "@/lib/format";
import { guideAutomationAvailable, guideKind, guideRequestStatus, loadGuide } from "@/lib/guide";
import type { Guide } from "@/lib/guide-schema";
import type { AchievementRow, GameRow } from "@/lib/types";

export const dynamic = "force-dynamic";

const T = {
  pt: {
    platina: "Guia de platina",
    cem: "Guia 100% (1000G)",
    played: "Tempo jogado",
    estimate: "Estimativa total",
    remaining: "Restante (estimado)",
    difficulty: "Dificuldade",
    playthroughs: "Jogadas mínimas",
    online: "Online",
    yes: "Sim",
    no: "Não",
    missables: "Troféus perdíveis",
    noMissables: "Nenhum troféu perdível marcado.",
    roadmap: "Roteiro",
    trophies: "Troféus e conquistas",
    all: "Todos",
    missing: "Faltando",
    earned: "Obtidos",
    missableF: "Perdíveis",
    missable: "Perdível",
    got: "Obtido em",
    pending: "Pendente",
    hidden: "Troféu oculto: toque para revelar",
    rarity: "dos jogadores",
    finalTip: "Para fechar",
    video: "Vídeo do guia",
    watch: "Ver vídeos no YouTube",
    images: "Imagens do jogo",
    sources: "Fontes consultadas",
    note: "Atenção",
    ai: "Guia escrito pelo Claude Code a partir da lista oficial e de pesquisa na web. Confira os perdíveis antes de começar.",
    edited: "Marcações de perdível ajustadas por você.",
    unofficial: "Lista vinda da pesquisa (sincronize a conta para ver a lista oficial e o seu progresso).",
    noList: "Nenhuma lista de troféus sincronizada para este jogo ainda. Ela aparece depois que você jogar e sincronizar a conta em Contas.",
    toggleOn: "Marcar como perdível",
    toggleOff: "Desmarcar perdível",
    left: "faltam",
    of: "de",
    hoursUnit: "h",
  },
  en: {
    platina: "Platinum guide",
    cem: "100% guide (1000G)",
    played: "Time played",
    estimate: "Total estimate",
    remaining: "Remaining (estimate)",
    difficulty: "Difficulty",
    playthroughs: "Minimum playthroughs",
    online: "Online",
    yes: "Yes",
    no: "No",
    missables: "Missable trophies",
    noMissables: "No missable trophies flagged.",
    roadmap: "Roadmap",
    trophies: "Trophies & achievements",
    all: "All",
    missing: "Missing",
    earned: "Earned",
    missableF: "Missable",
    missable: "Missable",
    got: "Earned on",
    pending: "Pending",
    hidden: "Hidden trophy: tap to reveal",
    rarity: "of players",
    finalTip: "Wrapping up",
    video: "Guide video",
    watch: "Watch videos on YouTube",
    images: "Game images",
    sources: "Sources",
    note: "Heads-up",
    ai: "Guide written by Claude Code from the official list and web research. Double-check missables before you start.",
    edited: "Missable flags adjusted by you.",
    unofficial: "List from research (sync your account to see the official list and your progress).",
    noList: "No trophy list synced for this game yet. It shows up after you play and sync your account.",
    toggleOn: "Flag as missable",
    toggleOff: "Unflag missable",
    left: "left",
    of: "of",
    hoursUnit: "h",
  },
} as const;

type Lang = keyof typeof T;

type Row = {
  key: string;
  official: AchievementRow | null;
  guideIndex: number | null;
  info: Guide["trophies"][number] | null;
};

export default async function GuidePage({ params, searchParams }: PageProps<"/guias/[id]">) {
  const { id: idParam } = await params;
  const sp = await searchParams;
  const id = Number(idParam);
  const lang: Lang = sp.lang === "en" ? "en" : "pt";
  const t = T[lang];
  const filter = typeof sp.f === "string" ? sp.f : "todos";

  const game = await get<GameRow>("SELECT * FROM games WHERE id = ?", [id]);
  if (!game) notFound();
  const kind = guideKind(game.platform);
  if (!kind) notFound();

  const source = kind === "platina" ? "psn" : "xbox";
  const [official, loaded] = await Promise.all([
    all<AchievementRow>("SELECT * FROM achievements WHERE game_id = ? AND source = ? ORDER BY CAST(ext_id AS INTEGER), ext_id", [id, source]),
    loadGuide(game),
  ]);
  const guide = loaded?.guide ?? null;
  const sources = loaded?.sources ?? [];
  const request = await guideRequestStatus(game, loaded);
  const shots = parseJson<string[]>(game.screenshots, []);

  // Junta a lista oficial (nomes PT/EN, obtido/faltando, raridade) com as informações do guia (perdível, dica).
  const byExt = new Map<string, number>();
  guide?.trophies.forEach((tr, i) => tr.ext_id && byExt.set(tr.ext_id, i));
  const rows: Row[] = official.length
    ? official.map((a) => {
        const gi = byExt.get(a.ext_id) ?? null;
        return { key: a.ext_id, official: a, guideIndex: gi, info: gi != null ? guide!.trophies[gi] : null };
      })
    : (guide?.trophies ?? []).map((info, i) => ({ key: `g${i}`, official: null, guideIndex: i, info }));

  const isEarned = (r: Row) => !!r.official?.earned;
  const isMissable = (r: Row) => !!r.info?.missable;
  const shown = rows.filter((r) =>
    filter === "faltando" ? !isEarned(r) : filter === "obtidos" ? isEarned(r) : filter === "perdiveis" ? isMissable(r) : true,
  );
  const missables = rows.filter(isMissable);
  const earnedCount = rows.filter(isEarned).length;
  const progress = kind === "platina" ? game.psn_progress : game.xbox_progress;

  const name = (r: Row) =>
    lang === "en"
      ? (r.official?.name_en ?? r.info?.name_en ?? r.official?.name ?? "")
      : (r.official?.name ?? r.info?.name_pt ?? r.official?.name_en ?? "");
  const desc = (r: Row) =>
    lang === "en" ? (r.official?.description_en ?? r.official?.description ?? "") : (r.official?.description ?? r.official?.description_en ?? "");
  const tip = (r: Row) => (lang === "en" ? r.info?.tip_en : r.info?.tip_pt) ?? "";

  const platinumRow = rows.find((r) => (r.official?.type ?? r.info?.type) === "platinum");
  const estimate = guide?.estimated_hours ?? (game.ttb_complete ? Math.round(game.ttb_complete / 3600) : null);
  const playedH = game.playtime_minutes ? game.playtime_minutes / 60 : 0;
  const remaining = estimate != null ? Math.max(0, Math.round(estimate - playedH)) : null;

  const query = (f: string, l: Lang = lang) => {
    const p = new URLSearchParams();
    if (l === "en") p.set("lang", "en");
    if (f !== "todos") p.set("f", f);
    const s = p.toString();
    return s ? `?${s}` : "";
  };
  const currentQuery = query(filter);
  const ytQuery = encodeURIComponent(`${game.title} ${kind === "platina" ? "platinum trophy guide" : "achievement guide 1000G"}`);

  return (
    <div className="space-y-8">
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} erro={typeof sp.erro === "string" ? sp.erro : undefined} />

      {/* Cabeçalho */}
      <section className="grid gap-5 md:grid-cols-[160px_1fr]">
        <div className="mx-auto w-36 md:w-full">
          <Cover game={game} />
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <PlatformBadge platform={game.platform} />
              <span className="text-xs uppercase tracking-wide text-ink-3">{kind === "platina" ? t.platina : t.cem}</span>
            </div>
            <div className="flex overflow-hidden rounded-lg border border-line text-sm" role="group" aria-label="Idioma">
              <Link href={`/guias/${id}${query(filter, "pt")}`} className={`px-3 py-1.5 ${lang === "pt" ? "bg-accent text-white" : "text-ink-2"}`}>
                PT-BR
              </Link>
              <Link href={`/guias/${id}${query(filter, "en")}`} className={`px-3 py-1.5 ${lang === "en" ? "bg-accent text-white" : "text-ink-2"}`}>
                EN
              </Link>
            </div>
          </div>
          <h1 className="text-3xl font-bold">{game.title}</h1>
          {rows.length && official.length ? (
            <div className="flex items-center gap-3">
              <ProgressBar value={progress ?? Math.round((earnedCount / rows.length) * 100)} />
              <span className="shrink-0 text-sm tabular-nums text-ink-2">
                {earnedCount} {t.of} {rows.length} · {progress ?? Math.round((earnedCount / rows.length) * 100)}%
              </span>
            </div>
          ) : null}
          {guide ? <p className="max-w-3xl text-sm leading-relaxed text-ink-2">{lang === "en" ? guide.summary_en : guide.summary_pt}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Link href={`/jogo/${id}`} className="btn-ghost">Ficha do jogo</Link>
            {guideAutomationAvailable() && request.state === "nenhum" ? (
              <form action={requestGuideAction.bind(null, id)}>
                <SubmitButton className={guide ? "btn-ghost" : "btn-primary"} pending="Enviando pedido…">
                  {guide ? "Pedir guia atualizado" : "Gerar guia com Claude Code"}
                </SubmitButton>
              </form>
            ) : null}
          </div>
        </div>
      </section>

      {request.state !== "nenhum" ? (
        <section
          className={`rounded-lg border p-4 text-sm ${
            request.state === "falhou" ? "border-red-900/60 bg-red-950/40 text-red-200" : "border-sky-900/60 bg-sky-950/40 text-sky-100"
          }`}
          role="status"
        >
          {request.state === "fila" ? "⏳ Pedido de guia na fila do GitHub. " : null}
          {request.state === "rodando" ? "🔎 O Claude Code está pesquisando e escrevendo o guia. " : null}
          {request.state === "publicando" ? "🚀 Guia pronto! Publicando no site; atualize a página em 1 a 2 minutos. " : null}
          {request.state === "falhou" ? "Não foi possível gerar o guia. Veja os detalhes no GitHub e tente de novo mais tarde. " : null}
          <span className="text-xs opacity-80">Pedido em {date(`${request.since.replace(" ", "T")}Z`)}.</span>{" "}
          {request.url ? (
            <a href={request.url} target="_blank" rel="noreferrer" className="underline">
              Acompanhar no GitHub
            </a>
          ) : null}
        </section>
      ) : null}

      {/* Tempo e dificuldade */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile label={t.played} value={hours(game.playtime_minutes)} hint={game.last_played ? date(game.last_played) : undefined} />
        <StatTile label={t.estimate} value={estimate != null ? `${estimate} ${t.hoursUnit}` : "—"} hint={guide ? "guia" : game.ttb_complete ? "IGDB" : undefined} />
        <StatTile label={t.remaining} value={remaining != null ? `${remaining} ${t.hoursUnit}` : "—"} />
        <StatTile label={t.difficulty} value={guide ? `${guide.difficulty}/10` : "—"} />
        <StatTile label={t.playthroughs} value={guide ? guide.min_playthroughs : "—"} />
        <StatTile label={t.online} value={guide ? (guide.online_required ? t.yes : t.no) : "—"} />
      </section>

      {/* Platina */}
      {platinumRow || guide ? (
        <section className="card grid gap-5 p-5 md:grid-cols-[auto_1fr]">
          <div className="flex justify-center">
            {platinumRow?.official?.icon_url ? (
              <img
                src={platinumRow.official.icon_url}
                alt=""
                className={`h-32 w-32 rounded-xl ${platinumRow.official.earned ? "" : "grayscale"}`}
              />
            ) : (
              <div className="grid h-32 w-32 place-items-center rounded-xl bg-panel-2">
                <TrophyIcon type="platinum" className="h-16 w-16" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-xl font-semibold">
              <TrophyIcon type="platinum" className="h-5 w-5" />
              {platinumRow ? name(platinumRow) : kind === "platina" ? "Platina" : "100%"}
            </p>
            {platinumRow ? <p className="text-sm text-ink-2">{desc(platinumRow)}</p> : null}
            <p className="text-sm">
              {platinumRow?.official?.earned ? (
                <span className="text-platinum">✓ {t.got} {date(platinumRow.official.earned_at)}</span>
              ) : official.length ? (
                <span className="text-ink-2">
                  {t.pending} · {t.left} {rows.length - earnedCount - (platinumRow ? 1 : 0)}
                </span>
              ) : null}
            </p>
            {guide ? (
              <p className="rounded-lg bg-panel-2 p-3 text-sm">
                <strong>{t.finalTip}:</strong> {lang === "en" ? guide.platinum_tip_en : guide.platinum_tip_pt}
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Perdíveis */}
      {guide ? (
        <section className="card border-l-4 border-l-red-500 p-5">
          <h2 className="mb-2 text-lg font-semibold">⚠ {t.missables}</h2>
          <p className="mb-3 text-sm text-ink-2">{lang === "en" ? guide.missable_warning_en : guide.missable_warning_pt}</p>
          {missables.length ? (
            <ul className="space-y-1.5">
              {missables.map((r) => (
                <li key={r.key} className="flex items-start gap-2 text-sm">
                  <span className={isEarned(r) ? "text-emerald-300" : "text-red-300"}>{isEarned(r) ? "✓" : "○"}</span>
                  <span>
                    <strong>{name(r)}</strong>
                    {tip(r) ? <span className="text-ink-2">: {tip(r)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-3">{t.noMissables}</p>
          )}
        </section>
      ) : null}

      {/* Roteiro */}
      {guide?.roadmap.length ? (
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">{t.roadmap}</h2>
          <ol className="space-y-5">
            {guide.roadmap.map((step, i) => (
              <li key={i} className="grid grid-cols-[2rem_1fr] gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <p className="font-semibold">{lang === "en" ? step.title_en : step.title_pt}</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-2">
                    {(lang === "en" ? step.steps_en : step.steps_pt).map((s, j) => (
                      <li key={j}>{s}</li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* Lista de troféus */}
      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t.trophies}</h2>
          <div className="flex flex-wrap gap-2">
            {[
              ["todos", `${t.all} (${rows.length})`],
              ["faltando", `${t.missing} (${rows.length - earnedCount})`],
              ["obtidos", `${t.earned} (${earnedCount})`],
              ["perdiveis", `${t.missableF} (${missables.length})`],
            ].map(([f, label]) => (
              <Link key={f} href={`/guias/${id}${query(f)}`} scroll={false} className={filter === f ? "btn-primary" : "btn-ghost"}>
                {label}
              </Link>
            ))}
          </div>
        </div>
        {!official.length ? <p className="mb-3 text-sm text-ink-3">{guide ? t.unofficial : t.noList}</p> : null}
        <ul className="space-y-2">
          {shown.map((r) => {
            const hidden = !!r.official?.hidden && !isEarned(r);
            const type = (r.official?.type ?? r.info?.type ?? "bronze") as "bronze";
            const content = (
              <>
                <p className="text-sm font-medium">{name(r)}</p>
                {desc(r) ? <p className="text-xs text-ink-2">{desc(r)}</p> : null}
                {tip(r) ? <p className="mt-1 rounded bg-panel-2 px-2 py-1 text-xs text-ink">💡 {tip(r)}</p> : null}
              </>
            );
            return (
              <li
                key={r.key}
                className={`flex gap-3 rounded-lg border p-2.5 ${isMissable(r) && !isEarned(r) ? "border-red-900/70" : "border-line"} ${isEarned(r) ? "bg-panel-2" : ""}`}
              >
                {r.official?.icon_url ? (
                  <img src={r.official.icon_url} alt="" loading="lazy" className={`h-12 w-12 shrink-0 rounded ${isEarned(r) ? "" : "opacity-60 grayscale"}`} />
                ) : (
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded bg-line">
                    {type !== ("gamerscore" as string) ? <TrophyIcon type={type} className="h-6 w-6" /> : null}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    {source === "psn" ? <TrophyIcon type={type} className="h-3.5 w-3.5" /> : null}
                    {r.official?.points ? <span className="text-ink-3">{r.official.points}G</span> : null}
                    {isMissable(r) ? <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-semibold text-red-200">⚠ {t.missable}</span> : null}
                    {isEarned(r) ? (
                      <span className="text-emerald-300">✓ {t.got} {date(r.official!.earned_at)}</span>
                    ) : official.length ? (
                      <span className="text-ink-3">{t.pending}</span>
                    ) : null}
                    {r.official?.rarity != null ? (
                      <span className="text-ink-3">· {r.official.rarity.toLocaleString(lang === "en" ? "en-US" : "pt-BR")}% {t.rarity}</span>
                    ) : null}
                  </div>
                  {hidden ? (
                    <details>
                      <summary className="cursor-pointer text-sm text-ink-2">{t.hidden}</summary>
                      {content}
                    </details>
                  ) : (
                    content
                  )}
                  {r.guideIndex != null ? (
                    <form action={toggleMissableAction.bind(null, id, r.guideIndex, currentQuery)} className="mt-1">
                      <button type="submit" className="text-[11px] text-ink-3 underline-offset-2 hover:text-accent hover:underline">
                        {isMissable(r) ? t.toggleOff : t.toggleOn}
                      </button>
                    </form>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Vídeo e imagens */}
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">{t.video}</h2>
        <a href={`https://www.youtube.com/results?search_query=${ytQuery}`} target="_blank" rel="noreferrer" className="btn-ghost">
          ▶ {t.watch}
        </a>
        {shots.length ? (
          <>
            <h3 className="pt-2 text-sm font-semibold text-ink-2">{t.images}</h3>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {shots.map((s) => (
                <img key={s} src={s} alt="" loading="lazy" className="h-36 rounded-lg" />
              ))}
            </div>
          </>
        ) : null}
      </section>

      {/* Fontes e avisos */}
      {guide ? (
        <section className="space-y-3 text-sm text-ink-2">
          {(lang === "en" ? guide.confidence_note_en : guide.confidence_note_pt) ? (
            <p className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-amber-200">
              <strong>{t.note}:</strong> {lang === "en" ? guide.confidence_note_en : guide.confidence_note_pt}
            </p>
          ) : null}
          <p className="text-xs text-ink-3">
            {t.ai} {loaded?.edited ? t.edited : ""} ({date(loaded?.updatedAt)})
          </p>
          {sources.length ? (
            <details>
              <summary className="cursor-pointer text-accent">{t.sources} ({sources.length})</summary>
              <ul className="mt-2 space-y-1">
                {sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className="break-all text-accent hover:underline">
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
