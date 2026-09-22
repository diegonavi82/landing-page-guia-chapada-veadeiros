#!/usr/bin/env node
import { uploadFiles, withFtp, cdWebRoot } from './ftp-hostinger.mjs';

const ONCE = '_wipe_zion_navi_booking_once.php';

async function main() {
  await uploadFiles(['api/' + ONCE]);

  const url = 'https://www.guiachapadaveadeiros.com/api/' + ONCE + '?key=GCV-MKT-2026';
  console.log('[wipe-zion] HTTP', url);
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
    console.log('[wipe-zion] apagado one-shot no servidor');
  });
}

main().catch((e) => {
  console.error('[wipe-zion] ERRO:', e.message || e);
  process.exit(1);
});
