#!/usr/bin/env bash
# Envia Build_prod/ para a Hostinger. Reconecta quando o FTPS derruba o soquete de dados.
set -euo pipefail

if [ -z "${FTP_SERVER:-}" ] || [ -z "${FTP_USERNAME:-}" ] || [ -z "${FTP_PASSWORD:-}" ]; then
  echo "Faltam FTP_SERVER, FTP_USERNAME ou FTP_PASSWORD."
  exit 1
fi

umask 077
node --input-type=module -e 'import { chmodSync, writeFileSync } from "node:fs"; import { homedir } from "node:os"; import { join } from "node:path"; const path = join(homedir(), ".netrc"); writeFileSync(path, "machine " + process.env.FTP_SERVER + "\nlogin " + process.env.FTP_USERNAME + "\npassword " + process.env.FTP_PASSWORD + "\n"); chmodSync(path, 0o600);'
trap 'rm -f "$HOME/.netrc"' EXIT

host="$FTP_SERVER"
remote="domains/guiachapadaveadeiros.com/public_html"
attempt=1
while [ "$attempt" -le 4 ]; do
  echo "FTP tentativa ${attempt} de 4"
  if lftp <<EOF
set cmd:fail-exit true
set net:timeout 40
set net:max-retries 12
set net:persist-retries 12
set net:reconnect-interval-base 4
set net:reconnect-interval-multiplier 1
set ftp:passive-mode true
set ftp:prefer-epsv false
set ftp:ssl-allow true
set ftp:ssl-force true
set ftp:ssl-protect-data true
set ssl:verify-certificate false
set xfer:clobber on
set xfer:use-temp-file no
open ftp://${host}
mirror --reverse --continue --only-newer --parallel=1 --verbose --no-perms -x '(^|/)\\.env(\$|\\.)' -x '(^|/)config\\.local\\.php\$' -x '(^|/)error_log\$' -x '(^|/)assets/img/uploads/' Build_prod ${remote}
bye
EOF
  then
    echo "FTP concluído"
    exit 0
  fi
  echo "FTP caiu. Nova tentativa em 25s."
  attempt=$((attempt + 1))
  sleep 25
done

echo "FTP não completou depois de 4 tentativas."
exit 1
