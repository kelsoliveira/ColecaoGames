# Passo a passo do deploy (Vercel + Turso)

Você precisa de quatro contas: **GitHub** (já tem), **Turso**, **Vercel** e **Twitch** (para o IGDB,
opcional mas recomendada). Dá para fazer tudo pelo navegador do celular. Os nomes dos botões podem
variar um pouco conforme cada site.

## 1. Deixar o repositório privado (2 min)

1. No GitHub, abra o repositório **ColecaoGames**.
2. Vá em **Settings**, role até **Danger Zone**, toque em **Change visibility** e escolha **Private**.

## 2. Criar o banco no Turso (5 min)

1. Acesse **turso.tech** e crie a conta (pode entrar com o GitHub).
2. Crie um banco, por exemplo `colecao-games`, na região mais próxima do Brasil que aparecer.
3. Na página do banco, copie a **URL**, que começa com `libsql://`.
4. Gere um **token** do banco (opção "Create Token" ou parecida) e copie.

Guarde a URL e o token num gerenciador de senhas ou num bloco de notas temporário.

## 3. Criar as credenciais do IGDB (5 min, opcional)

É isso que traz capas, gêneros, notas e o tempo para zerar.

1. Acesse **dev.twitch.tv/console/apps** e entre com uma conta Twitch. A Twitch exige que a conta tenha
   verificação em duas etapas ativada.
2. Toque em **Register Your Application** e preencha:
   - **Nome:** qualquer um, por exemplo `colecao-games-seunome`
   - **OAuth Redirect URLs:** `http://localhost`
   - **Category:** Website Integration
   - **Client Type:** Confidential
3. Abra o app criado, copie o **Client ID** e toque em **New Secret** para gerar e copiar o
   **Client Secret**.

## 4. Publicar na Vercel (5 min)

1. Acesse **vercel.com** e entre com o **GitHub**.
2. Toque em **Add New**, depois em **Project**. Autorize o acesso ao repositório **ColecaoGames** se for
   pedido e toque em **Import**.
3. A Vercel detecta Next.js sozinha; não mude nada em Build.
4. Abra **Environment Variables** e cadastre uma por uma:

   | Nome | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | URL do passo 2 (`libsql://...`) |
   | `TURSO_AUTH_TOKEN` | token do passo 2 |
   | `APP_PASSWORD` | uma senha forte, criada por você |
   | `IGDB_CLIENT_ID` | Client ID do passo 3 |
   | `IGDB_CLIENT_SECRET` | Client Secret do passo 3 |
   | `SESSION_SECRET` | opcional: um texto aleatório longo (o gerador de senhas ajuda) |
   | `GITHUB_DISPATCH_TOKEN` | opcional, para o botão de guias: veja a seção 8 |
   | `GITHUB_REPO` | opcional, para o botão de guias: `seu-usuario/ColecaoGames` |
   | `GITHUB_BRANCH` | opcional: branch que a Vercel publica (padrão: o próprio branch do deploy) |

5. Toque em **Deploy** e espere 1 a 2 minutos.
6. Copie o endereço gerado (`https://algumacoisa.vercel.app`).

## 5. Primeiro acesso

1. Abra o endereço e entre com a `APP_PASSWORD`. No primeiro acesso, o site cria as tabelas e cadastra
   os jogos da estante.
2. Vá em **Contas e sincronização**, seção IGDB, e toque em **Buscar metadados**. Se aparecer
   "Faltam X", toque de novo.
3. **PSN:**
   1. No navegador do celular, entre em playstation.com.
   2. Abra `ca.account.sony.com/api/v1/ssocookie` e copie a página inteira ou só o valor de `npsso`.
   3. Cole em **Sincronizar** no site.
4. **Xbox:**
   1. Entre em **xbl.io** com a conta Microsoft e gere uma **API Key**.
   2. Cole em **Sincronizar** no site.
5. Se a mensagem disser que ainda falta algo, sincronize de novo; o site continua de onde parou.

## 5b. Guias de platina

1. Sincronize a PSN ou o Xbox primeiro, para o guia usar a lista oficial de troféus e mostrar o que você já tem.
2. No menu, abra **Guias de platina** e escolha o jogo.
3. Toque em **Gerar guia com Claude Code** (depois de fazer a configuração da seção 8). A página mostra o andamento
   ("na fila", "pesquisando", "publicando") e o guia aparece em cerca de 5 a 10 minutos.
4. Os troféus perdíveis aparecem destacados. Se algum estiver errado, use **Marcar/Desmarcar perdível**.
5. Use **PT-BR / EN** no topo do guia para trocar o idioma.

## 6. Instalar na tela inicial

- **iPhone:** no Safari, toque no botão Compartilhar e escolha **Adicionar à Tela de Início**.
- **Android:** no Chrome, toque no menu ⋮ e escolha **Adicionar à tela inicial** (ou **Instalar app**).

## 7. Segurança (recomendado)

- Ative a verificação em duas etapas no **GitHub**, na **Vercel** e no **Turso**.
- Guarde o NPSSO e a chave do Xbox num gerenciador de senhas. Não compartilhe esses dados com ninguém.

## Se algo der errado

- **Mudou uma variável de ambiente:** ela só vale depois de um novo deploy. Vá em **Deployments**, toque
  no menu ⋯ do último deploy e escolha **Redeploy**.
- **"Defina a variável APP_PASSWORD":** falta cadastrar essa variável; cadastre e faça o redeploy.
- **Erro ao abrir o site logo após o deploy:** confira se a URL e o token do Turso foram colados
  completos, sem espaços.
- **Atualizações do código:** cada novo commit no branch do projeto gera um deploy automático na Vercel.
  Jogos novos adicionados ao catálogo inicial entram no banco no primeiro acesso depois do deploy, sem
  apagar nada do que já existe.

## 8. Guias com Claude Code (botão no site, sem API)

O botão do site aciona uma tarefa automática no GitHub (Actions) que roda o **Claude Code** com a **sua assinatura
do Claude**. Ele pesquisa, escreve o guia em `guides/<jogo>.json`, faz o commit e a Vercel publica sozinha.
**Não usa a API nem gera cobrança por uso**; o consumo entra no limite do plano de quem gerou o token.

> Usando o plano Team da empresa, confirme antes com o administrador e com a política interna se o uso em
> projeto pessoal é permitido. O token fica ligado à assinatura de quem o gerou.

### 8.1 Gerar o token do Claude Code (precisa de um computador, uma vez)

1. Instale o Claude Code no computador (instruções em **code.claude.com**).
2. No terminal, rode: `claude setup-token`
3. Entre com a sua conta do Claude no navegador que abrir e autorize.
4. Copie o token exibido no terminal. Guarde no gerenciador de senhas e não compartilhe.

### 8.2 Cadastrar o token no GitHub

1. No GitHub, abra o repositório **ColecaoGames** e vá em **Settings → Secrets and variables → Actions**.
2. Toque em **New repository secret**.
3. Name: `CLAUDE_CODE_OAUTH_TOKEN`. Secret: o token do passo 8.1. Salve.
4. Em **Settings → Actions → General**, confira se as Actions estão permitidas e, em **Workflow permissions**,
   marque **Read and write permissions**.

### 8.3 Criar o token que permite ao site acionar o GitHub

1. No GitHub, vá na sua foto → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. **Generate new token**:
   - **Token name:** `colecao-games-guias`
   - **Expiration:** escolha um prazo (por exemplo, 1 ano)
   - **Repository access:** *Only select repositories* → **ColecaoGames**
   - **Permissions → Repository permissions → Actions:** *Read and write* (as outras ficam como estão)
3. Gere e copie o token (começa com `github_pat_`).

### 8.4 Cadastrar na Vercel

1. Na Vercel, abra o projeto e vá em **Settings → Environment Variables**.
2. Crie:
   - `GITHUB_DISPATCH_TOKEN` = token do passo 8.3
   - `GITHUB_REPO` = `seu-usuario/ColecaoGames`
3. Faça um **Redeploy**.

### 8.5 Testar

1. No site, abra **Guias de platina**, escolha um jogo e toque em **Gerar guia com Claude Code**.
2. Acompanhe pelo aviso na página ou pelo link **Acompanhar no GitHub**.
3. Quando terminar, a Vercel publica e o guia aparece. Se falhar, abra o link do GitHub e me mande o print do erro.

Também dá para pedir guias diretamente numa sessão do Claude Code: eles são salvos na mesma pasta `guides/` e
aparecem no site após o deploy.
