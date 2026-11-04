/**
 * Monta o roteiro do lftp fora do log. A senha fica só nesse arquivo temporário.
 */
import { chmodSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const host = String(process.env.FTP_SERVER || "").trim();
const user = String(process.env.FTP_USERNAME || "");
const pass = String(process.env.FTP_PASSWORD || "");
if (!host || !user || !pass) {
  console.error("Faltam FTP_SERVER, FTP_USERNAME ou FTP_PASSWORD.");
  process.exit(1);
}

function quote(value) {
  return '"' + String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}

const lines = [
  "set cmd:fail-exit true",
  "set net:timeout 40",
  "set net:max-retries 6",
  "set net:persist-retries 6",
  "set net:reconnect-interval-base 4",
  "set net:reconnect-interval-multiplier 1",
  "set ftp:passive-mode true",
  "set ftp:prefer-epsv false",
  "set ftp:ssl-allow true",
  "set ftp:ssl-force true",
  "set ftp:ssl-protect-data true",
  "set ssl:verify-certificate false",
  "set xfer:clobber on",
  "set xfer:use-temp-file no",
  "open ftp://" + host,
  "user " + quote(user) + " " + quote(pass),
  "mirror --reverse --continue --only-newer --parallel=1 --verbose --no-perms -x '(^|/)\\.env($|\\.)' -x '(^|/)config\\.local\\.php$' -x '(^|/)error_log$' -x '(^|/)assets/img/uploads/' Build_prod domains/guiachapadaveadeiros.com/public_html",
  "bye",
  "",
];

const path = join(tmpdir(), "gcv-deploy.lftp");
writeFileSync(path, lines.join("\n"), { mode: 0o600 });
chmodSync(path, 0o600);
process.stdout.write(path);
