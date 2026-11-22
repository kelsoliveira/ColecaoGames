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

## 3b. Chave da Anthropic para os guias de platina (5 min, opcional)

É o que gera os guias de platina (PlayStation) e de 100% (Xbox) com IA.

1. Acesse **platform.claude.com** e crie a conta (ou entre, se já tiver).
2. Na área de cobrança (**Billing**), cadastre um meio de pagamento ou compre créditos. A cobrança é por uso.
3. Em **Spend limits** (`platform.claude.com/settings/spend-limits`), defina um **limite de gasto mensal**
   (por exemplo, US$ 10) para não ter surpresas.
4. Abra a página **API keys** (`platform.claude.com/settings/keys`) e toque em **Create key**:
   - **Nome:** por exemplo `colecao-games`
   - **Expiração:** a que preferir (com prazo é mais seguro; anote a data para renovar)
   - **Linked account:** você mesmo
5. Copie a chave (começa com `sk-ant-`). **Ela aparece uma única vez**: guarde no gerenciador de senhas.
6. Na Vercel, cadastre a chave como `ANTHROPIC_API_KEY` e faça um **Redeploy**.

Cada guia faz uma pesquisa na web e depois monta o texto. O custo estimado é de **US$ 0,30 a US$ 1 por guia**,
conforme o tamanho da lista de troféus. O guia fica salvo e só é cobrado de novo se você tocar em "Gerar guia
novamente".

Opcional: para mostrar um vídeo de guia dentro da página, crie uma chave da **YouTube Data API v3** no Google
Cloud Console. Sem ela, a página mostra um botão que abre a busca no YouTube.

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
   | `ANTHROPIC_API_KEY` | opcional: chave do passo 3b (guias com IA) |
   | `YOUTUBE_API_KEY` | opcional: chave da YouTube Data API (vídeo dentro do guia) |

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
2. No menu, abra **Guias de platina**, escolha o jogo e toque em **Gerar guia com IA**. Leva de 1 a 3 minutos.
3. Os troféus perdíveis aparecem destacados. Se algum estiver errado, use **Marcar/Desmarcar perdível**.
4. Use **PT-BR / EN** no topo do guia para trocar o idioma.

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
