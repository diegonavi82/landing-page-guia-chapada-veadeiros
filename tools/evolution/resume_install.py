"""Retoma compose + instância se o Docker já estiver na VPS."""
from __future__ import annotations

import json
import os
import sys
import time
from pathlib import Path

import paramiko

HOST = os.environ.get("GCV_VPS_HOST", "2.25.119.243")
USER = os.environ.get("GCV_VPS_USER", "root")
PASS = os.environ.get("GCV_VPS_PASS", "")
HERE = Path(__file__).resolve().parent
REMOTE_DIR = "/opt/evolution"
INSTANCE = "gcv"


def run(ssh, cmd, timeout=600):
    print("\n>>>", cmd[:180].encode("ascii", "replace").decode("ascii"))
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    status = stdout.channel.recv_exit_status()
    text = (out + err).strip()
    if text:
        print(text[-5000:].encode("ascii", "replace").decode("ascii"))
    print("[exit", status, "]")
    return status, text


def main():
    if not PASS:
        print("Defina GCV_VPS_PASS", file=sys.stderr)
        sys.exit(1)

    secrets_path = HERE / "vps-secrets.txt"
    env_local = HERE / ".env"
    if not secrets_path.exists() or not env_local.exists():
        print("Faltam vps-secrets.txt / .env da primeira tentativa", file=sys.stderr)
        sys.exit(1)

    api_key = ""
    for line in secrets_path.read_text(encoding="utf-8").splitlines():
        if line.startswith("EVOLUTION_API_KEY="):
            api_key = line.split("=", 1)[1].strip()
    if not api_key:
        print("Sem API key", file=sys.stderr)
        sys.exit(1)

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASS, timeout=30, banner_timeout=60)
    print("SSH OK")

    sftp = ssh.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/.env", "w") as f:
        f.write(env_local.read_text(encoding="utf-8"))
    with sftp.file(f"{REMOTE_DIR}/docker-compose.yml", "w") as f:
        f.write((HERE / "docker-compose.yml").read_text(encoding="utf-8"))
    sftp.close()

    code, _ = run(ssh, f"cd {REMOTE_DIR} && docker compose pull && docker compose up -d", 480)
    if code != 0:
        run(ssh, f"cd {REMOTE_DIR} && docker compose ps -a && docker compose logs --tail=50", 60)
        sys.exit(1)

    run(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'", 30)

    print("Aguardando API...")
    ready = False
    last = ""
    for i in range(72):
        code, last = run(ssh, "curl -sS -m 5 -o /tmp/evo.out -w '%{http_code}' http://127.0.0.1:8080 || echo fail", 20)
        if "000" not in last and "fail" not in last.lower():
            ready = True
            break
        time.sleep(5)
        print("tentativa", i + 1)
    if not ready:
        run(ssh, f"cd {REMOTE_DIR} && docker compose logs --tail=100 api", 30)
        sys.exit(1)

    create_payload = json.dumps(
        {"instanceName": INSTANCE, "qrcode": True, "integration": "WHATSAPP-BAILEYS"}
    )
    _, create_out = run(
        ssh,
        "curl -sS -X POST http://127.0.0.1:8080/instance/create "
        f"-H 'apikey: {api_key}' -H 'Content-Type: application/json' "
        f"-d '{create_payload}'",
        60,
    )
    (HERE / "create-instance.json").write_text(create_out, encoding="utf-8")
    time.sleep(2)
    _, qr_out = run(
        ssh,
        f"curl -sS http://127.0.0.1:8080/instance/connect/{INSTANCE} -H 'apikey: {api_key}'",
        60,
    )
    (HERE / "connect-instance.json").write_text(qr_out, encoding="utf-8")

    b64 = ""
    for raw in (qr_out, create_out):
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        node = data.get("qrcode") if isinstance(data.get("qrcode"), dict) else data
        if not isinstance(node, dict):
            continue
        b64 = str(node.get("base64") or "")
        if b64:
            break
    if b64.startswith("data:image"):
        b64 = b64.split(",", 1)[-1]
    if b64:
        import base64

        png = HERE / "qr-gcv.png"
        png.write_bytes(base64.b64decode(b64))
        print("QR salvo em", png)
    else:
        print("QR nao veio ainda. JSON em create-instance.json / connect-instance.json")

    print("API:", f"http://{HOST}:8080")
    print("Instancia:", INSTANCE)
    ssh.close()


if __name__ == "__main__":
    main()
