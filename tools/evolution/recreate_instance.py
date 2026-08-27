"""Atualiza .env/compose na VPS, recria instância gcv e imprime pairing code."""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path

import paramiko

HOST = "2.25.119.243"
API = f"http://{HOST}:8080"
HERE = Path(__file__).resolve().parent
KEY = ""
for line in (HERE / "vps-secrets.txt").read_text(encoding="utf-8").splitlines():
    if line.startswith("EVOLUTION_API_KEY="):
        KEY = line.split("=", 1)[1].strip()


def api(method: str, path: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={"apikey": KEY, "Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            raw = resp.read().decode("utf-8", "replace")
            print(method, path, resp.status)
            print(raw[:600])
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "replace")
        print(method, path, e.code, raw[:600])
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username="root", password=os.environ["GCV_VPS_PASS"], timeout=30)
    sftp = ssh.open_sftp()
    with sftp.file("/opt/evolution/.env", "w") as f:
        f.write((HERE / ".env").read_text(encoding="utf-8"))
    with sftp.file("/opt/evolution/docker-compose.yml", "w") as f:
        f.write((HERE / "docker-compose.yml").read_text(encoding="utf-8"))
    sftp.close()
    _, stdout, stderr = ssh.exec_command(
        "cd /opt/evolution && docker compose up -d", timeout=120, get_pty=True
    )
    text = (stdout.read() + stderr.read()).decode("utf-8", "replace")
    print(text[-800:].encode("ascii", "replace").decode("ascii"))
    ssh.close()
    time.sleep(10)

    api("DELETE", "/instance/logout/gcv")
    api("DELETE", "/instance/delete/gcv?deleteMediaData=true")
    time.sleep(2)
    created = api(
        "POST",
        "/instance/create",
        {
            "instanceName": "gcv",
            "qrcode": True,
            "number": "5562982506891",
            "integration": "WHATSAPP-BAILEYS",
        },
    )
    time.sleep(2)
    connected = api("GET", "/instance/connect/gcv?number=5562982506891")
    code = (
        connected.get("pairingCode")
        or (created.get("qrcode") or {}).get("pairingCode")
        or created.get("pairingCode")
    )
    print("PAIRING_CODE", code)
    if code:
        (HERE / "pairing-code.txt").write_text(str(code), encoding="utf-8")


if __name__ == "__main__":
    main()
