/**
 * Baixa a tabela FIPE de carros (marca + modelo) e grava
 * assets/data/veiculos-fipe.json para o autocomplete do perfil do guia.
 *
 *   node tools/build-fipe-vehicles.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outFile = join(root, 'assets', 'data', 'veiculos-fipe.json');
const API = 'https://parallelum.com.br/fipe/api/v1/carros/marcas';

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

async function getJson(url, attempt = 0) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'gcv-fipe' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } catch (err) {
    if (attempt >= 4) throw err;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
    return getJson(url, attempt + 1);
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
}

const brands = await getJson(API);
console.log('marcas', brands.length);
const chunks = await mapPool(brands, 6, async (brand, index) => {
  const data = await getJson(`${API}/${brand.codigo}/modelos`);
  const models = Array.isArray(data?.modelos) ? data.modelos : [];
  if ((index + 1) % 10 === 0) console.log('marcas lidas', index + 1, '/', brands.length);
  const brandName = String(brand.nome || '').trim();
  return models.map((model) => {
    const modelName = String(model?.nome || '').trim();
    if (!brandName || !modelName) return '';
    return `${brandName} ${modelName}`.replace(/\s+/g, ' ').trim();
  });
});

const seen = new Set();
const names = [];
for (const list of chunks) {
  for (const name of list) {
    const key = fold(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
}
names.sort((a, b) => a.localeCompare(b, 'pt'));
writeFileSync(outFile, JSON.stringify(names));
console.log('modelos', names.length, '→', outFile);
