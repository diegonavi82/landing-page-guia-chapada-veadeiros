#!/usr/bin/env node
/**
 * Sobe os arquivos de check-in / notificações no document root Hostinger.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];

const FILES = [
  'api/helpers/notify_ops.php',
  'api/guides/check-in.php',
  'api/excursao-reserva/cancel.php',
  'api/excursao-reserva/lookup.php',
  'api/helpers/marketplace/publish_service.php',
  'api/helpers/marketplace/sale_service.php',
  'api/helpers/marketplace/payout_service.php',
  'api/helpers/marketplace_schema.php',
  'api/helpers/purchase_notify.php',
  'api/helpers/pix_seats_store.php',
  'api/helpers/pix_reservation_store.php',
  'api/guides/excursions.php',
  'api/admin/excursions.php',
  'api/cron/auto-payouts.php',
  'api/database/migration_notify_extra.sql',
  'api/_migrate_notify_extra_once.php',
  'dashboard/index.html',
  'assets/css/gcv-dashboard.css',
  'assets/js/gcv-dash-roles.js',
  'assets/js/gcv-consultar-reserva.js',
  'consultar-reserva.html',
  'en/consultar-reserva.html',
  'es/consultar-reserva.html',
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
    console.log('[ops-upload] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const localPath = join(ROOT, rel);
      if (!existsSync(localPath)) {
        console.warn('[ops-upload] skip missing', rel);
        continue;
      }
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[ops-upload] ↑', rel);
    }
  } finally {
    client.close();
  }

  const migrateUrl =
    'https://www.guiachapadaveadeiros.com/api/_migrate_notify_extra_once.php?key=GCV-MKT-2026';
  console.log('[ops-upload] HTTP', migrateUrl);
  const res = await fetch(migrateUrl);
  const text = await res.text();
  console.log(text);
  if (!res.ok || !/FIM/i.test(text)) {
    process.exit(1);
  }

  const del = new Client(120_000);
  try {
    await del.access({
      host: (env.FTP_SERVER || '').trim(),
      user: (env.FTP_USERNAME || '').trim(),
      password: (env.FTP_PASSWORD || '').trim(),
      port: Number(env.FTP_PORT || 21),
      secure: String(env.FTP_SECURE || 'true').toLowerCase() !== 'false',
      secureOptions: { rejectUnauthorized: false },
    });
    await cdWebRoot(del);
    await del.cd('api');
    try {
      await del.remove('_migrate_notify_extra_once.php');
      console.log('[ops-upload] apagado one-shot no servidor');
    } catch (e) {
      console.warn('[ops-upload] não apagou one-shot:', e.message || e);
    }
  } finally {
    del.close();
  }

  console.log('[ops-upload] concluído');
}

main().catch((e) => {
  console.error('[ops-upload] ERRO:', e.message || e);
  process.exit(1);
});
