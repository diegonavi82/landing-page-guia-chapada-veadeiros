"""Instala Caddy + HTTPS em wa.guiachapadaveadeiros.com (GCV_VPS_PASS)."""
from __future__ import annotations

import os
import time

import paramiko

HOST = "2.25.120.51"
DOMAIN = "wa.guiachapadaveadeiros.com"


def run(ssh, cmd, timeout=180):
    print(">>>", cmd[:180].encode("ascii", "replace").decode("ascii"))
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout, get_pty=True)
    text = (stdout.read() + stderr.read()).decode("utf-8", "replace")
    print(text[-2500:].encode("ascii", "replace").decode("ascii"))
    return stdout.channel.recv_exit_status(), text


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username="root", password=os.environ["GCV_VPS_PASS"], timeout=30)

    code, _ = run(ssh, "export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y caddy", 300)
    if code != 0:
        run(
            ssh,
            "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg && "
            "curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list && "
            "export DEBIAN_FRONTEND=noninteractive; apt-get update -y && apt-get install -y caddy",
            300,
        )

    caddyfile = f"""{DOMAIN} {{
    reverse_proxy 127.0.0.1:8080
}}
"""
    sftp = ssh.open_sftp()
    with sftp.file("/etc/caddy/Caddyfile", "w") as f:
        f.write(caddyfile)
    sftp.close()

    run(ssh, "systemctl enable --now caddy && systemctl reload caddy || systemctl restart caddy", 60)
    time.sleep(4)
    run(ssh, "systemctl is-active caddy; curl -sS -m 15 -o /dev/null -w '%{http_code}' http://127.0.0.1:80 || true", 20)

    # SERVER_URL no .env da Evolution
    run(
        ssh,
        "sed -i 's|^SERVER_URL=.*|SERVER_URL=https://" + DOMAIN + "|' /opt/evolution/.env && "
        "cd /opt/evolution && docker compose up -d",
        120,
    )
    ssh.close()
    print("Caddy OK")


if __name__ == "__main__":
    main()
