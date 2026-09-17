#!/usr/bin/env node
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { uploadFiles, withFtp, cdWebRoot } from './ftp-hostinger.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ONCE = '_wipe_bookings_keep_gyovanna_once.php';

async function main() {
  await uploadFiles([
    'api/' + ONCE,
    'dashboard/index.html',
    'assets/js/gcv-dashboard.js',
  ]);

  const url = 'https://www.guiachapadaveadeiros.com/api/' + ONCE + '?key=GCV-MKT-2026';
  console.log('[wipe-bookings] HTTP', url);
  const res = await fetch(url, { cache: 'no-store' });
  const text = await res.text();
  console.log(text);

  if (!res.ok || !/FEITO/i.test(text)) {
    process.exitCode = 1;
    return;
  }

  await withFtp(async (client) => {
    await cdWebRoot(client);
    await client.cd('api');
    await client.remove(ONCE);
    console.log('[wipe-bookings] apagado one-shot no servidor');
  });
}

main().catch((e) => {
  console.error('[wipe-bookings] ERRO:', e.message || e);
  process.exit(1);
});
