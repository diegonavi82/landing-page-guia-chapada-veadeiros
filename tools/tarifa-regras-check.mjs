import regras from "../assets/js/gcv-tarifa-regras.js";

const cfg = regras.configPadrao();
const tarifa = {
  exclusivoPessoaCents: 12500,
  excursaoPessoaCents: 8000,
  quorum: 4,
  taxaMinimaCents: 4000,
  taxaPorPessoaCents: 2000,
  transporteFixoCents: 120000,
  transporteExtraCents: 5000,
  taxaTransporteCents: 10000,
  passoPct: 4,
  deslocamentoGuiaCents: 0,
};

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU:", msg);
    process.exitCode = 1;
  }
}

assert(regras.validarTarifa(tarifa, cfg).length === 0, "exemplo 125/80/40 deve salvar");
assert(regras.validarTarifa({ ...tarifa, taxaMinimaCents: 5000 }, cfg).length > 0, "taxa 50 em diária 320 da excursão bloqueia");
assert(regras.precoClienteCents(tarifa, "exclusivo", false, 4) === 50000, "exclusivo 1–4 é a diária");
assert(regras.precoClienteCents(tarifa, "excursao", false, 4) === 32000, "4 pessoas podem pagar excursão");
assert(regras.precoClienteCents(tarifa, "exclusivo", true, 5) === 240000, "exclusivo 5 com transporte são 2 carros");
assert(regras.veiculosDe(5, 4) === 2, "5 pessoas, 2 veículos");

const dez = {
  ...tarifa,
  excursaoPessoaCents: 10000,
  taxaMinimaCents: 10000,
  taxaPorPessoaCents: 5000,
};
assert(regras.precoClienteCents(dez, "excursao", false, 10) === 100000, "10 × 100");
assert(regras.repasseGuiaCents(dez, "excursao", 10, false) === 60000, "guia fica com 600");

assert(regras.passoPct(6, 4) === 4, "6 pessoas, 4%");
assert(regras.passoPct(7, 4) === 8, "7 pessoas, 8%");
assert(regras.precoClienteCents({ ...tarifa, passoPct: 4 }, "excursao", false, 6) === 6 * 7680, "6 × 80 com 4%");

const q = regras.contagemQuorum({ adultos: 2, criancas: 2 }, { idadeAtiva: true, descontoCriancaPct: 50 });
assert(q.quorum === 3, "2 adultos + 2 crianças 50% contam 3");
assert(regras.faltaParaQuorum(4, 2.25) === 2, "falta arredonda para cima");

assert(regras.pontoEncontroPadrao("São Jorge") === "Café com Brigadeiro", "ponto São Jorge");
assert(regras.pontoEncontroPadrao("Cavalcante") === "Café com Delícias", "ponto Cavalcante");
assert(regras.pontoEncontroPadrao("Alto Paraíso de Goiás") === "Padaria Santa Maria", "ponto Alto Paraíso");

const ate = regras.responderAte(new Date(2026, 8, 23, 23, 0, 0), 2, cfg);
assert(ate.getHours() === 10 && ate.getMinutes() === 0, "2h a partir das 23h termina às 10h");

const cedo = regras.cancelamentoPrivativo(10, 10, false);
assert(cedo.devolvePct === 100, "até 48h devolve 100");
const tarde = regras.cancelamentoPrivativo(72, 10, true);
assert(tarde.devolvePct === 40, "guia escolhido devolve 40");
const perto = regras.cancelamentoPrivativo(10, 6, false);
assert(perto.pode === false, "menos de 7 dias não cancela");

if (!process.exitCode) console.log("tarifa ok");
