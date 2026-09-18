#!/usr/bin/env node
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { cdWebRoot, ROOT, uploadFiles, withFtp } from './ftp-hostinger.mjs';

const ONCE = '_reset_diego_navi_profile_once.php';
const FILES = [
  'api/_reset_diego_navi_profile_once.php',
  'api/helpers/diego_navi_stash.php',
  'api/guides/me-profile.php',
  'api/auth/register.php',
  'api/data/_tmp_diego_navi/profile.json',
];

await uploadFiles(FILES);

const url = `https://www.guiachapadaveadeiros.com/api/${ONCE}?key=GCV-MKT-2026`;
console.log('[reset-diego] HTTP', url);
const res = await fetch(url);
const text = await res.text();
console.log(text);
writeFileSync(join(ROOT, 'api/data/_tmp_diego_navi/reset-log.txt'), text, 'utf8');

if (!res.ok || !/FEITO/i.test(text)) {
  process.exitCode = 1;
  throw new Error('one-shot falhou');
}

await withFtp(async (client) => {
  await cdWebRoot(client);
  await client.cd('api');
  if (existsSync(join(ROOT, 'api', ONCE))) {
    await client.remove(ONCE);
    console.log('[reset-diego] apagado one-shot no servidor');
  }
});
