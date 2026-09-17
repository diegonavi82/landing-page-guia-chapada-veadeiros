#!/usr/bin/env node
/**
 * FTP Hostinger — document root real:
 * domains/guiachapadaveadeiros.com/public_html
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];

export function loadDeployEnv() {
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

export async function cdWebRoot(client) {
  let pwd = await client.pwd();
  while (pwd !== '/' && pwd !== '') {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of WEB_ROOT_PARTS) await client.cd(part);
  return client.pwd();
}

export async function withFtp(fn) {
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
    return await fn(client);
  } finally {
    client.close();
  }
}

/** @param {string[]} relPaths caminhos a partir da raiz do repo */
export async function uploadFiles(relPaths) {
  const files = relPaths.map((r) => r.replace(/\\/g, '/')).filter(Boolean);
  if (!files.length) throw new Error('Nenhum arquivo para enviar');
  await withFtp(async (client) => {
    console.log('[deploy:prod] web root:', await cdWebRoot(client));
    for (const rel of files) {
      const local = join(ROOT, rel);
      if (!existsSync(local)) {
        console.warn('[deploy:prod] skip (não existe):', rel);
        continue;
      }
      const parts = rel.split('/');
      const dir = parts.slice(0, -1).join('/');
      const base = parts[parts.length - 1];
      await cdWebRoot(client);
      if (dir) await client.ensureDir(dir);
      await client.uploadFrom(local, base);
      console.log('[deploy:prod] ↑', rel);
    }
  });
}
