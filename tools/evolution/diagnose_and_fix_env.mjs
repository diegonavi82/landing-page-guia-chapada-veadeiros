#!/usr/bin/env node
/**
 * Confere Evolution + mescla EVOLUTION_* no api/.env da Hostinger (sem imprimir segredos).
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Writable } from 'node:stream';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEB_ROOT_PARTS = ['domains', 'guiachapadaveadeiros.com', 'public_html'];
const SECRETS = join(ROOT, 'tools', 'evolution', 'vps-secrets.txt');
const TMP = join(ROOT, 'tools', 'evolution', '_remote.env.tmp');

function loadEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
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

function loadDeployEnv() {
  const out = { ...process.env };
  const envPath = join(ROOT, '.env.deploy');
  if (!existsSync(envPath)) return out;
  Object.assign(out, loadEnvFile(envPath));
  return out;
}

async function cdWebRoot(client) {
  let pwd = await client.pwd();
  while (pwd !== '/' && pwd !== '') {
    await client.cdup();
    pwd = await client.pwd();
  }
  for (const part of WEB_ROOT_PARTS) await client.cd(part);
  return client.pwd();
}

function upsertEnvLine(text, key, value) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  const line = `${key}=${value}`;
  if (re.test(text)) return text.replace(re, line);
  const trimmed = text.replace(/\s+$/, '');
  return (trimmed ? trimmed + '\n' : '') + line + '\n';
}

async function ftpDownload(client, remoteName, destPath) {
  const chunks = [];
  const writable = new Writable({
    write(chunk, _enc, cb) {
      chunks.push(chunk);
      cb();
    },
  });
  await client.downloadTo(writable, remoteName);
  writeFileSync(destPath, Buffer.concat(chunks));
}

async function main() {
  const secrets = loadEnvFile(SECRETS);
  const url = (secrets.EVOLUTION_API_URL || '').replace(/\/+$/, '');
  const key = secrets.EVOLUTION_API_KEY || '';
  const instance = secrets.EVOLUTION_INSTANCE || 'gcv';
  if (!url || !key) {
    console.error('[wa] faltam EVOLUTION_* em tools/evolution/vps-secrets.txt');
    process.exit(1);
  }
  console.log('[wa] URL', url);
  console.log('[wa] instância', instance);
  console.log('[wa] key', key ? `ok (${key.length} chars)` : 'AUSENTE');

  const stateRes = await fetch(`${url}/instance/connectionState/${encodeURIComponent(instance)}`, {
    headers: { apikey: key },
  });
  const stateText = await stateRes.text();
  console.log('[wa] connectionState HTTP', stateRes.status);
  try {
    const j = JSON.parse(stateText);
    const st = j?.instance?.state || j?.state || j?.status || JSON.stringify(j).slice(0, 180);
    console.log('[wa] estado', st);
  } catch {
    console.log('[wa] body', stateText.slice(0, 200));
  }

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
    console.log('[wa] web root', await cdWebRoot(client));
    await client.cd('api');
    await ftpDownload(client, '.env', TMP);
    let text = readFileSync(TMP, 'utf8');
    const before = loadEnvFile(TMP);
    console.log('[wa] Hostinger .env EVOLUTION_API_URL', before.EVOLUTION_API_URL ? before.EVOLUTION_API_URL : 'AUSENTE');
    console.log('[wa] Hostinger .env EVOLUTION_API_KEY', before.EVOLUTION_API_KEY ? `ok (${before.EVOLUTION_API_KEY.length} chars)` : 'AUSENTE');
    console.log('[wa] Hostinger .env EVOLUTION_INSTANCE', before.EVOLUTION_INSTANCE || 'AUSENTE');

    text = upsertEnvLine(text, 'EVOLUTION_API_URL', url);
    text = upsertEnvLine(text, 'EVOLUTION_API_KEY', key);
    text = upsertEnvLine(text, 'EVOLUTION_INSTANCE', instance);
    if (!before.PURCHASE_NOTIFY_WHATSAPP) {
      text = upsertEnvLine(text, 'PURCHASE_NOTIFY_WHATSAPP', secrets.PURCHASE_NOTIFY_WHATSAPP || '5562982506891');
    }
    writeFileSync(TMP, text);
    await client.uploadFrom(TMP, '.env');
    console.log('[wa] .env Hostinger atualizado com Evolution HTTPS');
  } finally {
    client.close();
    try { unlinkSync(TMP); } catch { /* ignore */ }
  }
}

main().catch((e) => {
  console.error('[wa] ERRO', e.message || e);
  process.exit(1);
});
