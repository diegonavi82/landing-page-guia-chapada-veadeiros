#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'basic-ftp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadDeployEnv() {
  const out = { ...process.env };
  const envPath = join(ROOT, '.env.deploy');
  if (!existsSync(envPath)) return out;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = loadDeployEnv();
const client = new Client(60_000);
await client.access({
  host: (env.FTP_SERVER || '').trim(),
  user: (env.FTP_USERNAME || '').trim(),
  password: (env.FTP_PASSWORD || '').trim(),
  port: Number(env.FTP_PORT || 21),
  secure: String(env.FTP_SECURE || 'true').toLowerCase() !== 'false',
  secureOptions: { rejectUnauthorized: false },
});
await client.cd('/domains/guiachapadaveadeiros.com/public_html/api');
await client.remove('_migrate_guide_sexo_once.php');
console.log('removed api/_migrate_guide_sexo_once.php');
client.close();
