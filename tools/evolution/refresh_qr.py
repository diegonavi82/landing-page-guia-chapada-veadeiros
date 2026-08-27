import json
import os
import base64
from pathlib import Path

import paramiko

HOST = "2.25.119.243"
HERE = Path(__file__).resolve().parent
key = ""
for line in (HERE / "vps-secrets.txt").read_text(encoding="utf-8").splitlines():
    if line.startswith("EVOLUTION_API_KEY="):
        key = line.split("=", 1)[1].strip()

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username="root", password=os.environ["GCV_VPS_PASS"], timeout=30)
cmd = f"curl -sS http://127.0.0.1:8080/instance/connect/gcv -H 'apikey: {key}'"
_, stdout, _ = ssh.exec_command(cmd, timeout=30)
raw = stdout.read().decode("utf-8", "replace")
(HERE / "connect-instance.json").write_text(raw, encoding="utf-8")
data = json.loads(raw)
b64 = ""
if isinstance(data.get("qrcode"), dict):
    b64 = str(data["qrcode"].get("base64") or "")
b64 = b64 or str(data.get("base64") or "")
if b64.startswith("data:image"):
    b64 = b64.split(",", 1)[-1]
if b64:
    (HERE / "qr-gcv.png").write_bytes(base64.b64decode(b64))
    print("QR refreshed")
else:
    print("no qr", list(data.keys())[:20])
    print(raw[:400])
ssh.close()
