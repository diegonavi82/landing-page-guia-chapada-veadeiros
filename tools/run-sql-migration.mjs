#!/usr/bin/env node
/**
 * Executa um .sql no MySQL.
 * 1) Tenta conexão local/remota via PHP (api/config.local.php / .env)
 * 2) Se falhar (banco só na Hostinger), faz upload FTP + one-shot HTTP
 *
 *   npm run db:migrate -- api/database/migration_marketplace_financeiro.sql
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function loadConfigLocal() {
  const file = path.join(root, 'api', 'config.local.php');
  if (!fs.existsSync(file)) return {};
  const raw = fs.readFileSync(file, 'utf8');
  const get = (key) => {
    const m = raw.match(new RegExp(`['"]${key}['"]\\s*=>\\s*['"]([^'"]*)['"]`));
    return m ? m[1] : '';
  };
  return {
    DB_HOST: get('db_host'),
    DB_NAME: get('db_name'),
    DB_USER: get('db_user'),
    DB_PASS: get('db_pass'),
  };
}

function findPhp() {
  const candidates = [process.env.PHP_BIN, 'C:\\php.exe', 'C:\\php\\php.exe', 'php'].filter(Boolean);
  for (const bin of candidates) {
    const r = spawnSync(bin, ['-v'], { encoding: 'utf8' });
    if (r.status === 0) return bin;
  }
  return null;
}

const sqlRel = process.argv.slice(2).find((a) => !a.startsWith('-'))
  || 'api/database/migration_marketplace_financeiro.sql';
const sqlPath = path.isAbsolute(sqlRel) ? sqlRel : path.join(root, sqlRel);

if (!fs.existsSync(sqlPath)) {
  console.error('Arquivo SQL não encontrado:', sqlPath);
  process.exit(1);
}

const env = { ...loadEnvFile(path.join(root, 'api', '.env')), ...loadConfigLocal(), ...process.env };
const host = env.DB_HOST || 'localhost';
const name = env.DB_NAME || '';
const user = env.DB_USER || '';
const pass = env.DB_PASS || '';
const php = findPhp();

let localOk = false;
if (php && name && user) {
  console.log('[db:migrate] Tentando MySQL direto…');
  const result = spawnSync(
    php,
    [path.join(root, 'tools', '_run_sql_migration.php'), sqlPath, host, name, user, pass],
    { encoding: 'utf8', cwd: root }
  );
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  localOk = result.status === 0;
}

if (localOk) {
  console.log('[db:migrate] OK (conexão direta).');
  process.exit(0);
}

console.log('[db:migrate] MySQL local/remoto indisponível — usando FTP + one-shot Hostinger…');
const remote = spawnSync(process.execPath, [path.join(root, 'tools', 'run-sql-on-hostinger.mjs'), sqlRel], {
  encoding: 'utf8',
  cwd: root,
  env: process.env,
});
process.stdout.write(remote.stdout || '');
process.stderr.write(remote.stderr || '');
process.exit(remote.status ?? 1);
