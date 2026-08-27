"""Instala Evolution API numa VPS Ubuntu via SSH (senha em GCV_VPS_PASS)."""
from __future__ import annotations

import json
import os
import secrets
import sys
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("GCV_VPS_HOST", "2.25.120.51")
USER = os.environ.get("GCV_VPS_USER", "root")
PASS = os.environ.get("GCV_VPS_PASS", "")
HERE = Path(__file__).resolve().parent
COMPOSE_LOCAL = HERE / "docker-compose.yml"

REMOTE_DIR = "/opt/evolution"
INSTANCE = "gcv"


def die(msg: str, code: int = 1) -> None:
    print(msg, file=sys.stderr)
    sys.exit(code)


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600) -> tuple[int, str]:
    print(f"\n>>> {cmd[:200]}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    status = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        safe = text[-4000:].encode("ascii", "replace").decode("ascii")
        print(safe)
    if status != 0:
        print(f"[exit {status}]", file=sys.stderr)
    return status, text


def sftp_write(ssh: paramiko.SSHClient, remote: str, content: str) -> None:
    sftp = ssh.open_sftp()
    with sftp.file(remote, "w") as f:
        f.write(content)
    sftp.close()


def main() -> None:
    if not PASS:
        die("Defina GCV_VPS_PASS")
    if not COMPOSE_LOCAL.exists():
        die(f"Falta {COMPOSE_LOCAL}")

    api_key = secrets.token_hex(32)
    db_pass = secrets.token_hex(16)

    env_body = f"""SERVER_URL=http://{HOST}:8080
SERVER_PORT=8080
AUTHENTICATION_API_KEY={api_key}
AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES=true

DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:{db_pass}@127.0.0.1:5432/evolution_db?schema=evolution_api

POSTGRES_DATABASE=evolution_db
POSTGRES_USERNAME=evolution
POSTGRES_PASSWORD={db_pass}

CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://127.0.0.1:6379/6
CACHE_REDIS_PREFIX_KEY=evolution

WEBHOOK_GLOBAL_ENABLED=false
RABBITMQ_ENABLED=false
SQS_ENABLED=false

CONFIG_SESSION_PHONE_CLIENT=Chrome
CONFIG_SESSION_PHONE_NAME=Chrome
CONFIG_SESSION_PHONE_VERSION=2.3000.1029560485
QRCODE_LIMIT=30
LANGUAGE=pt-BR
TZ=America/Sao_Paulo
"""

    secrets_path = HERE / "vps-secrets.txt"
    secrets_path.write_text(
        f"EVOLUTION_API_URL=http://{HOST}:8080\n"
        f"EVOLUTION_API_KEY={api_key}\n"
        f"EVOLUTION_INSTANCE={INSTANCE}\n"
        f"PURCHASE_NOTIFY_WHATSAPP=5562982506891\n",
        encoding="utf-8",
    )
    (HERE / ".env").write_text(env_body, encoding="utf-8")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Conectando {USER}@{HOST} ...")
    ssh.connect(HOST, username=USER, password=PASS, timeout=30, banner_timeout=60)
    print("SSH OK")

    run(ssh, "export DEBIAN_FRONTEND=noninteractive; apt-get update -y", 300)
    run(
        ssh,
        "export DEBIAN_FRONTEND=noninteractive; apt-get install -y ca-certificates curl ufw",
        300,
    )
    code, _ = run(ssh, "command -v docker && docker --version", 30)
    if code != 0:
        code, _ = run(ssh, "curl -fsSL https://get.docker.com | sh", 420)
        if code != 0:
            die("Falha ao instalar Docker")
    run(ssh, "systemctl enable --now docker", 60)

    run(ssh, f"mkdir -p {REMOTE_DIR}")
    compose = COMPOSE_LOCAL.read_text(encoding="utf-8")
    sftp_write(ssh, f"{REMOTE_DIR}/docker-compose.yml", compose)
    sftp_write(ssh, f"{REMOTE_DIR}/.env", env_body)

    # Hostinger painel com 0 regras = portas abertas; ufw só se já estiver ativo.
    run(
        ssh,
        "if ufw status | grep -qi active; then ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 8080/tcp; else echo 'ufw inativo — ok'; fi",
        30,
    )

    code, _ = run(ssh, f"cd {REMOTE_DIR} && docker compose pull && docker compose up -d", 480)
    if code != 0:
        die("Falha ao subir docker compose")

    print("Aguardando API na porta 8080...")
    ready = False
    for i in range(60):
        code, body = run(
            ssh,
            "curl -sS -m 5 -o /dev/null -w '%{http_code}' http://127.0.0.1:8080 || echo fail",
            20,
        )
        if "200" in body:
            ready = True
            break
        time.sleep(5)
        print(f"  tentativa {i + 1}/60")
    if not ready:
        run(ssh, f"cd {REMOTE_DIR} && docker compose logs --tail=80 api", 30)
        die("API não respondeu em 5 min")

    create_payload = json.dumps(
        {
            "instanceName": INSTANCE,
            "qrcode": False,
            "number": "5562982506891",
            "integration": "WHATSAPP-BAILEYS",
        }
    )
    create_cmd = (
        "curl -sS -X POST http://127.0.0.1:8080/instance/create "
        f"-H 'apikey: {api_key}' -H 'Content-Type: application/json' "
        f"-d '{create_payload}'"
    )
    code, create_out = run(ssh, create_cmd, 60)
    (HERE / "create-instance.json").write_text(create_out, encoding="utf-8")

    print("\n=== Evolution no ar ===")
    print(f"Painel/API: http://{HOST}:8080")
    print(f"Instância: {INSTANCE} (ainda sem WhatsApp — conectamos depois)")
    print(f"Chave gravada em {secrets_path}")
    ssh.close()


if __name__ == "__main__":
    main()
