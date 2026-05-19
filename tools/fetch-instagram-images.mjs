/**
 * Baixa imagens de posts públicos via redirect /media/?size=l
 * Uso: node tools/fetch-instagram-images.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "..", "assets", "img", "instagram");

/** Pool completo — a home sorteia 16 por visita (JS). */
const POST_URLS = [
  "https://www.instagram.com/p/DOlrv6WkYE-/",
  "https://www.instagram.com/p/DMoS9R6RiQw/",
  "https://www.instagram.com/p/DMgoMAoxvgD/",
  "https://www.instagram.com/p/DL1ClTLRYvp/",
  "https://www.instagram.com/p/DF6YvnBxBzY/",
  "https://www.instagram.com/p/C9NwJOtPz4y/",
  "https://www.instagram.com/p/C9WabRcsoy_/",
  "https://www.instagram.com/p/Cu1_P_7sycq/",
  "https://www.instagram.com/p/Cu1-rzQMps0/",
  "https://www.instagram.com/p/CqvdRd3r-_J/",
  "https://www.instagram.com/p/Cn2oFYSvAQR/",
  "https://www.instagram.com/p/Ci2brVSsman/",
  "https://www.instagram.com/p/BwiC1vkFuT_/",
  "https://www.instagram.com/p/BwaBSQGFgyP/",
  "https://www.instagram.com/p/BsDEhL7lknP/",
  "https://www.instagram.com/p/Bmj7wbin9wW/",
  "https://www.instagram.com/p/Bi7moMcnUuF/",
  "https://www.instagram.com/p/BiF7Zczn5Ca/",
  "https://www.instagram.com/p/BbqJHkfDSpA/",
  "https://www.instagram.com/p/BgHNa08A5xH/",
  "https://www.instagram.com/p/BiF7H9TnAih/",
  "https://www.instagram.com/p/Bl3XXfKHBaW/",
  "https://www.instagram.com/p/Bo7eA-KHVmE/",
  "https://www.instagram.com/p/DVa5VYaEZHX/",
  "https://www.instagram.com/p/DTP0OmFkXAL/",
];

const POSTS = POST_URLS.map((permalink) => ({ permalink }));

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function downloadPostImage(permalink) {
  const mediaUrl = `${permalink.replace(/\/?$/, "/")}media/?size=l`;
  const r = await fetch(mediaUrl, {
    redirect: "follow",
    headers: { "User-Agent": UA, Accept: "image/*,*/*" },
  });
  const ct = r.headers.get("content-type") || "";
  if (!r.ok) throw new Error(`media HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 5000) throw new Error(`arquivo pequeno demais (${buf.length} bytes)`);
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isWebp = buf.slice(0, 4).toString() === "RIFF";
  if (!isJpeg && !isWebp) throw new Error(`formato inesperado (${ct})`);
  return { buf, ext: isWebp ? "webp" : "jpg" };
}

mkdirSync(OUT_DIR, { recursive: true });

/** @type {Array<{permalink:string,image:string,alt:string}>} */
const feedPosts = [];
const total = POSTS.length;

for (let i = 0; i < POSTS.length; i++) {
  const { permalink } = POSTS[i];
  const n = String(i + 1).padStart(2, "0");
  const id = permalink.match(/\/p\/([^/]+)/)?.[1] || `post-${n}`;
  process.stdout.write(`[${n}/${total}] ${id} … `);
  try {
    const { buf, ext } = await downloadPostImage(permalink);
    const fileName = `post-${n}.${ext}`;
    writeFileSync(join(OUT_DIR, fileName), buf);
    console.log(`OK (${buf.length} bytes, .${ext})`);
    feedPosts.push({
      permalink,
      image: `instagram/${fileName}`,
      alt: `Chapada dos Veadeiros — @guiachapadaveadeiros`,
    });
  } catch (e) {
    console.log(`ERRO: ${e.message}`);
  }
}

if (feedPosts.length < 16) {
  console.error(`\nPrecisa de pelo menos 16 imagens no pool; obtidas: ${feedPosts.length}.`);
  process.exit(1);
}

if (feedPosts.length !== POSTS.length) {
  console.warn(`\nAviso: ${feedPosts.length}/${POSTS.length} imagens baixadas (alguns links falharam).`);
}

writeFileSync(
  join(__dirname, "instagram-feed.json"),
  `${JSON.stringify({ updatedAt: new Date().toISOString(), source: "manual", posts: feedPosts }, null, 2)}\n`,
  "utf8",
);
console.log(`\ninstagram-feed.json: ${feedPosts.length} posts no pool (home sorteia 16).`);
