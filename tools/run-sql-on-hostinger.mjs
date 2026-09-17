#!/usr/bin/env node
/**
 * Executa um .sql no MySQL da Hostinger (FTP do arquivo + HTTP).
 *   node tools/run-sql-on-hostinger.mjs api/database/migration_foo.sql
 */
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { ROOT, uploadFiles } from './ftp-hostinger.mjs';

const sqlRel = (process.argv.slice(2).find((a) => !a.startsWith('-')) || '').replace(/\\/g, '/');
if (!sqlRel) {
  console.error('Uso: node tools/run-sql-on-hostinger.mjs api/database/arquivo.sql');
  process.exit(1);
}
const sqlPath = sqlRel.startsWith('api/') ? sqlRel : (sqlRel.includes('/') ? sqlRel : `api/database/${sqlRel}`);
const local = join(ROOT, sqlPath);
if (!existsSync(local)) {
  console.error('SQL não encontrado:', local);
  process.exit(1);
}

const file = basename(sqlPath);
try {
  await uploadFiles([sqlPath, 'api/run-sql.php']);
  const url = `https://www.guiachapadaveadeiros.com/api/run-sql.php?key=GCV-MKT-2026&file=${encodeURIComponent(file)}`;
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  console.log('[db:migrate] HTTP', res.status);
  console.log(text);
  if (!res.ok || !text.includes('DONE')) process.exit(1);
} catch (e) {
  console.error('[db:migrate] ERRO:', e.message || e);
  process.exit(1);
}
