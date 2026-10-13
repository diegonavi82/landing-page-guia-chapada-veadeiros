import fs from "node:fs";

const file = "api/.env";
if (!fs.existsSync(file)) {
  console.log("no .env");
  process.exit(0);
}
const keys = [
  "MP_PUBLIC_KEY",
  "MP_ACCESS_TOKEN",
  "MP_WEBHOOK_SECRET",
  "MP_CLIENT_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "PAGAMENTO_CARTAO",
  "PASSEIOS_PUBLICOS",
  "APP_SECRET",
  "PAY_FAKE_GATEWAYS",
];
const found = {};
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  const k = t.slice(0, i).trim();
  if (!keys.includes(k)) continue;
  found[k] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
function kind(k, v) {
  if (!v) return "empty";
  if (["PAGAMENTO_CARTAO", "PASSEIOS_PUBLICOS", "PAY_FAKE_GATEWAYS"].includes(k)) return v;
  if (v.startsWith("TEST-") || v.includes("sk_test") || v.includes("pk_test")) return "TEST";
  if (v.startsWith("APP_USR-") || v.includes("sk_live") || v.includes("pk_live") || v.includes("rk_live")) return "LIVE";
  if (v.startsWith("whsec_")) return "set(whsec)";
  return "set(" + v.length + " chars)";
}
for (const k of keys) {
  console.log(k + "=" + (k in found ? kind(k, found[k]) : "missing"));
}
