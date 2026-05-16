/**
 * Build com `GCV_RELATIVE_JS=1`: gera `./`/`../assets/js/…` (bom para abrir HTML pelo disco / file://).
 * Produção / deploy: use `npm run build` (omitindo isto) — URLs absolutas `/assets/js/…?v=…`.
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const toolsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = dirname(toolsDir);

const env = { ...process.env, GCV_RELATIVE_JS: "1" };

const r = spawnSync(process.execPath, [join(toolsDir, "build-site.mjs")], {
  cwd: rootDir,
  stdio: "inherit",
  env,
});
process.exit(typeof r.status === "number" ? r.status : 1);
