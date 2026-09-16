#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const FILES = [
  'api/_wipe_diego_navi_guide_once.php',
  'api/helpers/diego_navi_stash.php',
  'api/helpers/guides_seed.php',
  'api/auth/register.php',
  'api/auth/google-callback.php',
  'api/guides/me-profile.php',
  'api/admin/seed-multi-roles.php',
  'api/admin/seed-diego-guide.php',
  'api/admin/setup-cms.php',
  'api/data/_tmp_diego_navi/profile.json',
  'api/data/_tmp_diego_navi/photo.webp',
  'api/data/_tmp_diego_navi/photo.png',
];

async function cdWebRoot(client) {
  let pwd = await client.pwd();
  while (pwd !== '/' && pwd !== '') {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of WEB_ROOT_PARTS) await client.cd(part);
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
    console.log('[wipe-diego] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const localPath = join(ROOT, rel);
      if (!existsSync(localPath)) {
        console.warn('[wipe-diego] skip missing', rel);
        continue;
      }
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[wipe-diego] ↑', rel);
    }
  } finally {
    client.close();
  }

  const url = 'https://www.guiachapadaveadeiros.com/api/_wipe_diego_navi_guide_once.php?key=GCV-MKT-2026';
  console.log('[wipe-diego] HTTP', url);
  const res = await fetch(url);
  const text = await res.text();
  console.log(text);
  const outPath = join(ROOT, 'api/data/_tmp_diego_navi/wipe-log.txt');
  writeFileSync(outPath, text, 'utf8');

  const m = text.match(/STASH_JSON_BEGIN\n([\s\S]*?)\nSTASH_JSON_END/);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      writeFileSync(
        join(ROOT, 'api/data/_tmp_diego_navi/profile.json'),
        JSON.stringify(parsed, null, 2),
        'utf8'
      );
      console.log('[wipe-diego] profile.json atualizado com o que estava no banco');
    } catch (e) {
      console.warn('[wipe-diego] não parseou STASH_JSON:', e.message || e);
    }
  }

  if (!res.ok || !/FEITO/i.test(text)) {
    process.exitCode = 1;
    return;
  }

  const del = await ftpAccess(env);
  try {
    await cdWebRoot(del);
    await del.cd('api');
    await del.remove('_wipe_diego_navi_guide_once.php');
    console.log('[wipe-diego] apagado one-shot no servidor');
  } catch (e) {
    console.warn('[wipe-diego] não apagou one-shot:', e.message || e);
  } finally {
    del.close();
  }
}

main().catch((e) => {
  console.error('[wipe-diego] ERRO:', e.message || e);
  process.exit(1);
});
