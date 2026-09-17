#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const FILES = [
  'api/_migrate_guide_reject_once.php',
  'api/helpers/guide_registration.php',
  'api/helpers/cms_schema.php',
  'api/helpers/mailer.php',
  'api/helpers/guide_status.php',
  'api/admin/approve-guide.php',
  'api/admin/reject-guide.php',
  'api/admin/block-guide.php',
  'api/admin/pending-guides.php',
  'api/admin/cms-guides.php',
  'api/guides/me-profile.php',
  'api/auth/login.php',
  'api/auth/register.php',
  'api/auth/google-callback.php',
  'assets/js/gcv-dash-roles.js',
  'assets/js/gcv-dashboard.js',
  'assets/js/gcv-admin-cms.js',
  'assets/js/gcv-confirm.js',
  'assets/js/gcv-auth.js',
  'assets/css/gcv-dashboard.css',
  'assets/css/gcv-confirm.css',
  'dashboard/index.html',
  'guia/login.html',
  'guia/cadastro.html',
  'guia/confirmar-email.html',
  'assets/i18n/auth.pt.json',
  'assets/i18n/auth.en.json',
  'assets/i18n/auth.es.json',
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
    console.log('[guide-decision] web root:', await cdWebRoot(client));
    for (const rel of FILES) {
      const localPath = join(ROOT, rel);
      if (!existsSync(localPath)) {
        console.warn('[guide-decision] skip missing', rel);
        continue;
      }
      const parts = rel.replace(/\\/g, '/').split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(localPath, base);
      console.log('[guide-decision] ↑', rel);
    }
  } finally {
    client.close();
  }

  const migrateUrl = 'https://www.guiachapadaveadeiros.com/api/_migrate_guide_reject_once.php?key=GCV-MKT-2026';
  console.log('[guide-decision] HTTP', migrateUrl);
  const mig = await fetch(migrateUrl);
  const migText = await mig.text();
  console.log(migText);
  if (!mig.ok || !migText.includes('FEITO')) {
    console.error('[guide-decision] migrate falhou');
    process.exitCode = 1;
    return;
  }

  const env2 = loadDeployEnv();
  const client2 = await ftpAccess(env2);
  try {
    await cdWebRoot(client2);
    await client2.cd('api');
    await client2.remove('_migrate_guide_reject_once.php');
    console.log('[guide-decision] apagou one-shot no servidor');
  } catch (e) {
    console.warn('[guide-decision] não apagou one-shot:', e.message || e);
  } finally {
    client2.close();
  }

  const url = 'https://www.guiachapadaveadeiros.com/assets/js/gcv-dash-roles.js?v=1.0.84';
  console.log('[guide-decision] HTTP', url);
  const res = await fetch(url);
  const text = await res.text();
  const ok = res.ok && text.includes('gp-submit-approval') && text.includes('RECUSADO');
  console.log('[guide-decision] status', res.status, 'recusado-ui', ok);
  if (!ok) {
    console.error('[guide-decision] JS novo não encontrado no ar');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('[guide-decision] ERRO:', e.message || e);
  process.exit(1);
});
