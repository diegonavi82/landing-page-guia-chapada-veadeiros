#!/usr/bin/env bash
# Envia Build_prod/ para a Hostinger. Reconecta quando o FTPS derruba o soquete de dados.
set -euo pipefail

if [ -z "${FTP_SERVER:-}" ] || [ -z "${FTP_USERNAME:-}" ] || [ -z "${FTP_PASSWORD:-}" ]; then
  echo "Faltam FTP_SERVER, FTP_USERNAME ou FTP_PASSWORD."
  exit 1
fi

script="$(node tools/write-lftp-script.mjs)"
trap 'rm -f "$script"' EXIT

attempt=1
while [ "$attempt" -le 4 ]; do
  echo "FTP tentativa ${attempt} de 4"
  if lftp -f "$script"; then
    echo "FTP concluído"
    exit 0
  fi
  echo "FTP caiu. Nova tentativa em 25s."
  attempt=$((attempt + 1))
  sleep 25
done

echo "FTP não completou depois de 4 tentativas."
exit 1
