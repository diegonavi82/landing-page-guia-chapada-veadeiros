#!/usr/bin/env node
/**
 * Sobe a capa SEO do Canjica + atualiza o banco no document root Hostinger.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const IMG = 'cachoeira-borda-infinita-canjica-aguas-lindas-guia-chapada-veadeiros-cavalcante';

const FILES = [
  `assets/img/imagens/${IMG}.jpg`,
  `assets/img/imagens/${IMG}.webp`,
  'api/data/attractions-catalog-extra.json',
  'api/excursions/carousel.php',
  'api/_migrate_canjica_cover_once.php',
];

const LEGACY_COPIES = [
  [`assets/img/imagens/${IMG}.jpg`, `imagens/${IMG}.jpg`],
  [`assets/img/imagens/${IMG}.webp`, `imagens/${IMG}.webp`],
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

async function uploadRel(client, rel, destRel = rel) {
  const localPath = join(ROOT, rel);
  if (!existsSync(localPath)) {
    console.warn('[canjica] skip missing', rel);
    return;
  }
  const parts = destRel.replace(/\\/g, '/').split('/');
  const dir = parts.slice(0, -1).join('/');
  const base = parts[parts.length - 1];
  await cdWebRoot(client);
  if (dir) await client.ensureDir(dir);
  await client.uploadFrom(localPath, base);
  console.log('[canjica] ↑', destRel);
}

async function main() {
  const env = loadDeployEnv();
  const client = await ftpAccess(env);
  try {
    console.log('[canjica] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      await uploadRel(client, rel);
    }
    for (const [src, dest] of LEGACY_COPIES) {
      await uploadRel(client, src, dest);
    }
  } finally {
    client.close();
  }

  const migrateUrl =
    'https://www.guiachapadaveadeiros.com/api/_migrate_canjica_cover_once.php?key=GCV-MKT-2026';
  console.log('[canjica] HTTP', migrateUrl);
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
      await del.remove('_migrate_canjica_cover_once.php');
      console.log('[canjica] apagado one-shot no servidor');
    } catch (e) {
      console.warn('[canjica] não apagou one-shot:', e.message || e);
    }
  } finally {
    del.close();
  }

  console.log('[canjica] concluído');
}

main().catch((e) => {
  console.error('[canjica] ERRO:', e.message || e);
  process.exit(1);
});
