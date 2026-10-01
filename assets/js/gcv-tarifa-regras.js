/**
 * Regras fechadas de tarifa, quórum, repasse e cancelamento.
 * Passeio do guia não usa tarifa progressiva: o preço dele continua o líquido + 10%.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GcvTarifaRegras = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function configPadrao() {
    return {
      diariaMinimaCents: 32000,
      pgMinimoGuiaCents: 28000,
      pausaInicioHora: 22,
      pausaFimHora: 8,
      idadeAtiva: false,
      descontoIdosoPct: 0,
      descontoCriancaPct: 0,
      descontoBebePct: 0,
      aiAtiva: false,
      aiPassoPct: 2,
      conviteHoras: 2,
    };
  }

  function n(v) {
    var x = parseInt(v, 10);
    return Number.isFinite(x) && x > 0 ? x : 0;
  }

  function grupoDe(raw) {
    raw = raw || {};
    return {
      adultos: n(raw.adultos),
      adolescentes: n(raw.adolescentes),
      idosos: n(raw.idosos),
      criancas: n(raw.criancas),
      bebes: n(raw.bebes),
    };
  }

  function peso(qtd, pct) {
    return qtd * (1 - (parseInt(pct, 10) || 0) / 100);
  }

  /** Pessoas inteiras do grupo e a fração que entra no quórum. */
  function contagemQuorum(grupo, config, comTransporte) {
    config = Object.assign(configPadrao(), config || {});
    grupo = grupoDe(grupo);
    var pessoas = grupo.adultos + grupo.adolescentes + grupo.idosos + grupo.criancas + grupo.bebes;
    if (comTransporte && grupo.bebes > 0) {
      return { pessoas: pessoas, quorum: null, bloqueado: true, motivo: "Grupo com bebê não usa o transporte da plataforma." };
    }
    if (!config.idadeAtiva) {
      var cheios = comTransporte ? pessoas - grupo.bebes : pessoas;
      return { pessoas: pessoas, quorum: cheios, bloqueado: false };
    }
    var pagantes = grupo.adultos + grupo.adolescentes;
    var idosos = peso(grupo.idosos, config.descontoIdosoPct);
    if (comTransporte) {
      return {
        pessoas: pessoas - grupo.bebes,
        quorum: pagantes + idosos + grupo.criancas,
        bloqueado: false,
      };
    }
    return {
      pessoas: pessoas,
      quorum: pagantes + idosos + peso(grupo.criancas, config.descontoCriancaPct) + peso(grupo.bebes, config.descontoBebePct),
      bloqueado: false,
    };
  }

  function faltaParaQuorum(meta, contagem) {
    var x = meta - contagem;
    if (x <= 0) return 0;
    return Math.ceil(x - 1e-9);
  }

  function diariaExclusivaCents(tarifa) {
    return (parseInt(tarifa.exclusivoPessoaCents, 10) || 0) * (parseInt(tarifa.quorum, 10) || 0);
  }

  function passoPct(pessoas, passo) {
    pessoas = parseInt(pessoas, 10) || 0;
    passo = parseInt(passo, 10) || 0;
    if (pessoas <= 5 || pessoas % 5 === 0) return 0;
    var pct = passo * (pessoas - 5);
    return pct > 99 ? 99 : pct;
  }

  function veiculosDe(pessoas, quorum) {
    quorum = parseInt(quorum, 10) || 4;
    pessoas = parseInt(pessoas, 10) || 0;
    return Math.max(1, Math.ceil(pessoas / quorum));
  }

  function validarTarifa(tarifa, config) {
    config = Object.assign(configPadrao(), config || {});
    var erros = [];
    var exclusivo = parseInt(tarifa.exclusivoPessoaCents, 10) || 0;
    var excursao = parseInt(tarifa.excursaoPessoaCents, 10) || 0;
    var quorum = parseInt(tarifa.quorum, 10) || 0;
    var diaria = diariaExclusivaCents(tarifa);
    if (exclusivo <= excursao) erros.push("O preço por pessoa do exclusivo tem que ser maior que o da excursão.");
    if (diaria < config.diariaMinimaCents) erros.push("A diária exclusiva não pode ser menor que a diária mínima.");
    if (excursao * quorum < config.diariaMinimaCents) erros.push("Preço da excursão vezes o quórum tem que ser pelo menos a diária mínima.");
    var taxaMinima = parseInt(tarifa.taxaMinimaCents, 10) || 0;
    if (diaria - taxaMinima < config.pgMinimoGuiaCents) erros.push("No exclusivo, a diária menos a taxa mínima deixa o guia abaixo do pagamento mínimo.");
    if (excursao * quorum - taxaMinima < config.pgMinimoGuiaCents) erros.push("Na excursão, o fechamento do quórum menos a taxa mínima deixa o guia abaixo do pagamento mínimo.");
    var carro = parseInt(tarifa.transporteFixoCents, 10) || 0;
    var extra = parseInt(tarifa.transporteExtraCents, 10) || 0;
    if (carro > 0 && extra <= 0) erros.push("A excursão com transporte tem que ficar acima do valor por pessoa do carro exclusivo.");
    var taxaPessoa = parseInt(tarifa.taxaPorPessoaCents, 10) || 0;
    if (taxaPessoa >= excursao && excursao > 0) erros.push("A taxa por pessoa tem que ser menor que o preço da excursão.");
    return erros;
  }

  /**
   * Preço do cliente no roteiro publicado pelo admin ou aberto pelo cliente.
   * Passeio publicado pelo guia não passa por aqui: continua líquido + 10%.
   * Exclusivo sem transporte, de 1 até o quórum: diária fixa, não por cabeça.
   * Múltiplo de 5: mesma unidade, sem desconto progressivo.
   * 6, 7, 8, 9, 11…: desconto = passo% × (pessoas − 5), só sem transporte.
   */
  function precoClienteCents(tarifa, modalidade, comTransporte, pessoas, opcoes) {
    opcoes = opcoes || {};
    var quorum = parseInt(tarifa.quorum, 10) || 4;
    var exclusivo = parseInt(tarifa.exclusivoPessoaCents, 10) || 0;
    var excursao = parseInt(tarifa.excursaoPessoaCents, 10) || 0;
    pessoas = parseInt(pessoas, 10) || 0;
    if (pessoas < 1) return 0;
    if (comTransporte) {
      if (modalidade === "exclusivo") {
        return (parseInt(tarifa.transporteFixoCents, 10) || 0) * veiculosDe(pessoas, quorum);
      }
      var unitT = Math.round((parseInt(tarifa.transporteFixoCents, 10) || 0) / quorum) + (parseInt(tarifa.transporteExtraCents, 10) || 0);
      return unitT * pessoas;
    }
    if (modalidade === "exclusivo" && pessoas <= quorum) return exclusivo * quorum;
    var unit = modalidade === "exclusivo" ? exclusivo : excursao;
    var total = unit * pessoas;
    if (pessoas % 5 !== 0) {
      var pct = passoPct(pessoas, parseInt(tarifa.passoPct, 10) || 4);
      total = Math.round(unit * (100 - pct) / 100) * pessoas;
    } else if (opcoes.assentoGuia === false) {
      var carros = Math.max(1, Math.ceil(pessoas / 5));
      total += (parseInt(tarifa.deslocamentoGuiaCents, 10) || 0) * carros;
    }
    return total;
  }

  function repasseGuiaCents(tarifa, modalidade, pessoas, comTransporte) {
    var taxaMinima = parseInt(tarifa.taxaMinimaCents, 10) || 0;
    var taxaPessoa = parseInt(tarifa.taxaPorPessoaCents, 10) || 0;
    var taxaTransporte = parseInt(tarifa.taxaTransporteCents, 10) || 0;
    var quorum = parseInt(tarifa.quorum, 10) || 4;
    pessoas = parseInt(pessoas, 10) || 0;
    if (comTransporte) {
      var cliente = precoClienteCents(tarifa, modalidade, true, pessoas);
      return Math.max(0, cliente - taxaTransporte * veiculosDe(pessoas, quorum));
    }
    if (modalidade === "exclusivo" && pessoas > 0 && pessoas <= quorum) {
      return Math.max(0, diariaExclusivaCents(tarifa) - taxaMinima);
    }
    var unit = modalidade === "exclusivo"
      ? (parseInt(tarifa.exclusivoPessoaCents, 10) || 0)
      : (parseInt(tarifa.excursaoPessoaCents, 10) || 0);
    if (pessoas % 5 !== 0) {
      unit = Math.round(unit * (100 - passoPct(pessoas, parseInt(tarifa.passoPct, 10) || 4)) / 100);
    }
    var noQuorum = Math.min(pessoas, quorum);
    var extras = Math.max(0, pessoas - quorum);
    return Math.max(0, noQuorum * unit - taxaMinima + extras * Math.max(0, unit - taxaPessoa));
  }

  function pontoEncontroPadrao(cidade) {
    var key = String(cidade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    if (key.indexOf("cavalcante") >= 0) return "Café com Delícias";
    if (key.indexOf("jorge") >= 0) return "Café com Brigadeiro";
    if (key.indexOf("paraiso") >= 0) return "Padaria Santa Maria";
    return "";
  }

  /** Relógio parado entre 22h e 8h. Devolve o instante em que as horas úteis se completam. */
  function responderAte(inicio, horas, config) {
    config = Object.assign(configPadrao(), config || {});
    var cursor = new Date(inicio.getTime());
    var restam = (parseInt(horas, 10) || config.conviteHoras) * 60;
    var guard = 0;
    while (restam > 0 && guard < 24 * 60 * 4) {
      var h = cursor.getHours();
      var pausado = h >= config.pausaInicioHora || h < config.pausaFimHora;
      if (!pausado) restam -= 1;
      cursor = new Date(cursor.getTime() + 60000);
      guard += 1;
    }
    return cursor;
  }

  function cancelamentoPrivativo(horasDesdeCompra, diasAtePasseio, guiaEscolhido) {
    if (diasAtePasseio < 7) {
      return { pode: false, devolvePct: 0, texto: "Faltando menos de 7 dias, a reserva não pode ser cancelada." };
    }
    if (horasDesdeCompra <= 48) {
      return { pode: true, devolvePct: 100, texto: "Até 48 horas depois da compra, a devolução é integral." };
    }
    if (!guiaEscolhido) {
      return { pode: true, devolvePct: 80, texto: "Depois de 48 horas, sem guia escolhido, a devolução é de 80%." };
    }
    return { pode: true, devolvePct: 40, texto: "Com o guia escolhido, a devolução é de 40%. O guia fica com metade da parte dele." };
  }

  return {
    configPadrao: configPadrao,
    contagemQuorum: contagemQuorum,
    faltaParaQuorum: faltaParaQuorum,
    diariaExclusivaCents: diariaExclusivaCents,
    validarTarifa: validarTarifa,
    repasseGuiaCents: repasseGuiaCents,
    passoPct: passoPct,
    veiculosDe: veiculosDe,
    precoClienteCents: precoClienteCents,
    pontoEncontroPadrao: pontoEncontroPadrao,
    responderAte: responderAte,
    cancelamentoPrivativo: cancelamentoPrivativo,
  };
});
