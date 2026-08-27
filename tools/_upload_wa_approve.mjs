#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];

const FILES = [
  'api/helpers/validator.php',
  'api/guides/me-profile.php',
  'api/client/profile.php',
  'api/helpers/marketplace/publish_service.php',
  'api/helpers/marketplace/guide_financial_service.php',
  'api/helpers/notify_ops.php',
  'api/helpers/purchase_notify.php',
  'api/helpers/marketplace/sale_service.php',
  'assets/js/gcv-dashboard.js',
  'assets/js/gcv-admin-cms.js',
  'assets/js/gcv-dash-roles.js',
  'assets/js/gcv-confirm.js',
  'assets/css/gcv-confirm.css',
  'dashboard/index.html',
];

async function cdWebRoot(client) {
  let pwd = await client.pwd();
  while (pwd !== '/' && pwd !== '') {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of WEB_ROOT_PARTS) {
    await client.cd(part);
  }
  return client.pwd();
}

function loadDeployEnv() {
  const out = { ...process.env };
  const envPath = join(ROOT, '.env.deploy');
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

async function main() {
  const env = loadDeployEnv();
  const client = new Client(180_000);
  await client.access({
    host: (env.FTP_SERVER || '').trim(),
    user: (env.FTP_USERNAME || '').trim(),
    password: (env.FTP_PASSWORD || '').trim(),
    port: Number(env.FTP_PORT || 21),
    secure: String(env.FTP_SECURE || 'true').toLowerCase() !== 'false',
    secureOptions: { rejectUnauthorized: false },
  });
  try {
    console.log('[wa-approve] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const localPath = join(ROOT, rel);
      if (!existsSync(localPath)) {
        console.warn('[wa-approve] skip', rel);
        continue;
      }
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[wa-approve] ↑', rel);
    }
  } finally {
    client.close();
  }
  const ping = await fetch('https://www.guiachapadaveadeiros.com/api/excursions/carousel.php?lang=pt');
  console.log('[wa-approve] carousel', ping.status);
  console.log('[wa-approve] concluído');
}

main().catch((e) => {
  console.error('[wa-approve] ERRO:', e.message || e);
  process.exit(1);
});
