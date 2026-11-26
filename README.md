# Coleção Games

Site pessoal para catalogar sua coleção de jogos (física e digital) e reunir num lugar só o que hoje fica
espalhado entre PSNProfiles, TrueAchievements, Exophase, HowLongToBeat e PSPrices.

## Funcionalidades

| Recurso | De onde vem |
|---|---|
| **Catálogo da coleção**: plataforma, mídia física/digital, edição, status (backlog, jogando, zerado, platinado, abandonado), nota pessoal, anotações | Cadastro manual; os jogos físicos das fotos já vêm cadastrados |
| **Capa, sinopse, gêneros, desenvolvedora, publicadora, lançamento, notas da crítica, imagens** | IGDB (Twitch) |
| **Tempo para zerar**: história principal, com extras e 100%, mais o backlog estimado em horas | IGDB (Time to Beat) |
| **Troféus PSN**: platinas, contagem por tipo, nível, progresso, raridade (%) e data de cada troféu | PSN (biblioteca `psn-api`) |
| **Horas jogadas** e datas da primeira e da última sessão (PS4/PS5) | PSN |
| **Conquistas Xbox**: Gamerscore, progresso, raridade e data | Xbox Live via OpenXBL |
| **Jogos digitais**: o que aparece na PSN ou no Xbox e não está na estante entra como "Digital" | Sincronização |
| **Preços**: preço pago, valor de mercado, preço-alvo, valor total da coleção e links para PSPrices, PS Store, Microsoft Store, XB Deals, GG.deals e Mercado Livre | Manual + links |
| **Guias**: links diretos para PSNProfiles, TrueAchievements, PlayStationTrophies, XboxAchievements, Exophase e HowLongToBeat | Links |
| **Painel**: estatísticas, mais jogados, perto da platina, troféus recentes e mais raros | — |
| **Lista de desejos** com preço-alvo, **filtros e ordenação**, **unir registros duplicados** e **backup em JSON** | — |
| **Guias de platina (PlayStation) e 100% (Xbox)**: roteiro, perdíveis destacados, dicas por troféu, dificuldade, tempo estimado e restante, o que você já tem e o que falta, em PT-BR com opção de EN | Claude Code (botão no site → GitHub Actions, com a assinatura do Claude; sem API) + lista oficial da PSN/Xbox |
| **Sagas**: agrupamento e filtro por saga/franquia na Coleção, sagas no painel, e os jogos principais que faltam em cada saga (informativo), com botão para a coleção ou a lista de desejos | Catálogo + IGDB (séries/franquias) + edição manual |
| **Meus consoles**: consoles cadastrados com jogos por console (incluindo retrocompatíveis), horas, gastos e dados da compra | Manual + detecção na PSN (consoles ativados) e no Xbox (histórico) |
| **Instalável no celular** (ícone na tela inicial) | — |

## Tecnologia

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS 4**
- **Turso** (SQLite na nuvem, via `@libsql/client`) em produção; arquivo SQLite local em desenvolvimento
- Hospedagem na **Vercel**; o site pode ser instalado na tela inicial do celular

## Segurança: nenhuma credencial é armazenada

- O **código NPSSO da PSN** e a **chave da OpenXBL (Xbox)** são digitados a cada sincronização, usados só
  durante aquela requisição e descartados. Nada disso vai para o banco nem para os logs.
- Os dados sincronizados (troféus, horas, conquistas) continuam salvos.
- As credenciais do IGDB, a senha do site e o token do Turso ficam só nas variáveis de ambiente da Vercel.
- O login usa uma sessão assinada (HMAC) que expira em 30 dias. Depois de 5 tentativas erradas, o acesso
  fica bloqueado por 15 minutos. Trocar `APP_PASSWORD` derruba todas as sessões abertas.
- Publicado na Vercel sem `APP_PASSWORD`, o site fica bloqueado.

## Publicar pelo celular (Vercel + Turso)

> Passo a passo detalhado, com solução de problemas: **[DEPLOY.md](DEPLOY.md)**.

1. **Turso** (<https://turso.tech>): crie uma conta, depois um banco (escolha a região mais próxima). Copie a
   **URL** (`libsql://...`) e gere um **token** do banco.
2. **IGDB** (opcional, recomendado): em <https://dev.twitch.tv/console/apps>, registre um app (Redirect URL
   `http://localhost`, categoria "Website Integration", cliente "Confidencial"). Copie o Client ID e gere um
   Client Secret.
3. **Vercel** (<https://vercel.com>): entre com o GitHub, clique em **Add New → Project**, importe o
   repositório `ColecaoGames` e, antes de clicar em Deploy, abra **Environment Variables** e cadastre:
   - `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`
   - `APP_PASSWORD`, com uma senha forte
   - `IGDB_CLIENT_ID` e `IGDB_CLIENT_SECRET`
4. Clique em **Deploy**. No primeiro acesso, o banco é criado e os jogos da estante são cadastrados.
5. No celular, abra o endereço `.vercel.app`. Para instalar, use "Adicionar à tela inicial" (Safari:
   botão Compartilhar; Chrome: menu ⋮).
6. Ative a **verificação em duas etapas** no GitHub, na Vercel e no Turso, e deixe o repositório **privado**.

## Rodar no computador (opcional)

```bash
npm install
npm run dev        # http://localhost:3000, sem senha e com banco em ./data
```

## Sincronizando

Na página **Contas e sincronização**:

- **PSN**: entre em playstation.com e abra <https://ca.account.sony.com/api/v1/ssocookie>. Copie o valor
  de `npsso` (ou a página inteira), cole e toque em Sincronizar. O código vale por cerca de 2 meses;
  guarde-o num gerenciador de senhas.
- **Xbox**: entre em <https://xbl.io> com a conta Microsoft, gere uma API Key, cole e toque em Sincronizar.
  O plano gratuito permite cerca de 150 consultas por hora, então as conquistas detalhadas chegam aos poucos.
- Cada sincronização roda por até cerca de 4 minutos (limite da Vercel). Se a mensagem disser que faltou
  algo, é só sincronizar de novo: o site continua de onde parou.
- Se um jogo ficar duplicado (o disco da estante e a versão "Digital" vinda da PSN), abra o jogo e use
  **Unir com outro registro**.

A integração com a PSN usa endpoints não oficiais, como todos os sites desse tipo, e pode parar de funcionar
se a Sony mudar alguma coisa.

## Estrutura

```
src/app/            páginas (painel, coleção, jogo, conquistas, desejos, adicionar, contas, login) e server actions
src/components/     componentes visuais
src/lib/db.ts       conexão Turso/SQLite, esquema e carga inicial
src/lib/auth.ts     sessão assinada e verificação de senha
src/lib/seed.ts     jogos físicos identificados nas fotos
src/lib/saga-catalog.ts  jogos principais de cada saga (para mostrar o que falta)
src/lib/psn.ts      sincronização PSN (troféus + tempo de jogo)
src/lib/xbox.ts     sincronização Xbox (OpenXBL)
src/lib/igdb.ts     metadados e tempo para zerar
src/lib/guide.ts    leitura dos guias (guides/*.json) e acionamento do GitHub Actions
guides/             guias de platina/100% escritos pelo Claude Code
.github/workflows/guia.yml  tarefa que roda o Claude Code para escrever um guia
src/proxy.ts        exige login antes de qualquer página
```
