#!/usr/bin/env node
import { uploadFiles, withFtp, cdWebRoot } from './ftp-hostinger.mjs';

const ONCE = '_fix_guide_complete_once.php';

async function main() {
  await uploadFiles([
    'api/helpers/diego_navi_stash.php',
    'api/helpers/guide_profile.php',
    'api/admin/cms-guides.php',
    'assets/js/gcv-admin-cms.js',
    'assets/js/gcv-dashboard.js',
    'dashboard/index.html',
    'api/' + ONCE,
  ]);

  const url = 'https://www.guiachapadaveadeiros.com/api/' + ONCE + '?key=GCV-MKT-2026';
  console.log('[fix-complete] HTTP', url);
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
    console.log('[fix-complete] apagado one-shot no servidor');
  });
}

main().catch((e) => {
  console.error('[fix-complete] ERRO:', e.message || e);
  process.exit(1);
});
