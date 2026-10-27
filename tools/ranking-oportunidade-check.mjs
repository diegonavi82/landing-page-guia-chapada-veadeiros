import ranking from "../assets/js/gcv-ranking-oportunidade.js";

function assert(cond, msg) {
  if (!cond) {
    console.error("FALHOU:", msg);
    process.exitCode = 1;
  }
}

const fila = ["ana", "bia", "caio", "davi", "eva"];
const agora = new Date(2026, 9, 27, 10, 0, 0);
const longe = new Date(2026, 9, 29, 10, 0, 0);
const perto = new Date(2026, 9, 27, 20, 0, 0);

const top = ranking.abrir(fila, agora, longe);
assert(top.fase === "top3", "com mais de 24h chama o TOP 3");
assert(top.guias.join() === "ana,bia,caio", "TOP 3 são os três primeiros");
assert(top.canal === "whatsapp", "envio pelo WhatsApp");
assert(top.exclusivaAte.getHours() === 12, "exclusividade de 2 horas");
assert(top.aceitarAte.getHours() === 14 && top.aceitarAte.getMinutes() === 20, "aceite de 4h20");

const cedo = ranking.expandir(top, new Date(2026, 9, 27, 11, 0, 0));
assert(cedo.ok === false, "antes de 2 horas o restante não é chamado");

const amplo = ranking.expandir(top, new Date(2026, 9, 27, 12, 0, 0));
assert(amplo.ok === true && amplo.fase === "todos", "depois de 2 horas chama o restante");
assert(amplo.novos.join() === "davi,eva", "os outros saem juntos");
assert(amplo.aceitarAte.getHours() === 16 && amplo.aceitarAte.getMinutes() === 20, "o restante tem 4h20");

const urgente = ranking.abrir(fila, agora, perto);
assert(urgente.fase === "todos" && urgente.guias.length === 5, "faltando menos de 24h chama todos");

const aceite = ranking.aceitar(fila, { ana: 2 }, top, "bia");
assert(aceite.ok === true && aceite.aberta === false, "o primeiro clique fecha o link");
assert(aceite.fila.join() === "ana,caio,davi,eva,bia", "quem aceitou vai para o final");
assert(aceite.faltas.ana === 2 && aceite.faltas.bia === undefined, "aceite do TOP 3 não contabiliza falta");
assert(aceite.avisar.join() === "ana,caio", "os outros que receberam são avisados");

const segunda = ranking.aceitar(aceite.fila, aceite.faltas, { aberta: false, guias: top.guias, top3: top.top3 }, "ana");
assert(segunda.ok === false, "link expirado não aceita outro guia");

const fora = ranking.aceitar(fila, {}, amplo, "davi");
assert(fora.ok === true && fora.fila[fora.fila.length - 1] === "davi", "quem aceita fora do TOP 3 também vai para o final");
assert(fora.faltas.ana === 1 && fora.faltas.bia === 1 && fora.faltas.caio === 1, "se o TOP 3 não clicou, a falta conta");
assert(fora.avisar.indexOf("ana") >= 0 && fora.avisar.indexOf("eva") >= 0, "todos que receberam são avisados");

const uma = ranking.semClique(fila, {}, ["ana", "bia", "caio"]);
assert(uma.faltas.ana === 1 && uma.fila.join() === fila.join(), "uma falta não tira do lugar");
const duas = ranking.semClique(uma.fila, uma.faltas, ["ana", "bia", "caio"]);
const tres = ranking.semClique(duas.fila, duas.faltas, ["ana", "bia", "caio"]);
assert(tres.faltas.ana === 0 && tres.fila.join() === "davi,eva,ana,bia,caio", "na terceira falta o TOP 3 vai para o final");

const sem = ranking.cancelamentoSemGuia();
assert(sem.cancela && sem.motivo === "não há guias disponíveis", "sem guia cancela");
assert(sem.pix === "estorno" && sem.cartao === "não cobra", "Pix estorna e cartão não cobra");

if (!process.exitCode) console.log("ranking ok");
