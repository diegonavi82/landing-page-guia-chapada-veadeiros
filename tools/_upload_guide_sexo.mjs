#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const FILES = [
  'api/helpers/auth.php',
  'api/helpers/guide_profile.php',
  'api/helpers/cms_schema.php',
  'api/guides/me-profile.php',
  'api/admin/cms-guides.php',
  'api/admin/pending-guides.php',
  'api/_migrate_guide_sexo_once.php',
  'assets/js/gcv-porta.js',
  'assets/js/gcv-admin-cms.js',
  'assets/js/gcv-dash-roles.js',
  'assets/js/gcv-dashboard.js',
  'dashboard/index.html',
  'login.html',
  'en/login.html',
  'es/login.html',
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
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
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
    console.log('[sexo] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(join(ROOT, rel), base);
      console.log('[sexo] ↑', rel);
    }
  } finally {
    client.close();
  }

  const mig = await fetch('https://www.guiachapadaveadeiros.com/api/_migrate_guide_sexo_once.php?key=GCV-MKT-2026', { cache: 'no-store' });
  const migText = await mig.text();
  console.log('[sexo] migrate HTTP', mig.status);
  console.log(migText);

  const js = await fetch('https://www.guiachapadaveadeiros.com/assets/js/gcv-dash-roles.js?v=1.0.86', { cache: 'no-store' });
  const text = await js.text();
  console.log('[sexo] dash-roles', js.status, 'gp-sexo', text.includes('gp-sexo'));
}

main().catch((e) => {
  console.error('[sexo] ERRO:', e.message || e);
  process.exit(1);
});
