# Guias de platina e 100%

Cada arquivo `<slug>.json` é um guia lido pelo site (seção **Guias de platina**). O formato está em
`src/lib/guide-schema.ts` (`GuideFileSchema`).

- **slug** = `<plataforma>--<título>`, em minúsculas, sem acentos, com hífens no lugar dos outros caracteres.
  Exemplos: `ps5--elden-ring`, `xbox-series--tales-of-arise`. A função é `guideSlug()`, em `src/lib/guide.ts`.
- Os guias são escritos pelo Claude Code, de duas formas:
  - pelo botão "Gerar guia com Claude Code" do site, que roda `.github/workflows/guia.yml`;
  - numa sessão do Claude Code, pedindo o guia de um jogo.
- Para validar um arquivo: `npx tsx scripts/validate-guide.ts guides/<slug>.json`

Os textos são escritos com palavras próprias, a partir de várias fontes. Não copie trechos de outros guias.
