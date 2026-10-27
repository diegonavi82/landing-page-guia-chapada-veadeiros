/**
 * Fila e envio de oportunidade.
 * Venda confirmada de passeio exclusivo, ou excursão com quórum, com ou sem transporte.
 * O envio é pelo WhatsApp. Cliente e guia também recebem e-mail.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GcvRankingOportunidade = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function configPadrao() {
    return {
      top3: 3,
      exclusividadeHoras: 2,
      aceiteMinutos: 260,
      urgenteHoras: 24,
      faltasParaFim: 3,
    };
  }

  function cfg(config) {
    return Object.assign(configPadrao(), config || {});
  }

  function idDe(guia) {
    return String(guia);
  }

  function copiarFaltas(faltas) {
    var out = {};
    Object.keys(faltas || {}).forEach(function (k) {
      out[k] = faltas[k];
    });
    return out;
  }

  function paraOFim(fila, guiaId) {
    var id = idDe(guiaId);
    var rest = [];
    var item = null;
    (fila || []).forEach(function (guia) {
      if (idDe(guia) === id) item = guia;
      else rest.push(guia);
    });
    if (item !== null) rest.push(item);
    return rest;
  }

  function contem(lista, guiaId) {
    var id = idDe(guiaId);
    return (lista || []).some(function (guia) {
      return idDe(guia) === id;
    });
  }

  function horasAte(agora, inicio) {
    return (inicio.getTime() - agora.getTime()) / 3600000;
  }

  /**
   * Menos de 24h para o início: todos os guias, o primeiro aceite entra.
   * Nos demais casos: só o TOP 3, com exclusividade de 2 horas.
   * O clique vale por 4 horas e 20 minutos.
   */
  function abrir(fila, agora, inicioPasseio, config) {
    config = cfg(config);
    var lista = (fila || []).slice();
    var urgente = horasAte(agora, inicioPasseio) < config.urgenteHoras;
    var guias = urgente ? lista.slice() : lista.slice(0, config.top3);
    return {
      fase: urgente ? "todos" : "top3",
      fila: lista,
      guias: guias,
      top3: lista.slice(0, config.top3),
      exclusivaAte: urgente ? null : new Date(agora.getTime() + config.exclusividadeHoras * 3600000),
      aceitarAte: new Date(agora.getTime() + config.aceiteMinutos * 60000),
      aberta: guias.length > 0,
      canal: "whatsapp",
      tambemEmail: true,
    };
  }

  /**
   * Sem aceite do TOP 3 nas 2 horas, o restante da lista é avisado ao mesmo tempo,
   * com o mesmo prazo de 4h20. Quem já estava no TOP 3 continua podendo clicar.
   */
  function expandir(oportunidade, agora, config) {
    config = cfg(config);
    if (!oportunidade || !oportunidade.aberta) return { ok: false, motivo: "link expirado" };
    if (oportunidade.fase !== "top3") return { ok: false, motivo: "já está com toda a lista" };
    if (oportunidade.exclusivaAte && agora.getTime() < oportunidade.exclusivaAte.getTime()) {
      return { ok: false, motivo: "exclusividade do TOP 3 em curso" };
    }
    var ja = {};
    (oportunidade.guias || []).forEach(function (guia) {
      ja[idDe(guia)] = true;
    });
    var novos = (oportunidade.fila || []).filter(function (guia) {
      return !ja[idDe(guia)];
    });
    return {
      ok: true,
      fase: "todos",
      fila: (oportunidade.fila || []).slice(),
      guias: (oportunidade.fila || []).slice(),
      novos: novos,
      top3: (oportunidade.top3 || []).slice(),
      exclusivaAte: null,
      aceitarAte: new Date(agora.getTime() + config.aceiteMinutos * 60000),
      aberta: true,
      canal: "whatsapp",
      tambemEmail: true,
    };
  }

  /**
   * O primeiro clique ocupa a vaga e o link expira.
   * Quem aceitou vai para o final da fila.
   * Se quem aceitou estava no TOP 3, a oportunidade não entra na contagem de faltas.
   * Os outros que receberam a mensagem são avisados de que outro guia aceitou.
   */
  function aceitar(fila, faltas, oportunidade, guiaId, config) {
    if (!oportunidade || !oportunidade.aberta) return { ok: false, motivo: "link expirado" };
    if (!contem(oportunidade.guias, guiaId)) return { ok: false, motivo: "este guia não recebeu a oportunidade" };
    var noTop3 = contem(oportunidade.top3, guiaId);
    var ordem = paraOFim(fila, guiaId);
    var proximas = copiarFaltas(faltas);
    if (!noTop3) {
      var penal = semClique(ordem, proximas, oportunidade.top3, config);
      ordem = penal.fila;
      proximas = penal.faltas;
    }
    return {
      ok: true,
      fila: ordem,
      faltas: proximas,
      contabilizaFalta: !noTop3,
      aberta: false,
      guiaId: guiaId,
      noTop3: noTop3,
      avisar: (oportunidade.guias || []).filter(function (guia) {
        return idDe(guia) !== idDe(guiaId);
      }),
    };
  }

  /**
   * TOP 3 que não clicou acumula uma vez. Na terceira, vai para o final.
   * Só vale quando ninguém aceitou. Aceite de um guia do TOP 3 não passa por aqui.
   */
  function semClique(fila, faltas, top3, config) {
    config = cfg(config);
    var proximas = copiarFaltas(faltas);
    var ordem = (fila || []).slice();
    (top3 || []).forEach(function (guia) {
      var id = idDe(guia);
      proximas[id] = (proximas[id] || 0) + 1;
      if (proximas[id] >= config.faltasParaFim) {
        ordem = paraOFim(ordem, guia);
        proximas[id] = 0;
      }
    });
    return { fila: ordem, faltas: proximas };
  }

  function cancelamentoSemGuia() {
    return {
      cancela: true,
      motivo: "não há guias disponíveis",
      pix: "estorno",
      cartao: "não cobra",
      avisa: ["whatsapp", "email"],
    };
  }

  return {
    configPadrao: configPadrao,
    abrir: abrir,
    expandir: expandir,
    aceitar: aceitar,
    semClique: semClique,
    paraOFim: paraOFim,
    cancelamentoSemGuia: cancelamentoSemGuia,
  };
});
