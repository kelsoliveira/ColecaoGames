// Valida um arquivo guides/<slug>.json contra o formato usado pelo site.
// Uso: npx tsx scripts/validate-guide.ts guides/ps5--elden-ring.json
import fs from "node:fs";
import path from "node:path";
import { GuideFileSchema } from "../src/lib/guide-schema";

const file = process.argv[2];
if (!file) {
  console.error("Informe o caminho do arquivo do guia.");
  process.exit(2);
}
let data: unknown;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error(`JSON inválido em ${file}: ${(e as Error).message}`);
  process.exit(1);
}
const result = GuideFileSchema.safeParse(data);
if (!result.success) {
  console.error(`Formato inválido em ${file}:`);
  for (const issue of result.error.issues) console.error(`- ${issue.path.join(".") || "(raiz)"}: ${issue.message}`);
  process.exit(1);
}
const expected = path.basename(file, ".json");
if (result.data.slug !== expected) {
  console.error(`O campo slug ("${result.data.slug}") deve ser igual ao nome do arquivo ("${expected}").`);
  process.exit(1);
}
const g = result.data.guide;
console.log(
  `OK: ${result.data.title} (${result.data.platform}) · ${g.trophies.length} troféus · ` +
    `${g.trophies.filter((t) => t.missable).length} perdíveis · ${g.roadmap.length} etapas · ${result.data.sources.length} fontes`,
);
