#!/usr/bin/env node
/**
 * Sobe arquivos de pessoas confirmadas + roda o one-shot no document root Hostinger.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];

const FILES = [
  'api/helpers/excursion_status.php',
  'api/helpers/cms_schema.php',
  'api/helpers/marketplace_schema.php',
  'api/helpers/marketplace/publish_service.php',
  'api/helpers/notify_ops.php',
  'api/guides/excursions.php',
  'api/admin/excursions.php',
  'api/excursions/carousel.php',
  'api/database/migration_preconfirmed_people.sql',
  'api/_migrate_preconfirmed_people_once.php',
  'assets/js/gcv-dash-roles.js',
  'assets/js/gcv-admin-cms.js',
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

async function ftpAccess(env) {
  const client = new Client(180_000);
  await client.access({
    host: (env.FTP_SERVER || '').trim(),
    user: (env.FTP_USERNAME || '').trim(),
    password: (env.FTP_PASSWORD || '').trim(),
    port: Number(env.FTP_PORT || 21),
    secure: String(env.FTP_SECURE || 'true').toLowerCase() !== 'false',
    secureOptions: { rejectUnauthorized: false },
  });
  return client;
}

async function main() {
  const env = loadDeployEnv();
  const client = await ftpAccess(env);
  try {
    console.log('[preconf] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const localPath = join(ROOT, rel);
      if (!existsSync(localPath)) {
        console.warn('[preconf] skip missing', rel);
        continue;
      }
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[preconf] ↑', rel);
    }
  } finally {
    client.close();
  }

  const migrateUrl =
    'https://www.guiachapadaveadeiros.com/api/_migrate_preconfirmed_people_once.php?key=GCV-MKT-2026';
  console.log('[preconf] HTTP', migrateUrl);
  const res = await fetch(migrateUrl);
  const text = await res.text();
  console.log(text);
  if (!res.ok || !/FEITO/i.test(text)) {
    process.exit(1);
  }

  const del = await ftpAccess(env);
  try {
    await cdWebRoot(del);
    await del.cd('api');
    try {
      await del.remove('_migrate_preconfirmed_people_once.php');
      console.log('[preconf] apagado one-shot no servidor');
    } catch (e) {
      console.warn('[preconf] não apagou one-shot:', e.message || e);
    }
  } finally {
    del.close();
  }

  console.log('[preconf] concluído');
}

main().catch((e) => {
  console.error('[preconf] ERRO:', e.message || e);
  process.exit(1);
});
