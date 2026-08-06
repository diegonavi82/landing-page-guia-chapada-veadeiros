#!/usr/bin/env node
/**
 * Sobe SQL/helpers de migration no document root real da Hostinger e executa o one-shot.
 * Document root: /domains/guiachapadaveadeiros.com/public_html
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const MIGRATE_URL =
  'https://www.guiachapadaveadeiros.com/api/migrate_marketplace_once.php?key=GCV-MKT-2026';

async function cdWebRoot(client) {
  // Da pasta inicial (/public_html) sobe para home e entra no docroot do domínio
  let pwd = await client.pwd();
  while (pwd !== '/' && pwd !== '') {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of WEB_ROOT_PARTS) {
    const before = await client.pwd();
    try {
      await client.cd(part);
    } catch (e) {
      const listing = (await client.list()).map((x) => x.name).join(', ');
      throw new Error(`cd ${part} falhou em ${before}: ${e.message}. Contém: ${listing}`);
    }
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

function loadFileZilla() {
  const xmlPath = join(process.env.APPDATA || '', 'FileZilla', 'recentservers.xml');
  if (!existsSync(xmlPath)) return null;
  const xml = readFileSync(xmlPath, 'utf8');
  const host = (xml.match(/<Host>([^<]+)<\/Host>/) || [])[1];
  const user = (xml.match(/<User>([^<]+)<\/User>/) || [])[1];
  const m = xml.match(/<Pass([^>]*)>([^<]*)<\/Pass>/);
  if (!host || !user || !m) return null;
  let pass = m[2];
  if (/encoding\s*=\s*["']base64["']/i.test(m[1])) {
    pass = Buffer.from(pass, 'base64').toString('utf8');
  }
  return {
    FTP_SERVER: host,
    FTP_USERNAME: user,
    FTP_PASSWORD: pass,
    FTP_PORT: '21',
    FTP_SECURE: 'true',
  };
}

const FILES = [
  ['api/_migrate_marketplace_once.php', 'api/migrate_marketplace_once.php'],
  ['api/_migrate_marketplace_once.php', 'api/_migrate_marketplace_once.php'],
  ['api/database/migration_marketplace_financeiro.sql', 'api/database/migration_marketplace_financeiro.sql'],
  ['api/helpers/marketplace_schema.php', 'api/helpers/marketplace_schema.php'],
  ['api/helpers/marketplace/constants.php', 'api/helpers/marketplace/constants.php'],
];

async function main() {
  let env = loadDeployEnv();
  if (!env.FTP_USERNAME || !env.FTP_PASSWORD) {
    const fz = loadFileZilla();
    if (!fz) {
      console.error('[migrate] Sem FTP (.env.deploy ou FileZilla).');
      process.exit(1);
    }
    env = { ...fz, ...env };
    if (!existsSync(join(ROOT, '.env.deploy'))) {
      writeFileSync(
        join(ROOT, '.env.deploy'),
        [
          `FTP_SERVER=${fz.FTP_SERVER}`,
          `FTP_USERNAME=${fz.FTP_USERNAME}`,
          `FTP_PASSWORD=${fz.FTP_PASSWORD}`,
          'FTP_PORT=21',
          'FTP_SECURE=true',
          'FTP_REMOTE_DIR=domains/guiachapadaveadeiros.com/public_html',
          '',
        ].join('\n'),
        'utf8'
      );
    }
  }

  const client = new Client(180_000);
  try {
    await client.access({
      host: (env.FTP_SERVER || '').trim(),
      user: (env.FTP_USERNAME || '').trim(),
      password: (env.FTP_PASSWORD || '').trim(),
      port: Number(env.FTP_PORT || 21),
      secure: String(env.FTP_SECURE || 'true').toLowerCase() !== 'false',
      secureOptions: { rejectUnauthorized: false },
    });
    console.log('[migrate] web root:', await cdWebRoot(client));

    for (const [localRel, remoteRel] of FILES) {
      const localPath = join(ROOT, localRel);
      if (!existsSync(localPath)) {
        console.warn('[migrate] skip', localRel);
        continue;
      }
      const parts = remoteRel.split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[migrate] ↑', remoteRel);
    }
  } finally {
    client.close();
  }

  console.log('[migrate] HTTP', MIGRATE_URL);
  const res = await fetch(MIGRATE_URL);
  const text = await res.text();
  console.log(text);
  if (!res.ok || !/OK: conectado|FEITO/i.test(text)) {
    // tenta com underscore
    const alt = MIGRATE_URL.replace('migrate_marketplace_once', '_migrate_marketplace_once');
    console.log('[migrate] retry', alt);
    const res2 = await fetch(alt);
    const text2 = await res2.text();
    console.log(text2);
    if (!res2.ok || !/OK: conectado|FEITO/i.test(text2)) process.exit(1);
  }
  console.log('[migrate] Concluído.');
}

main().catch((e) => {
  console.error('[migrate] ERRO:', e.message || e);
  process.exit(1);
});
