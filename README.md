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

## Tecnologia

- **Next.js 16** (App Router, Server Components, Server Actions) + **TypeScript**
- **Tailwind CSS 4**
- **SQLite** (`better-sqlite3`): um arquivo em `data/colecao.db`, sem servidor de banco para instalar

## Como rodar

Pré-requisito: Node.js 20 ou superior.

```bash
npm install
npm run dev
# abra http://localhost:3000
```

Para usar em produção, rode `npm run build` e depois `npm start`.

## Conectando as contas (página **Contas e sincronização**)

1. **IGDB** (metadados e tempo para zerar): crie um app em <https://dev.twitch.tv/console/apps> e cole o
   Client ID e o Client Secret. Depois clique em **Buscar metadados**.
2. **PSN**: a Sony não oferece login oficial para sites de terceiros. Os sites do gênero usam o código **NPSSO**:
   entre em playstation.com, abra <https://ca.account.sony.com/api/v1/ssocookie> e cole o valor de `npsso`.
   O código é trocado por tokens na hora e não fica salvo. A sessão dura cerca de 2 meses; depois disso, é
   só conectar de novo.
3. **Xbox**: entre com a sua conta Microsoft em <https://xbl.io>, gere uma API Key e cole a chave. O plano
   gratuito permite cerca de 150 consultas por hora, então as conquistas detalhadas são buscadas aos poucos.
4. Clique em **Sincronizar**. Os títulos são vinculados aos jogos da estante pelo nome. Se algum ficar
   duplicado (por exemplo, o disco "Ghost of Tsushima" e a versão digital vinda da PSN), abra o jogo e use
   **Unir com outro registro**.

## Segurança e privacidade

- Tokens e chaves ficam apenas no banco local (`data/`, que está no `.gitignore`). **Nunca faça commit dessa pasta.**
- Se for publicar o site na internet, defina `APP_PASSWORD` (veja `.env.example`). Hospede o site num servidor com
  disco persistente (VPS, Railway, Fly.io). A Vercel não serve, porque o SQLite precisa de disco gravável.
- A integração com a PSN usa endpoints não oficiais, como todos os sites desse tipo, e pode parar de funcionar se a
  Sony mudar alguma coisa.

## Estrutura

```
src/app/            páginas (painel, coleção, jogo, conquistas, desejos, adicionar, contas) e server actions
src/components/     componentes visuais
src/lib/db.ts       esquema SQLite e carga inicial
src/lib/seed.ts     jogos físicos identificados nas fotos
src/lib/psn.ts      sincronização PSN (troféus + tempo de jogo)
src/lib/xbox.ts     sincronização Xbox (OpenXBL)
src/lib/igdb.ts     metadados e tempo para zerar
```
