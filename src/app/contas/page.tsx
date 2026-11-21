import { enrichAction, logout, syncPsnAction, syncXboxAction } from "@/app/actions";
import { Flash } from "@/components/ui";
import { passwordRequired } from "@/lib/auth";
import { date } from "@/lib/format";
import { getSettings, igdbCredentials } from "@/lib/settings";

export const dynamic = "force-dynamic";
// Sincronizações podem demorar; a Vercel respeita este limite (em segundos) para as ações desta página.
export const maxDuration = 300;

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-xs font-semibold">{n}</span>
      <span className="text-sm text-ink-2">{children}</span>
    </li>
  );
}

function Account({ avatar, name, sub }: { avatar: string | null; name: string | null; sub: string }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-3 rounded-lg bg-panel-2 p-3">
      {avatar ? <img src={avatar} alt="" className="h-10 w-10 rounded-full" /> : <div className="h-10 w-10 rounded-full bg-line" />}
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

const SyncButton = ({ children }: { children: React.ReactNode }) => (
  <button className="btn-primary shrink-0" type="submit">
    {children}
  </button>
);

export default async function ContasPage({ searchParams }: PageProps<"/contas">) {
  const sp = await searchParams;
  const s = await getSettings([
    "psn_online_id",
    "psn_avatar",
    "psn_last_sync",
    "xbox_gamertag",
    "xbox_avatar",
    "xbox_gamerscore",
    "xbox_last_sync",
  ]);
  const igdb = igdbCredentials();

  return (
    <div className="space-y-6">
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} erro={typeof sp.erro === "string" ? sp.erro : undefined} />
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Contas e sincronização</h1>
        {passwordRequired() ? (
          <form action={logout}>
            <button className="btn-ghost" type="submit">Sair</button>
          </form>
        ) : null}
      </div>

      <div className="rounded-lg border border-line bg-panel-2 p-4 text-sm text-ink-2">
        🔒 <strong className="text-ink">Nenhuma credencial é armazenada.</strong> O código da PSN e a chave do Xbox são usados
        apenas durante a sincronização e descartados em seguida. Guarde-os num gerenciador de senhas para colar quando quiser
        atualizar. Os dados já sincronizados (troféus, horas, conquistas) continuam salvos.
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* PSN */}
        <section className="card space-y-4 border-t-4 border-t-psn p-5">
          <h2 className="text-lg font-semibold">PlayStation Network</h2>
          <Account avatar={s.psn_avatar} name={s.psn_online_id} sub={`Última sincronização: ${date(s.psn_last_sync)}`} />
          <p className="text-sm text-ink-2">
            Traz troféus (com raridade), progresso, horas jogadas em PS4/PS5 e adiciona como “Digital” os jogos que não estão
            na estante.
          </p>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent">Como obter o código NPSSO</summary>
            <ol className="mt-3 space-y-2">
              <Step n={1}>
                Entre na sua conta em{" "}
                <a href="https://www.playstation.com/" target="_blank" rel="noreferrer" className="text-accent">playstation.com</a>.
              </Step>
              <Step n={2}>
                No mesmo navegador, abra{" "}
                <a href="https://ca.account.sony.com/api/v1/ssocookie" target="_blank" rel="noreferrer" className="break-all text-accent">
                  ca.account.sony.com/api/v1/ssocookie
                </a>
                .
              </Step>
              <Step n={3}>
                Copie o valor de <code className="rounded bg-panel-2 px-1">npsso</code> (64 caracteres). Pode colar a página
                inteira, o site extrai o código.
              </Step>
            </ol>
            <p className="mt-2 text-xs text-ink-3">
              A Sony não oferece login oficial para sites de terceiros; PSNProfiles e Exophase usam o mesmo método. O código vale
              por cerca de 2 meses e funciona como uma senha temporária: não compartilhe.
            </p>
          </details>
          <form action={syncPsnAction} className="flex gap-2">
            <input
              name="npsso"
              type="password"
              placeholder="Código NPSSO"
              className="input font-mono"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <SyncButton>Sincronizar</SyncButton>
          </form>
          <p className="text-xs text-ink-3">A primeira sincronização pode levar alguns minutos. Se faltar algo, sincronize de novo.</p>
        </section>

        {/* Xbox */}
        <section className="card space-y-4 border-t-4 border-t-xbox p-5">
          <h2 className="text-lg font-semibold">Xbox Live</h2>
          <Account
            avatar={s.xbox_avatar}
            name={s.xbox_gamertag}
            sub={`${Number(s.xbox_gamerscore ?? 0).toLocaleString("pt-BR")} G · Última sincronização: ${date(s.xbox_last_sync)}`}
          />
          <p className="text-sm text-ink-2">Traz conquistas (com raridade), Gamerscore, progresso e data em que jogou pela última vez.</p>
          <details className="text-sm">
            <summary className="cursor-pointer text-accent">Como obter a chave</summary>
            <ol className="mt-3 space-y-2">
              <Step n={1}>
                Acesse <a href="https://xbl.io/" target="_blank" rel="noreferrer" className="text-accent">xbl.io</a> e entre com a
                sua conta Microsoft/Xbox (“Login with Xbox Live”).
              </Step>
              <Step n={2}>No painel, crie uma <strong>API Key</strong> pessoal e copie.</Step>
            </ol>
            <p className="mt-2 text-xs text-ink-3">
              Plano gratuito da OpenXBL: ~150 consultas por hora. As conquistas detalhadas são buscadas aos poucos, em
              sincronizações sucessivas.
            </p>
          </details>
          <form action={syncXboxAction} className="flex gap-2">
            <input
              name="api_key"
              type="password"
              placeholder="Chave de API da OpenXBL"
              className="input font-mono"
              autoComplete="off"
              spellCheck={false}
              required
            />
            <SyncButton>Sincronizar</SyncButton>
          </form>
        </section>
      </div>

      {/* IGDB */}
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Informações dos jogos (IGDB)</h2>
        <p className="text-sm text-ink-2">
          Capas, sinopse, gêneros, desenvolvedora, notas, imagens e <strong>tempo médio para zerar</strong> vêm do IGDB (base
          gratuita da Twitch).
        </p>
        {igdb ? (
          <div className="flex flex-wrap gap-2">
            <form action={enrichAction}>
              <button className="btn-primary" type="submit">Buscar metadados dos jogos sem informação</button>
            </form>
            <form action={enrichAction}>
              <input type="hidden" name="force" value="1" />
              <button className="btn-ghost" type="submit">Atualizar todos</button>
            </form>
          </div>
        ) : (
          <ol className="space-y-2">
            <Step n={1}>
              Entre em <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer" className="text-accent">dev.twitch.tv/console/apps</a>{" "}
              com uma conta Twitch (exige verificação em duas etapas).
            </Step>
            <Step n={2}>
              “Register Your Application”: qualquer nome, OAuth Redirect URL <code className="rounded bg-panel-2 px-1">http://localhost</code>,
              categoria “Website Integration”, cliente “Confidencial”.
            </Step>
            <Step n={3}>
              Na Vercel (Project → Settings → Environment Variables), crie <code className="rounded bg-panel-2 px-1">IGDB_CLIENT_ID</code> e{" "}
              <code className="rounded bg-panel-2 px-1">IGDB_CLIENT_SECRET</code> e faça um novo deploy.
            </Step>
          </ol>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Backup</h2>
        <p className="text-sm text-ink-2">Exporta toda a coleção, troféus e conquistas em JSON.</p>
        <a href="/api/export" className="btn-ghost">Baixar backup (JSON)</a>
      </section>
    </div>
  );
}
