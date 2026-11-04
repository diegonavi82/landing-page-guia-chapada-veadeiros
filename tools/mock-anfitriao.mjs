/**
 * Anfitrião no mock local: aprovação, WhatsApp, financeiro de ingressos e regras de venda.
 * O extrato é um planejamento coerente até o checkout de ingresso gravar a venda real.
 */

const SEGREDO_SLUG = "cachoeira-segredo-guia-chapada-veadeiros-sao-jorge";
const POCO_SLUG = "cachoeira-poco-encantado-guia-chapada-veadeiros-teresina-de-goias";

const anfitrioes = [
  {
    id: 2,
    nome: "Marina do Poço",
    email: "marina@poco.test",
    telefone: "62988881111",
    experiencia: "Poço Encantado",
    status: "pending",
    slug: POCO_SLUG,
    plano: "padrao",
    max_dia: 30,
    preco_cents: 5000,
  },
  {
    id: 1,
    nome: "Lúcia Anfitriã",
    email: "lucia@segredo.test",
    telefone: "62977770001",
    experiencia: "Segredo",
    status: "active",
    slug: SEGREDO_SLUG,
    plano: "premium",
    max_dia: 40,
    preco_cents: 7000,
  },
];

const whatsapp = [
  {
    em: "2026-10-12T11:10:00.000Z",
    para: "admin",
    texto: "Novo anfitrião aguardando aprovação: Marina do Poço · marina@poco.test · 62988881111 · Poço Encantado. O financeiro fica fechado até você aprovar.",
  },
];

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function isoData(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function somaDias(base, n) {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function avisar(para, texto) {
  whatsapp.unshift({ em: new Date().toISOString(), para: String(para), texto: String(texto) });
}

function vendaDe(atra) {
  const exp = atra && atra.experiencia && typeof atra.experiencia === "object" ? atra.experiencia : {};
  return exp.venda && typeof exp.venda === "object" ? exp.venda : {};
}

function atrativoDe(host, attractions) {
  if (!host) return null;
  return attractions.find((a) => a.slug === host.slug)
    || attractions.find((a) => String(a.title_pt || "").toLowerCase() === String(host.experiencia || "").toLowerCase())
    || null;
}

function hostPorEmail(email) {
  return anfitrioes.find((h) => h.email === String(email || "").toLowerCase()) || null;
}

function hostPorId(id) {
  return anfitrioes.find((h) => h.id === id) || null;
}

function financeiroDe(host, attractions) {
  const atra = atrativoDe(host, attractions);
  const venda = vendaDe(atra);
  const maxDia = Math.max(1, parseInt(venda.max_dia, 10) || host.max_dia || 40);
  const preco = Math.max(0, parseInt(host.preco_cents, 10) || 7000);
  const taxa = host.plano === "premium" ? 0.15 : host.plano === "padrao" ? 0.08 : 0;
  const hoje = new Date();
  const hojeIso = isoData(hoje);
  const linhas = [];
  for (let i = 18; i >= 1; i--) {
    const dia = somaDias(hoje, -i);
    const vendidos = Math.min(maxDia, 10 + (i % 6) * 2);
    let rest = vendidos;
    const meia = Math.min(rest, i % 3 === 0 ? 2 : 0);
    rest -= meia;
    const internacional = Math.min(rest, 2);
    rest -= internacional;
    const nacional = Math.min(rest, 4);
    rest -= nacional;
    const pix = rest;
    const fatias = [
      ["meia", "Meia-entrada no PIX", meia, 1],
      ["pix", "PIX", pix, 1],
      ["nacional", "Cartão nacional", nacional, 30],
      ["internacional", "Cartão internacional", internacional, 14],
    ];
    fatias.forEach(([meio, rotulo, qtd, prazo]) => {
      if (qtd <= 0) return;
      const bruto = qtd * preco;
      const desconto = meio === "meia" ? Math.round(qtd * preco / 2) : 0;
      const liquido = bruto - desconto;
      const taxaCents = Math.round(liquido * taxa);
      const receber = liquido - taxaCents;
      const paga = isoData(somaDias(dia, prazo));
      linhas.push({
        data: isoData(dia),
        meio,
        rotulo,
        qtd,
        bruto,
        desconto,
        liquido,
        taxa: taxaCents,
        receber,
        pagamento: paga,
        situacao: paga <= hojeIso ? "liquidado" : "provisao",
      });
    });
  }
  const soma = (lista, campo) => lista.reduce((s, l) => s + l[campo], 0);
  const mes = hojeIso.slice(0, 7);
  const noMes = linhas.filter((l) => l.data.slice(0, 7) === mes);
  const diasMes = hoje.getDate();
  const vendidosMes = soma(noMes, "qtd");
  const lotacao = [];
  for (let i = 7; i >= 1; i--) {
    const data = isoData(somaDias(hoje, -i));
    const qtd = linhas.filter((l) => l.data === data).reduce((s, l) => s + l.qtd, 0);
    lotacao.push({ data, qtd, max: maxDia });
  }
  const media = lotacao.reduce((s, d) => s + d.qtd, 0) / 7;
  const previsao = Math.round(media * 7);
  return {
    aguardando: false,
    planejamento: true,
    anfitriao: host,
    experiencia: host.experiencia,
    plano: host.plano,
    taxa_pct: Math.round(taxa * 100),
    preco_cents: preco,
    max_dia: maxDia,
    regras: "PIX liquida no dia seguinte. Cartão internacional em 14 dias. Cartão nacional em 30 dias. A taxa do plano incide sobre o valor depois do desconto de meia-entrada. Este extrato é o planejamento até o checkout de ingresso gravar cada venda.",
    resumo: {
      vendidos_mes: vendidosMes,
      capacidade_mes: diasMes * maxDia,
      ocupacao_pct: Math.round((vendidosMes / (diasMes * maxDia)) * 1000) / 10,
      desconto_mes: soma(noMes, "desconto"),
      bruto_mes: soma(noMes, "bruto"),
      taxa_mes: soma(noMes, "taxa"),
      provisao: soma(linhas.filter((l) => l.situacao === "provisao"), "receber"),
      liquidado: soma(linhas.filter((l) => l.situacao === "liquidado"), "receber"),
      nacional_provisao: soma(linhas.filter((l) => l.meio === "nacional" && l.situacao === "provisao"), "receber"),
      internacional_provisao: soma(linhas.filter((l) => l.meio === "internacional" && l.situacao === "provisao"), "receber"),
      nacional_liquidado: soma(linhas.filter((l) => l.meio === "nacional" && l.situacao === "liquidado"), "receber"),
      internacional_liquidado: soma(linhas.filter((l) => l.meio === "internacional" && l.situacao === "liquidado"), "receber"),
      pix_liquidado: soma(linhas.filter((l) => (l.meio === "pix" || l.meio === "meia") && l.situacao === "liquidado"), "receber"),
    },
    lotacao,
    previsao: {
      media_dia: Math.round(media * 10) / 10,
      proximos_7: previsao,
      capacidade_7: maxDia * 7,
      folga: maxDia * 7 - previsao,
    },
    extrato: linhas.slice().reverse(),
  };
}

function pausaAtiva(venda, hojeIso) {
  const pausa = venda && venda.pausa && typeof venda.pausa === "object" ? venda.pausa : {};
  const inicio = String(pausa.inicio || "");
  const fim = String(pausa.fim || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(inicio) || !/^\d{4}-\d{2}-\d{2}$/.test(fim)) return null;
  if (hojeIso < inicio || hojeIso > fim) return null;
  return pausa;
}

function guiasAtivos(guides) {
  return (guides || [])
    .filter((g) => g.status === "active")
    .map((g) => ({ id: g.user_id, nome: g.full_name || g.name || "Guia" }));
}

function umaCasa(n) {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function pesoDe(atra) {
  const salvo = parseInt(atra && atra.experiencia && atra.experiencia.peso, 10);
  if (salvo === 1 || salvo === 2 || salvo === 3) return salvo;
  if (atra && atra.difficulty === "easy") return 1;
  if (atra && atra.difficulty === "hard") return 3;
  return 2;
}

function temporadaDe(iso) {
  const mes = parseInt(String(iso).slice(5, 7), 10);
  return mes >= 4 && mes <= 9 ? "xango" : "oxum";
}

const FECHAMENTO_HORA = 16;
const FECHAMENTO_MIN = 20;

function minutosInicio(saida) {
  const hora = String(saida.hora || saida.inicio || "08:00").slice(0, 5);
  const p = hora.split(":");
  return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0);
}

function somaDiaIso(iso, dias) {
  const p = String(iso).slice(0, 10).split("-").map(Number);
  const d = new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  d.setDate(d.getDate() + dias);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + m + "-" + day;
}

function dataContabil(saida) {
  const base = String(saida.data).slice(0, 10);
  const corte = FECHAMENTO_HORA * 60 + FECHAMENTO_MIN;
  return minutosInicio(saida) >= corte ? somaDiaIso(base, 1) : base;
}

function rankingJaFechou(dataIso, agora) {
  const p = String(dataIso).slice(0, 10).split("-").map(Number);
  const fecha = new Date(p[0], (p[1] || 1) - 1, p[2] || 1, FECHAMENTO_HORA, FECHAMENTO_MIN, 0, 0);
  return agora.getTime() >= fecha.getTime();
}

const SAIDAS_CONCLUIDAS = [
  { guia: "diego", data: "2026-10-02", hora: "08:00", site: 5, por_fora: 2, cidade: "sao-jorge", slugs: ["cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", "vale-lua-guia-chapada-veadeiros-sao-jorge"], status: "concluido" },
  { guia: "diego", data: "2026-10-09", hora: "08:00", site: 8, por_fora: 3, cidade: "alto-paraiso", slugs: ["cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros"], status: "concluido" },
  { guia: "martina", data: "2026-10-04", hora: "08:00", site: 4, por_fora: 1, cidade: "sao-jorge", slugs: ["cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", "vale-lua-guia-chapada-veadeiros-sao-jorge"], status: "concluido" },
  { guia: "gyovanna", data: "2026-10-05", hora: "08:00", site: 10, por_fora: 0, cidade: "sao-jorge", slugs: ["vale-lua-guia-chapada-veadeiros-sao-jorge"], status: "concluido" },
  { guia: "gyovanna", data: "2026-10-06", hora: "19:00", site: 20, por_fora: 5, cidade: "sao-jorge", slugs: ["cachoeira-segredo-guia-chapada-veadeiros-sao-jorge"], status: "cancelado" },
  { guia: "martina", data: "2026-06-18", hora: "08:00", site: 5, por_fora: 2, cidade: "alto-paraiso", slugs: ["cachoeira-segredo-guia-chapada-veadeiros-sao-jorge", "vale-lua-guia-chapada-veadeiros-sao-jorge"], status: "concluido" },
  { guia: "gyovanna", data: "2026-07-03", hora: "08:00", site: 4, por_fora: 1, cidade: "cavalcante", slugs: ["cachoeira-segredo-guia-chapada-veadeiros-sao-jorge"], status: "concluido" },
  { guia: "diego", data: "2026-08-15", hora: "08:00", site: 6, por_fora: 4, cidade: "alto-paraiso", slugs: ["cachoeira-almecegas-poco-sao-bento-guia-chapada-veadeiros"], status: "concluido" },
];

const GUIAS_RANKING = {
  diego: { id: 2, nome: "Diego Navi", foto: "/assets/img/imagens/guia-diego-navi.webp", cidade: "Alto Paraíso de Goiás", cidade_key: "alto-paraiso" },
  martina: { id: 24, nome: "Martina Motlova", foto: "/assets/img/imagens/guia-martina-motlova.webp", cidade: "São Jorge", cidade_key: "sao-jorge" },
  gyovanna: { id: 25, nome: "Gyovanna Torres", foto: "/assets/img/imagens/guia-gyovanna-torres.webp", cidade: "Cavalcante", cidade_key: "cavalcante" },
};

function pessoasGuiadas(saida) {
  const site = Math.max(0, Number(saida.site != null ? saida.site : saida.pessoas) || 0);
  const fora = Math.max(0, Number(saida.por_fora != null ? saida.por_fora : saida.preconfirmed_people) || 0);
  return site + fora;
}

function rankingGuias(attractions) {
  const porSlug = new Map((attractions || []).map((a) => [a.slug, a]));
  const porGuia = { xango: new Map(), oxum: new Map() };
  SAIDAS_CONCLUIDAS.forEach((saida) => {
    if (saida.status !== "concluido") return;
    const guia = GUIAS_RANKING[saida.guia];
    if (!guia) return;
    const dataRank = dataContabil(saida);
    if (!rankingJaFechou(dataRank, new Date())) return;
    const pessoas = pessoasGuiadas(saida);
    const temp = temporadaDe(dataRank);
    if (!porGuia[temp].has(guia.id)) {
      porGuia[temp].set(guia.id, { id: guia.id, nome: guia.nome, foto: guia.foto, cidade: guia.cidade || "", cidade_key: guia.cidade_key || "", pontos: 0, pessoas: 0, dias: new Map() });
    }
    const row = porGuia[temp].get(guia.id);
    if (!row.dias.has(dataRank)) row.dias.set(dataRank, { data: dataRank, grupos: 0, pessoas: 0, pontos: 0, atrativos: [], saidas: [] });
    const dia = row.dias.get(dataRank);
    dia.grupos += 1;
    dia.pessoas += pessoas;
    row.pessoas += pessoas;
    const atrativosSaida = [];
    saida.slugs.forEach((slug) => {
      const atra = porSlug.get(slug);
      const peso = pesoDe(atra);
      const pontos = pessoas * peso;
      dia.pontos += pontos;
      row.pontos += pontos;
      const item = {
        nome: (atra && atra.title_pt) || slug,
        slug,
        pessoas,
        peso,
        pontos,
      };
      dia.atrativos.push(item);
      atrativosSaida.push(item);
    });
    dia.saidas.push({ pessoas, cidade: saida.cidade || "", atrativos: atrativosSaida });
  });
  function fechar(mapa) {
    return Array.from(mapa.values()).map((row) => {
      const dias = Array.from(row.dias.values()).sort((a, b) => a.data.localeCompare(b.data)).map((dia) => ({
        data: dia.data,
        grupos: dia.grupos,
        pessoas: dia.pessoas,
        pontos: dia.pontos,
        media_grupo: umaCasa(dia.pessoas / dia.grupos),
        atrativos: dia.atrativos,
        saidas: dia.saidas,
      }));
      return {
        id: row.id,
        nome: row.nome,
        foto: row.foto,
        cidade: row.cidade || "",
        cidade_key: row.cidade_key || "",
        pontos: row.pontos,
        pessoas: row.pessoas,
        dias_guiados: dias.length,
        media_dia: umaCasa(row.pessoas / dias.length),
        dias,
      };
    }).sort((a, b) => b.pontos - a.pontos || b.pessoas - a.pessoas || a.nome.localeCompare(b.nome, "pt"))
      .map((guia, i) => Object.assign(guia, { lugar: i + 1 }));
  }
  const vistos = new Set();
  SAIDAS_CONCLUIDAS.forEach((saida) => {
    if (saida.status !== "concluido") return;
    saida.slugs.forEach((slug) => vistos.add(slug));
  });
  const atrativos = (attractions || [])
    .filter((a) => a && a.slug && vistos.has(a.slug))
    .map((a) => {
      const prem = (vendaDe(a).premiacao) || {};
      function lado(chave) {
        const o = prem[chave] && typeof prem[chave] === "object" ? prem[chave] : {};
        return {
          primeiro: String(o.primeiro || ""),
          segundo: String(o.segundo || ""),
          terceiro: String(o.terceiro || ""),
        };
      }
      return {
        id: a.id,
        slug: a.slug,
        nome: a.title_pt,
        peso: pesoDe(a),
        premiacao: { xango: lado("xango"), oxum: lado("oxum") },
      };
    })
    .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt"));
  return {
    regra: "Pontos do dia = pessoas de cada atrativo × peso (1 fácil, 2 moderado, 3 difícil). Entram as inscrições pelo site e as pessoas guiadas por fora. No mesmo grupo, com duas ou mais atrações, as pessoas contam em cada peso, mas o total de pessoas soma uma vez só. Esse total é o desempate. Cancelado não entra. A cidade conta o passeio que saiu de lá. O ranking atualiza todo dia às 16h20, depois do pagamento e da conclusão. Passeio que começa às 16h20 ou mais tarde entra no dia seguinte, pela hora de início do check-in.",
    cidades: [
      { key: "chapada", nome: "Chapada dos Veadeiros" },
      { key: "alto-paraiso", nome: "Alto Paraíso" },
      { key: "sao-jorge", nome: "São Jorge" },
      { key: "cavalcante", nome: "Cavalcante" },
    ],
    atrativos,
    xango: { nome: "Ranking Fogo", periodo: "Seca · 1º de abril a 30 de setembro", guias: fechar(porGuia.xango) },
    oxum: { nome: "Ranking Água", periodo: "Águas · 1º de outubro a 31 de março", guias: fechar(porGuia.oxum) },
  };
}

export function createAnfitriaoApi(deps) {
  const attractions = () => deps.getAttractions();
  const guides = () => deps.getGuides();
  const user = () => deps.getUser();

  function resolverHost(url) {
    const id = parseInt(url.searchParams.get("id") || "0", 10);
    if (id) return hostPorId(id);
    const as = String(url.searchParams.get("as") || "");
    if (as && deps.users[as] && deps.users[as].role === "host") {
      return hostPorEmail(deps.users[as].email);
    }
    return hostPorEmail(user() && user().email);
  }

  function pacote() {
    return { anfitrioes, whatsapp };
  }

  function handle(urlPath, req, res) {
    const rotas = ["/api/admin/anfitrioes.php", "/api/admin/ranking.php", "/api/anfitriao/financeiro.php", "/api/anfitriao/ranking.php", "/api/anfitriao/venda.php", "/api/guides/ranking.php", "/api/public/experiencia-venda.php"];
    if (!rotas.includes(urlPath)) return false;
    const url = new URL(req.url, "http://localhost");
    const send = (payload, status = 200) => {
      res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(payload));
    };

    if (req.method === "GET" && urlPath === "/api/admin/ranking.php") {
      send({ ok: true, data: rankingGuias(attractions()) });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/guides/ranking.php") {
      const as = String(url.searchParams.get("as") || "");
      const atual = (as && deps.users[as]) || user() || {};
      const data = rankingGuias(attractions());
      data.guia_id = atual.role === "guide" ? atual.id : 0;
      data.guia_nome = atual.name || "";
      send({ ok: true, data });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/anfitriao/ranking.php") {
      const host = resolverHost(url);
      if (!host || host.status !== "active") {
        send({ ok: true, data: { aguardando: true, anfitriao: host } });
        return true;
      }
      const atra = atrativoDe(host, attractions());
      send({
        ok: true,
        data: {
          atrativo: atra ? { id: atra.id, slug: atra.slug, nome: atra.title_pt } : null,
          ranking: rankingGuias(attractions()),
        },
      });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/admin/anfitrioes.php") {
      send({ ok: true, data: pacote() });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/anfitriao/financeiro.php") {
      const host = resolverHost(url);
      if (!host) {
        send({ ok: false, error: "Anfitrião não encontrado." }, 404);
        return true;
      }
      if (host.status !== "active") {
        send({ ok: true, data: { aguardando: true, anfitriao: host } });
        return true;
      }
      send({ ok: true, data: financeiroDe(host, attractions()) });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/anfitriao/venda.php") {
      const host = resolverHost(url);
      if (!host || host.status !== "active") {
        send({ ok: true, data: { aguardando: true, anfitriao: host } });
        return true;
      }
      const atra = atrativoDe(host, attractions());
      send({
        ok: true,
        data: {
          anfitriao: host,
          atrativo: atra ? { id: atra.id, title_pt: atra.title_pt, slug: atra.slug, tem_passeio: atra.tem_passeio !== false } : null,
          venda: vendaDe(atra),
          guias: guiasAtivos(guides()),
        },
      });
      return true;
    }
    if (req.method === "GET" && urlPath === "/api/public/experiencia-venda.php") {
      const slug = String(url.searchParams.get("slug") || "");
      const atra = attractions().find((a) => a.slug === slug) || null;
      const venda = vendaDe(atra);
      const pausa = pausaAtiva(venda, isoData(new Date()));
      send({
        ok: true,
        data: {
          pausa_ativa: !!pausa,
          modo: (pausa && pausa.modo) || "ocultar",
          mensagem: (pausa && pausa.mensagem) || "",
          sem_passeio: !!(atra && atra.tem_passeio === false) || !!venda.sem_passeio,
          guias_bloqueados: Array.isArray(venda.guias_bloqueados) ? venda.guias_bloqueados : [],
        },
      });
      return true;
    }

    readBody(req).then((body) => {
      if (urlPath === "/api/admin/anfitrioes.php" && req.method === "POST") {
        const nome = String(body.nome || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const telefone = String(body.telefone || "").replace(/\D/g, "");
        const experiencia = String(body.experiencia || "").trim();
        if (!nome || !email || telefone.length < 10) {
          send({ ok: false, error: "Nome, e-mail e telefone com DDD são obrigatórios." }, 400);
          return;
        }
        if (anfitrioes.some((h) => h.email === email)) {
          send({ ok: false, error: "Já existe um anfitrião com este e-mail." }, 400);
          return;
        }
        const host = {
          id: anfitrioes.reduce((m, h) => Math.max(m, h.id), 0) + 1,
          nome,
          email,
          telefone,
          experiencia: experiencia || "A definir",
          status: "pending",
          slug: "",
          plano: "sem_custo",
          max_dia: 40,
          preco_cents: 0,
        };
        anfitrioes.unshift(host);
        avisar("admin", "Novo anfitrião aguardando aprovação: " + nome + " · " + email + " · " + telefone + " · " + host.experiencia + ". O financeiro fica fechado até você aprovar.");
        send({ ok: true, data: pacote() });
        return;
      }
      if (urlPath === "/api/admin/anfitrioes.php" && req.method === "PUT") {
        const host = anfitrioes.find((h) => h.id === parseInt(body.id, 10));
        if (!host) {
          send({ ok: false, error: "Anfitrião não encontrado." }, 404);
          return;
        }
        if (body.action === "aprovar") {
          host.status = "active";
          Object.values(deps.users).forEach((conta) => {
            if (conta && conta.email === host.email) conta.status = "active";
          });
          avisar(host.telefone, host.nome + ", seu cadastro de anfitrião foi aprovado. O financeiro de ingressos já está liberado.");
        } else if (body.action === "recusar") {
          host.status = "rejected";
          Object.values(deps.users).forEach((conta) => {
            if (conta && conta.email === host.email) conta.status = "rejected";
          });
          avisar(host.telefone, host.nome + ", seu cadastro de anfitrião não foi aprovado desta vez.");
        } else {
          send({ ok: false, error: "Ação inválida." }, 400);
          return;
        }
        send({ ok: true, data: pacote() });
        return;
      }
      if (urlPath === "/api/anfitriao/venda.php" && req.method === "PUT") {
        const host = resolverHost(url);
        if (!host || host.status !== "active") {
          send({ ok: false, error: "Aguarde a aprovação do admin para editar a venda." }, 403);
          return;
        }
        const atra = atrativoDe(host, attractions());
        if (!atra) {
          send({ ok: false, error: "Experiência do anfitrião não encontrada." }, 404);
          return;
        }
        const venda = body.venda && typeof body.venda === "object" ? body.venda : {};
        const maxDia = Math.max(0, parseInt(venda.max_dia, 10) || 0);
        if (maxDia > 0 && maxDia < 1) {
          send({ ok: false, error: "O máximo de ingressos por dia precisa ser pelo menos 1." }, 400);
          return;
        }
        if (maxDia > 0) {
          venda.max_dia = maxDia;
          host.max_dia = maxDia;
        }
        atra.experiencia = Object.assign({}, atra.experiencia || {}, { venda });
        if (Object.prototype.hasOwnProperty.call(body, "tem_passeio")) atra.tem_passeio = body.tem_passeio !== false && body.tem_passeio !== 0;
        send({ ok: true, data: { venda: vendaDe(atra), tem_passeio: atra.tem_passeio !== false } });
        return;
      }
      send({ ok: false, error: "Método não permitido" }, 405);
    }).catch(() => send({ ok: false, error: "JSON inválido" }, 400));
    return true;
  }

  function recusaExcursao(body) {
    const ids = [];
    if (Array.isArray(body.attraction_ids)) body.attraction_ids.forEach((id) => ids.push(parseInt(id, 10)));
    if (body.attraction_id) ids.push(parseInt(body.attraction_id, 10));
    const guideId = parseInt(body.guide_user_id || body.guia_id || "0", 10) || 0;
    const data = String(body.date_iso || "").slice(0, 10);
    for (const id of ids) {
      if (!id) continue;
      const atra = attractions().find((a) => a.id === id);
      if (!atra) continue;
      const venda = vendaDe(atra);
      if (atra.tem_passeio === false || venda.sem_passeio) {
        return (atra.title_pt || "Este atrativo") + " está fora da venda de passeio.";
      }
      if (data && pausaAtiva(venda, data)) {
        return (atra.title_pt || "Este atrativo") + " está pausado para venda de passeio neste período.";
      }
      const bloqueados = Array.isArray(venda.guias_bloqueados) ? venda.guias_bloqueados : [];
      if (guideId && bloqueados.some((g) => parseInt(g.id, 10) === guideId)) {
        return "Este guia está bloqueado para vender este passeio no site.";
      }
    }
    return null;
  }

  return { handle, recusaExcursao };
}
