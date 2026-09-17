#!/usr/bin/env node
/**
 * Sobe arquivos para www.guiachapadaveadeiros.com (Hostinger).
 * Uso: npm run deploy:prod -- arquivo1 arquivo2 ...
 */
import { uploadFiles } from './ftp-hostinger.mjs';

const files = process.argv.slice(2).filter((a) => !a.startsWith('-') && a !== '--');
if (!files.length) {
  console.error('Uso: npm run deploy:prod -- api/auth/login.php dashboard/index.html ...');
  process.exit(1);
}

uploadFiles(files).catch((e) => {
  console.error('[deploy:prod] ERRO:', e.message || e);
  process.exit(1);
});
