import {
  connectPsnAction,
  connectXboxAction,
  disconnectPsnAction,
  disconnectXboxAction,
  enrichAction,
  logout,
  saveIgdb,
  syncPsnAction,
  syncXboxAction,
} from "@/app/actions";
import { Flash } from "@/components/ui";
import { date } from "@/lib/format";
import { psnConnected } from "@/lib/psn";
import { getSetting, igdbCredentials } from "@/lib/settings";
import { xboxConnected } from "@/lib/xbox";

export const dynamic = "force-dynamic";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-panel-2 text-xs font-semibold">{n}</span>
      <span className="text-sm text-ink-2">{children}</span>
    </li>
  );
}

function Account({ avatar, name, sub }: { avatar: string | null; name: string | null; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      {avatar ? <img src={avatar} alt="" className="h-12 w-12 rounded-full" /> : <div className="h-12 w-12 rounded-full bg-panel-2" />}
      <div>
        <p className="font-semibold">{name ?? "Conectado"}</p>
        <p className="text-xs text-ink-3">{sub}</p>
      </div>
    </div>
  );
}

export default async function ContasPage({ searchParams }: PageProps<"/contas">) {
  const sp = await searchParams;
  const psnOk = psnConnected();
  const xboxOk = xboxConnected();
  const igdb = igdbCredentials();
  const igdbFromEnv = !!process.env.IGDB_CLIENT_ID;

  return (
    <div className="space-y-6">
      <Flash ok={typeof sp.ok === "string" ? sp.ok : undefined} erro={typeof sp.erro === "string" ? sp.erro : undefined} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas e sincronização</h1>
        {process.env.APP_PASSWORD ? (
          <form action={logout}><button className="btn-ghost" type="submit">Sair</button></form>
        ) : null}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* PSN */}
        <section className="card space-y-4 border-t-4 border-t-psn p-5">
          <h2 className="text-lg font-semibold">PlayStation Network</h2>
          {psnOk ? (
            <>
              <Account
                avatar={getSetting("psn_avatar")}
                name={getSetting("psn_online_id")}
                sub={`Última sincronização: ${date(getSetting("psn_last_sync"))}`}
              />
              <p className="text-sm text-ink-2">
                Traz troféus (com raridade), progresso, horas jogadas em PS4/PS5 e cria automaticamente os jogos digitais que
                não estão na estante.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={syncPsnAction}><button className="btn-primary" type="submit">Sincronizar PSN</button></form>
                <form action={disconnectPsnAction}><button className="btn-ghost" type="submit">Desconectar</button></form>
              </div>
              <p className="text-xs text-ink-3">A primeira sincronização pode levar alguns minutos se você tiver muitos jogos.</p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-2">
                A Sony não oferece login oficial para sites de terceiros. Assim como PSNProfiles e Exophase, usamos o código de
                sessão <strong>NPSSO</strong> da sua conta:
              </p>
              <ol className="space-y-2">
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
                <Step n={3}>Copie o valor de <code className="rounded bg-panel-2 px-1">npsso</code> (64 caracteres) e cole abaixo.</Step>
              </ol>
              <form action={connectPsnAction} className="flex gap-2">
                <input name="npsso" placeholder="Código NPSSO" className="input font-mono" autoComplete="off" required />
                <button className="btn-primary shrink-0" type="submit">Conectar</button>
              </form>
              <p className="text-xs text-ink-3">
                O NPSSO equivale a uma senha temporária: não compartilhe. Ele é trocado por tokens e <strong>não fica salvo</strong>;
                os tokens ficam apenas no banco local (pasta <code>data/</code>), válidos por cerca de 2 meses.
              </p>
            </>
          )}
        </section>

        {/* Xbox */}
        <section className="card space-y-4 border-t-4 border-t-xbox p-5">
          <h2 className="text-lg font-semibold">Xbox Live</h2>
          {xboxOk ? (
            <>
              <Account
                avatar={getSetting("xbox_avatar")}
                name={getSetting("xbox_gamertag")}
                sub={`${Number(getSetting("xbox_gamerscore") ?? 0).toLocaleString("pt-BR")} G · Última sincronização: ${date(getSetting("xbox_last_sync"))}`}
              />
              <p className="text-sm text-ink-2">
                Traz conquistas (com raridade), Gamerscore, progresso e data em que jogou pela última vez.
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={syncXboxAction}><button className="btn-primary" type="submit">Sincronizar Xbox</button></form>
                <form action={disconnectXboxAction}><button className="btn-ghost" type="submit">Desconectar</button></form>
              </div>
              <p className="text-xs text-ink-3">
                O plano gratuito da OpenXBL permite ~150 consultas/hora; os detalhes das conquistas são buscados aos poucos, em
                sincronizações sucessivas.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-2">
                O login é feito com a sua conta Microsoft no <strong>OpenXBL</strong>, serviço que dá acesso aos dados do Xbox Live
                (o mesmo tipo de integração usado por sites como TrueAchievements):
              </p>
              <ol className="space-y-2">
                <Step n={1}>
                  Acesse <a href="https://xbl.io/" target="_blank" rel="noreferrer" className="text-accent">xbl.io</a> e clique em
                  “Login with Xbox Live”.
                </Step>
                <Step n={2}>No painel (Profile), crie uma <strong>API Key</strong> pessoal.</Step>
                <Step n={3}>Cole a chave abaixo.</Step>
              </ol>
              <form action={connectXboxAction} className="flex gap-2">
                <input name="api_key" placeholder="Chave de API da OpenXBL" className="input font-mono" autoComplete="off" required />
                <button className="btn-primary shrink-0" type="submit">Conectar</button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* IGDB */}
      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-semibold">Informações dos jogos (IGDB)</h2>
        <p className="text-sm text-ink-2">
          Capas, sinopse, gêneros, desenvolvedora, notas, imagens e <strong>tempo médio para zerar</strong> vêm do IGDB (base da
          Twitch, gratuita).
        </p>
        {igdb ? (
          <>
            <p className="text-sm text-emerald-300">
              ✓ IGDB configurado{igdbFromEnv ? " (pelas variáveis de ambiente)" : ""}.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={enrichAction}>
                <button className="btn-primary" type="submit">Buscar metadados dos jogos sem informação</button>
              </form>
              <form action={enrichAction}>
                <input type="hidden" name="force" value="1" />
                <button className="btn-ghost" type="submit">Atualizar todos</button>
              </form>
            </div>
          </>
        ) : null}
        {!igdbFromEnv ? (
          <details open={!igdb}>
            <summary className="cursor-pointer text-sm text-accent">{igdb ? "Trocar credenciais" : "Como configurar"}</summary>
            <ol className="my-3 space-y-2">
              <Step n={1}>
                Entre em <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noreferrer" className="text-accent">dev.twitch.tv/console/apps</a>{" "}
                com uma conta Twitch (é preciso ter a verificação em duas etapas ativada).
              </Step>
              <Step n={2}>
                “Register Your Application”: qualquer nome, OAuth Redirect URL <code className="rounded bg-panel-2 px-1">http://localhost</code>,
                categoria “Website Integration”, tipo de cliente “Confidencial”.
              </Step>
              <Step n={3}>Copie o Client ID, gere um Client Secret e cole abaixo.</Step>
            </ol>
            <form action={saveIgdb} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
              <input name="client_id" placeholder="Client ID" className="input font-mono" autoComplete="off" required />
              <input name="client_secret" placeholder="Client Secret" type="password" className="input font-mono" autoComplete="off" required />
              <button className="btn-primary" type="submit">Salvar</button>
            </form>
          </details>
        ) : null}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="text-lg font-semibold">Backup</h2>
        <p className="text-sm text-ink-2">Exporta toda a coleção, troféus e conquistas em JSON (sem tokens ou senhas).</p>
        <a href="/api/export" className="btn-ghost">Baixar backup (JSON)</a>
      </section>
    </div>
  );
}
