import fs from "node:fs";

const src = fs.readFileSync(new URL("../assets/js/site.js", import.meta.url), "utf8");
const tables = src.slice(src.indexOf("var AVISO_MINIMO_EXCURSAO"), src.indexOf("function passeioCopy"));
const fns = src.slice(src.indexOf("function avisoPreenche"), src.indexOf("function passeioBuilderHtml"));
const api = new Function(tables + "\n" + fns + "\nreturn { getAvisoModalidade, getAvisoTransporte };")();

const rows = JSON.parse(
  fs.readFileSync("C:/Users/Diego/AppData/Local/Temp/avisos-xlsx/cenarios.json", "utf8")
).filter((row) => row.A && row.A !== "Pessoas");

const tipo = {
  "Alerta (amarelo)": "alerta",
  "Info (azul)": "info",
  "Sucesso (verde)": "sucesso",
};
const modo = { "Excursão": "excursao", "Privativo": "exclusivo" };
const transporte = { "Sem translado": "0", "Com translado": "1" };

const falhas = [];
for (const row of rows) {
  const n = parseInt(row.A, 10);
  const modalidade = modo[row.B];
  const ride = transporte[row.C];
  const mod = api.getAvisoModalidade(n, modalidade);
  const tr = api.getAvisoTransporte(n, modalidade, ride, "Alto Paraíso");
  const wantMod = String(row.J || "").replace(/ Saiba mais$/, "");
  if (mod.tipo !== tipo[row.I] || mod.texto !== wantMod) {
    falhas.push({ n, row: row._r, caixa: "modalidade", got: mod, want: { tipo: tipo[row.I], texto: wantMod } });
  }
  if (ride === "0") {
    const wantTr = String(row.L || "");
    if (tr.tipo !== tipo[row.K] || tr.texto !== wantTr) {
      falhas.push({ n, row: row._r, caixa: "transporte", got: tr, want: { tipo: tipo[row.K], texto: wantTr } });
    }
  } else {
    const want = avisoComQuatro(n, modalidade);
    if (tr.tipo !== want.tipo || tr.texto !== want.texto) {
      falhas.push({ n, row: row._r, caixa: "transporte-4", got: tr, want: want });
    }
  }
}

function avisoComQuatro(n, modalidade) {
  const v = Math.ceil(n / 4);
  const livres = v * 4 - n;
  const cidade = "Alto Paraíso";
  if (modalidade === "exclusivo") {
    const texto = v === 1
      ? "Transporte exclusivo: 1 veículo só para o seu grupo, com até 4 passageiros + 1 guia, saindo de " + cidade + "."
      : "Transporte exclusivo: " + v + " veículos só para o seu grupo, cada um com até 4 passageiros + 1 guia, saindo de " + cidade + ".";
    return { tipo: "sucesso", texto };
  }
  if (n < 4) {
    return {
      tipo: "alerta",
      texto: "Transporte incluso: o veículo com guia (até 4 passageiros + 1 guia), saindo de " + cidade + ", será publicado em nossa plataforma e depende das mesmas 4 inscrições para confirmar. Vagas abertas para outras pessoas: " + livres + ".",
    };
  }
  const cabeca = v === 1
    ? "Transporte incluso: 1 veículo com guia, saindo de " + cidade + ". Cada veículo leva até 4 passageiros + 1 guia."
    : "Transporte incluso: " + v + " veículos, cada um com guia, saindo de " + cidade + ". Cada veículo leva até 4 passageiros + 1 guia.";
  let resto = v === 1 ? "O veículo fica completo com o seu grupo." : "Os veículos ficam completos com o seu grupo.";
  if (livres === 1) resto = "A vaga restante no último veículo será publicada em nossa plataforma para outras pessoas.";
  else if (livres > 1) resto = "As " + livres + " vagas restantes no último veículo serão publicadas em nossa plataforma para outras pessoas.";
  return { tipo: "sucesso", texto: cabeca + " " + resto };
}

if (rows.length !== 60) {
  console.error("Esperava 60 linhas, veio " + rows.length);
  process.exit(1);
}
if (falhas.length) {
  console.error(JSON.stringify(falhas.slice(0, 6), null, 2));
  console.error(falhas.length + " divergências");
  process.exit(1);
}
const treze = api.getAvisoTransporte(13, "excursao", "1", "Alto Paraíso");
if (!/4 veículos/.test(treze.texto) || !/3 vagas/.test(treze.texto) || !/4 passageiros \+ 1 guia/.test(treze.texto)) {
  console.error("13 pessoas não deu 4 veículos, 3 vagas e 4 passageiros + 1 guia", treze);
  process.exit(1);
}
const tres = api.getAvisoTransporte(3, "excursao", "1", "Alto Paraíso");
if (!/Vagas abertas para outras pessoas: 1/.test(tres.texto)) {
  console.error("3 pessoas não deixou 1 vaga", tres);
  process.exit(1);
}
console.log("60 linhas ok: translado com 4 passageiros + 1 guia");
