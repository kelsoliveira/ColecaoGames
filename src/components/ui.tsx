import Link from "next/link";
import { emptyTrophies, parseJson, platformFamily } from "@/lib/format";
import { STATUS_LABEL, type GameRow, type Status, type TrophyCounts } from "@/lib/types";

const FAMILY_STYLE: Record<string, string> = {
  playstation: "bg-psn/20 text-blue-200 ring-psn/50",
  xbox: "bg-xbox/20 text-green-200 ring-xbox/50",
  nintendo: "bg-nintendo/20 text-red-200 ring-nintendo/50",
  pc: "bg-zinc-500/20 text-zinc-200 ring-zinc-500/50",
  outro: "bg-zinc-500/20 text-zinc-200 ring-zinc-500/50",
};

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
        FAMILY_STYLE[platformFamily(platform)]
      }`}
    >
      {platform}
    </span>
  );
}

const STATUS_STYLE: Record<Status, string> = {
  backlog: "text-ink-2 bg-zinc-500/15",
  jogando: "text-sky-200 bg-sky-500/15",
  zerado: "text-emerald-200 bg-emerald-500/15",
  platinado: "text-cyan-100 bg-cyan-400/20",
  abandonado: "text-orange-200 bg-orange-500/15",
  desejado: "text-fuchsia-200 bg-fuchsia-500/15",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Cover({ game, className = "" }: { game: GameRow; className?: string }) {
  const src = game.cover_url ?? game.psn_icon ?? game.xbox_icon;
  if (src)
    return (
      <img
        src={src}
        alt={`Capa de ${game.title}`}
        loading="lazy"
        className={`aspect-[3/4] w-full rounded-lg bg-panel-2 object-cover ${className}`}
      />
    );
  // Capa genérica quando ainda não há metadados
  let hash = 0;
  for (const c of game.title) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  return (
    <div
      className={`flex aspect-[3/4] w-full items-end rounded-lg p-3 ${className}`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 28%), hsl(${(hue + 40) % 360} 35% 12%))` }}
    >
      <span className="line-clamp-4 text-sm font-semibold leading-tight text-white/90">{game.title}</span>
    </div>
  );
}

export function ProgressBar({ value, className = "" }: { value: number | null | undefined; className?: string }) {
  if (value == null) return null;
  return (
    <div
      className={`h-1.5 w-full overflow-hidden rounded-full bg-line ${className}`}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className={`h-full rounded-full ${value >= 100 ? "bg-platinum" : "bg-accent"}`} style={{ width: `${value}%` }} />
    </div>
  );
}

const TROPHY_COLOR = {
  platinum: "text-platinum",
  gold: "text-gold",
  silver: "text-silver",
  bronze: "text-bronze",
} as const;

export function TrophyIcon({ type, className = "h-4 w-4" }: { type: keyof typeof TROPHY_COLOR; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} ${TROPHY_COLOR[type]}`} fill="currentColor" aria-hidden>
      <path d="M7 3h10v2h3v3a4 4 0 0 1-4 4h-.3A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 8.3 12H8a4 4 0 0 1-4-4V5h3V3Zm0 4H6v1a2 2 0 0 0 1 1.7V7Zm10 0v2.7A2 2 0 0 0 18 8V7h-1Z" />
    </svg>
  );
}

export function TrophyCountsView({ counts, defined }: { counts: TrophyCounts; defined?: TrophyCounts }) {
  const order = ["platinum", "gold", "silver", "bronze"] as const;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {order.map((t) =>
        defined && defined[t] === 0 && t === "platinum" ? null : (
          <span key={t} className="inline-flex items-center gap-1" title={t}>
            <TrophyIcon type={t} />
            <span className="tabular-nums">
              {counts[t]}
              {defined ? <span className="text-ink-3">/{defined[t]}</span> : null}
            </span>
          </span>
        ),
      )}
    </div>
  );
}

export function GameCard({ game }: { game: GameRow }) {
  const progress = game.psn_progress ?? game.xbox_progress;
  const earned = parseJson<TrophyCounts>(game.psn_earned, emptyTrophies());
  return (
    <Link href={`/jogo/${game.id}`} className="group block">
      <div className="relative">
        <Cover game={game} className="transition group-hover:ring-2 group-hover:ring-accent" />
        {earned.platinum > 0 || (game.xbox_ach_total && game.xbox_ach_earned === game.xbox_ach_total) ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/70 p-1" title="100% / Platinado">
            <TrophyIcon type="platinum" />
          </span>
        ) : null}
        {game.collection ? (
          <span className="absolute bottom-2 left-2 right-2 truncate rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-ink-2">
            {game.collection}
          </span>
        ) : null}
        {game.format === "digital" ? (
          <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-2">
            Digital
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-accent">{game.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <PlatformBadge platform={game.platform} />
          <StatusBadge status={game.status} />
        </div>
        {progress != null ? (
          <div className="flex items-center gap-2">
            <ProgressBar value={progress} />
            <span className="text-[11px] tabular-nums text-ink-3">{progress}%</span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}

export function Flash({ ok, erro }: { ok?: string; erro?: string }) {
  if (!ok && !erro) return null;
  return (
    <div
      role="status"
      className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
        erro ? "border-red-900/60 bg-red-950/40 text-red-200" : "border-emerald-900/60 bg-emerald-950/40 text-emerald-200"
      }`}
    >
      {erro ?? ok}
    </div>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-3">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-2">{hint}</p> : null}
    </div>
  );
}

/** Barras horizontais de série única (magnitude). Valor sempre rotulado em texto; tooltip nativo no hover. */
export function BarList({ items, unit = "" }: { items: [string, number][]; unit?: string }) {
  const max = Math.max(1, ...items.map(([, v]) => v));
  return (
    <ul className="space-y-2">
      {items.map(([label, v]) => (
        <li key={label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3 text-sm" title={`${label}: ${v}${unit}`}>
          <span className="truncate text-ink-2">{label}</span>
          <span className="h-3 rounded-r bg-line/40">
            <span className="block h-3 rounded-r bg-accent" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-ink">{v}{unit}</span>
        </li>
      ))}
    </ul>
  );
}

export function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold">{children}</h2>
      {action}
    </div>
  );
}
