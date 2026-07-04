/**
 * Páginas da Revista em PT que espelham o template gcv-post do React
 * (ContratarGuiaArtigo + ArtigoMelhorEpoca).
 */

export const PREMIUM_REVISTA_PT_SLUGS = new Set([
  "contratar-guia-local-chapada-veadeiros",
  "melhor-epoca-visitar-chapada-dos-veadeiros",
]);

const ARTICLE_PUBLISHED_ISO = "2026-05-13T12:00:00-03:00";
const SITE_NAME = "Guia Chapada Veadeiros";

const INSTAGRAM_URL = "https://www.instagram.com/guiachapadaveadeiros";

function absImg(siteOrigin, rel) {
  const r = String(rel || "").replace(/^\//, "");
  return `${siteOrigin}/assets/img/${r}`;
}

function pageCanonical(siteOrigin, locale, pathKey) {
  const noExt = pathKey.replace(/\.html$/i, "");
  const prefix = locale === "pt" ? "" : `/${locale}`;
  return `${siteOrigin}${`${prefix}/${noExt}`.replace(/\/+/g, "/")}`;
}

function bc(h, toPathKey) {
  return h.relBetweenSync(h.outRelPath(h.locale, h.pathKey), h.outRelPath(h.locale, toPathKey));
}

const ICO_FB = `<svg class="gcv-post-share__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.459h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.989C18.343 21.129 22 16.99 22 12z"/></svg>`;

const ICO_WA = `<svg class="gcv-post-share__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.123 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.883 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

const ICO_IG = `<svg class="gcv-post-share__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;

const ICO_EM = `<svg class="gcv-post-share__ico" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`;

function shareBar(h, pageUrl, shareTitle, placement) {
  const { esc } = h;
  const encPage = encodeURIComponent(pageUrl);
  const waPrefill = encodeURIComponent(`${shareTitle} ${pageUrl}`.trim());
  const subject = encodeURIComponent(shareTitle.slice(0, 120));
  const body = encodeURIComponent(`${shareTitle}\n\n${pageUrl}`);
  const placementClass = placement === "afterHero" ? "gcv-post-share--after-hero" : "gcv-post-share--footer";
  return `<aside class="gcv-post-share ${placementClass}" aria-label="Compartilhar esta matéria">
      <span class="lbl">Compartilhe:</span>
      <a class="fb" href="https://www.facebook.com/sharer.php?u=${encPage}" target="_blank" rel="noopener noreferrer">${ICO_FB} Facebook</a>
      <a class="wa" href="https://api.whatsapp.com/send?text=${waPrefill}" target="_blank" rel="noopener noreferrer">${ICO_WA} WhatsApp</a>
      <a class="ig" href="${esc(INSTAGRAM_URL)}" target="_blank" rel="noopener noreferrer">${ICO_IG} Instagram</a>
      <a class="em" href="mailto:?subject=${subject}&body=${body}">${ICO_EM} Email</a>
    </aside>`;
}

const AUTHOR_PHOTO_IMG = "imagens/guia-diego-navi.png";
const AUTHOR_PHOTO_ALT_PT =
  "Diego Navi, condutor de ecoturismo credenciado Cadastur na Chapada dos Veadeiros";

function authorCard(h, bioHtml, signoffHtml) {
  const { ap, picture } = h;
  return `<div class="gcv-post-autor">
      <div class="gcv-post-autor-top">
      <div class="gcv-post-autor-avatar">${picture(ap, AUTHOR_PHOTO_IMG, AUTHOR_PHOTO_ALT_PT, 276, 368)}</div>
      <div class="gcv-post-autor-bio">${bioHtml}</div>
      </div>
      <div class="gcv-post-autor-signoff">${signoffHtml}</div>
    </div>`;
}

const AUTHOR_SIGNOFF = `<p class="gcv-post-autor-name">Diego Navi Marques Carvalho</p>
      <p class="gcv-post-autor-role">Guia local e Fundador da Guia Chapada Veadeiros</p>`;

const AUTHOR_BIO = `<p>
        Brasileiro, nascido no Rio de Janeiro em 1982, naturalizado italiano, pai, analista de sistemas formado pela
        PUC-Rio, <strong>Diego Navi</strong> trocou o escritório pelo cerrado e fundou a <strong>Guia Chapada Veadeiros</strong> em 2017. Fluente
        em inglês e espanhol, conduziu dezenas de grupos com segurança pela Chapada dos Veadeiros em todas as
        épocas do ano e conhece cada cachoeira, cada trilha e cada cantinho deste portal da Terra desde 2009.
      </p>`;

/** --- Contratar guia --- */
const ARTICLE_IMAGES = "uploads/revista/contratar-guia-artigo";
const C_IMGS = {
  hero: `${ARTICLE_IMAGES}/hero-mirante-grupo-guia-local-chapada-veadeiros.png`,
  fotoTuristaTrianguloCouros: `${ARTICLE_IMAGES}/diego-navi-guia-relaxando-rochas-poca-reflexo-ceu-chapada-veadeiros.jpg`,
  foto4: `${ARTICLE_IMAGES}/cataratas-couros-selfie-guia-turistas-chapada-veadeiros.png`,
  foto5: `${ARTICLE_IMAGES}/mirante-plataforma-grupo-familias-chapada-veadeiros.png`,
  trioA: `${ARTICLE_IMAGES}/selfie-rio-cachoeira-fundo-guia-chapada-veadeiros.png`,
  trioB: `${ARTICLE_IMAGES}/grupo-selfie-cachoeira-multinivel-chapada-veadeiros.png`,
  trioC: `${ARTICLE_IMAGES}/grupo-cachoeira-monumental-guia-chapada-veadeiros.png`,
  foto7: `${ARTICLE_IMAGES}/familia-piscina-natural-rochas-guia-chapada-veadeiros.png`,
};

const WHATSAPP_CONTRATAR =
  "https://api.whatsapp.com/send?phone=5562982506891&text=Quero%20contratar%20um%20guia%20para%20a%20Chapada%20dos%20Veadeiros";

const CONTRATAR_SEO_TITLE = "Por que contratar um guia de turismo na natureza? | Chapada dos Veadeiros";
const CONTRATAR_DESC =
  "Segurança, aproveitamento máximo, fotos incríveis e novas amizades: descubra por que contratar um guia de turismo credenciado na Chapada dos Veadeiros, com acesso seguro a piscinas naturais e cenários únicos só o condutor local conhece bem.";
const CONTRATAR_OG_DESC =
  "Segurança, fotos marcantes e roteiro completo na Chapada dos Veadeiros, incluindo piscinas naturais entre rochas. Um credenciado transforma qualquer passeio.";
const CONTRATAR_KEYWORDS =
  "contratar guia chapada dos veadeiros, guia de turismo chapada veadeiros, condutor de visitantes chapada, por que contratar guia trilhas, passeios guiados alto paraíso, guia local chapada veadeiros, Diego Navi guia chapada, contratar guia natureza, piscina natural chapada dos veadeiros, Diego Navi Chapada dos Veadeiros, reflexo do céu poça natural cerrado, guia local fotos Chapada";

const ALT_FOTO2 =
  "Grupo em selfie em mirante de madeira sobre vale verde com cachoeiras na Chapada dos Veadeiros — passeio guiado com guia Cadastur";

function buildContratar(h) {
  const { ap, esc, picture, pictureHero, formatPublicationDatePt, safeJsonLd } = h;
  const canon = pageCanonical(h.SITE_ORIGIN, h.locale, h.pathKey);
  const shareTitle = "Por que contratar um guia na Chapada dos Veadeiros?";

  const articleRels = [
    C_IMGS.hero,
    C_IMGS.fotoTuristaTrianguloCouros,
    C_IMGS.foto4,
    C_IMGS.foto5,
    C_IMGS.trioA,
    C_IMGS.trioB,
    C_IMGS.trioC,
  ];
  const articleImagesAbsolute = articleRels.map((r) => absImg(h.SITE_ORIGIN, r));

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Por que é tão importante contratar um guia em passeios na natureza?",
    description:
      "Por que um guia credenciado na Chapada dos Veadeiros: segurança, fotos marcantes em piscinas naturais e roteiros que só o condutor local conhece bem.",
    image: articleImagesAbsolute,
    author: {
      "@type": "Person",
      name: "Diego Navi",
      url: `${h.SITE_ORIGIN}/`,
      jobTitle: "Analista de sistemas e condutor de ecoturismo credenciado (Cadastur)",
      image: absImg(h.SITE_ORIGIN, AUTHOR_PHOTO_IMG),
    },
    publisher: {
      "@type": "Organization",
      name: "Guia Chapada dos Veadeiros",
      logo: {
        "@type": "ImageObject",
        url: absImg(h.SITE_ORIGIN, "imagens/mapa.jpg"),
      },
    },
    datePublished: "2026-05-13",
    dateModified: "2026-05-13",
    mainEntityOfPage: { "@type": "WebPage", "@id": canon },
    keywords: [
      "contratar guia chapada dos veadeiros",
      "guia de turismo chapada veadeiros",
      "condutor de visitantes",
      "por que contratar guia trilhas",
      "passeios natureza chapada veadeiros",
      "guia local alto paraíso de goiás",
      "piscina natural chapada dos veadeiros",
      "Diego Navi Chapada dos Veadeiros",
      "reflexo do céu poça natural cerrado",
    ],
    inLanguage: "pt-BR",
  };

  const benefits = [
    { ico: "🛡️", titulo: "Segurança total", texto: "Primeiros socorros, resgate aquático e prevenção de acidentes em trilhas." },
    { ico: "📸", titulo: "Fotos incríveis", texto: "Ângulos privilegiados e registros que você não conseguiria sozinho." },
    { ico: "🌿", titulo: "100% de aproveitamento", texto: "Pontos secretos, mirantes exclusivos e nenhum atrativo desperdiçado." },
    { ico: "🧭", titulo: "Nunca se perder", texto: "Trilhas sem sinalização têm muitos caminhos errados. O guia conhece cada desvio." },
    { ico: "📚", titulo: "Conhecimento vivo", texto: "História, geologia, biodiversidade e cultura contadas por quem nasceu aqui." },
    { ico: "👨‍👩‍👧", titulo: "Foco em família", texto: "Ritmo adaptado, rotas seguras e atenção especial para crianças e idosos." },
    { ico: "🤝", titulo: "Novas amizades", texto: "Grupos compartilhados reúnem pessoas incríveis com a mesma paixão pela natureza." },
    { ico: "⚡", titulo: "Eficiência máxima", texto: "Sem perda de tempo, sem caminhos errados, sem decepções. Só o melhor." },
  ];

  const benefitCards = benefits
    .map(
      (b) => `<div class="gcv-post-benefit-card">
                  <span class="ico" aria-hidden="true">${b.ico}</span>
                  <h4>${esc(b.titulo)}</h4>
                  <p>${esc(b.texto)}</p>
                </div>`,
    )
    .join("\n            ");

  const extraHead = `    <meta name="keywords" content="${esc(CONTRATAR_KEYWORDS)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="900" />
    <meta property="og:image:alt" content="${esc(ALT_FOTO2)}" />
    <meta property="article:author" content="Diego Navi" />
    <meta property="article:published_time" content="2026-05-13T00:00:00-03:00" />
    <meta property="article:modified_time" content="2026-05-13T00:00:00-03:00" />
    <meta property="article:section" content="Dicas" />
    <meta property="article:tag" content="contratar guia chapada dos veadeiros" />
    <meta property="article:tag" content="guia de turismo" />
    <meta property="article:tag" content="Diego Navi guia Chapada dos Veadeiros" />
    <script type="application/ld+json">${safeJsonLd(jsonLdArticle)}</script>`;

  const homeHref = bc(h, "");
  const revistaHref = bc(h, "revista.html");

  const mainHtml = `<div class="gcv-post-page">
        <div class="gcv-post-shell">
          <article class="gcv-post-surface">
          <nav class="gcv-post-breadcrumb" aria-label="Caminho de navegação">
            <a href="${esc(homeHref)}">Home</a>
            <span class="sep">›</span>
            <a href="${esc(revistaHref)}">Revista</a>
            <span class="sep">›</span>
            <a href="${esc(revistaHref)}">Dicas</a>
            <span class="sep">›</span>
            <span>Por que contratar um guia?</span>
          </nav>

          <header class="gcv-post-hero">
            ${pictureHero(ap, C_IMGS.hero, ALT_FOTO2, 1200, 900)}
            <div class="gcv-post-hero-overlay">
              <a href="${esc(revistaHref)}" class="gcv-post-category">Dicas de viagem</a>
              <h1>Por que é tão importante contratar um guia em passeios na natureza?</h1>
            </div>
          </header>

          <div class="gcv-post-meta">
            <span class="autor">Diego Navi</span>
            <span class="dot">·</span>
            <time dateTime="2026-05-13">${esc(formatPublicationDatePt(ARTICLE_PUBLISHED_ISO))}</time>
            <span class="dot">·</span>
            <span>8 min de leitura</span>
            <span class="dot">·</span>
            <span class="tag">Contratar guia</span>
            <span class="tag">Segurança</span>
            <span class="tag">Chapada dos Veadeiros</span>
          </div>

          ${shareBar(h, canon, shareTitle, "afterHero")}

          <p class="gcv-post-lead">
            Contratar um guia de turismo não é um luxo. É a diferença entre um passeio seguro, rico em experiências e
            cheio de memórias inesquecíveis, e uma aventura que pode terminar mal. Neste artigo você vai entender todos
            os motivos pelos quais um condutor credenciado é indispensável em qualquer trilha ou passeio na natureza,
            especialmente na <strong>Chapada dos Veadeiros</strong>.
          </p>

          <div class="gcv-post-body">
            <p>
              A Chapada dos Veadeiros é um dos destinos de ecoturismo mais extraordinários do Brasil. Cachoeiras de
              águas cristalinas, trilhas no cerrado nativo, poços de cor esmeralda e formações rochosas com mais de um
              bilhão de anos. É também um ambiente selvagem, que exige respeito, preparo e, acima de tudo,
              <strong>conhecimento local</strong>.
            </p>
            <p>
              É aqui que entra o papel insubstituível do guia de turismo credenciado. Mais do que apontar o caminho, o
              condutor transforma cada passeio numa experiência completa: segura, emocionante, bem registrada em fotos e
              repleta de descobertas que você jamais faria sozinho.
            </p>

            <h2><span class="ico" aria-hidden="true">🛡️</span> Segurança: o benefício mais importante</h2>

            <p>
              A Chapada dos Veadeiros é linda, e exatamente por isso não deve ser subestimada. Trilhas sem sinalização,
              rios com variação de correnteza, animais peçonhentos como serpentes, aranhas e escorpiões, e o risco real de
              <strong>cabeça d'água</strong> (cheia repentina nos rios) são realidades que quem não conhece a região
              tende a ignorar.
            </p>
            <p>
              Os condutores de ecoturismo passam por um <strong>curso de 160 horas</strong> que inclui técnicas de
              primeiros socorros, resgate aquático e estágio presencial em cada atrativo. São treinados anualmente pelo
              Corpo de Bombeiros e atuam como salvavidas, com atenção redobrada quando há crianças, idosos ou
              iniciantes no grupo.
            </p>

            <div class="gcv-post-alert">
              <div class="gcv-post-alert-title">⚠️ Riscos reais de ir sem guia</div>
              <ul>
                <li><strong>Se perder nas trilhas</strong>: muitas sem sinalização adequada, especialmente fora do parque nacional</li>
                <li><strong>Encontro perigoso com animais</strong>: jararaca, cascavel, escorpiões, aranhas são comuns no cerrado, porém o mais perigoso é a onça</li>
                <li><strong>Acidentes em corredeiras e quedas</strong>: pedras lisas e correnteza traiçoeira sem o conhecimento do terreno</li>
                <li><strong>Cabeça d'água</strong>: enchentes repentinas, especialmente no período de chuvas</li>
                <li><strong>Emergência sem suporte</strong>: sem sinal de celular, sem kit de primeiros socorros e sem saber o que fazer</li>
                <li><strong>Risco ampliado para crianças e idosos</strong>: sem apoio especializado em terreno irregular e percursos longos</li>
                <li><strong>Correntezas ocultas e armadilhas invisíveis</strong>: alguns dos pontos mais bonitos da Chapada escondem correntes subaquâneas traiçoeiras que não se percebem olhando para a superfície.</li>
              </ul>
              <p>
                Em maio de 2026, uma criança foi atacada por uma onça-parda na região da Chapada ao voltar de uma
                cachoeira com a família — o animal estava em uma árvore e a vítima ficou ferida no rosto. O caso foi
                registrado pela imprensa; veja a
                <a
                  href="https://www.metropoles.com/distrito-federal/entorno/crianca-atacada-por-onca-na-chapada-dos-veadeiros-foi-ferida-no-rosto"
                  target="_blank"
                  rel="noopener noreferrer"
                  >reportagem completa no Metrópoles</a
                >.
              </p>
              <h3>O perigo real de encontrar uma onça na trilha</h3>
              <p>
                Uma criança de 8 anos foi atacada por uma onça-parda na Chapada dos Veadeiros em maio de 2026,
                enquanto voltava de uma cachoeira com a família. O animal, que estava numa árvore, saltou sobre ela e a
                feriu no rosto — ela precisará de cirurgia plástica. O caso é raro, mas serve de alerta: ao encontrar
                uma onça, nunca corra nem dê as costas, mantenha contato visual, pareça maior levantando os braços, faça
                barulho e segure crianças no colo. Evite trilhas isoladas no amanhecer e entardecer. O respeito ao
                habitat natural é essencial.
              </p>
            </div>

            <h2><span class="ico" aria-hidden="true">📸</span> Fotos que viram memórias para a vida toda</h2>

            <p>
              Cada atrativo da Chapada tem ângulos privilegiados que só quem conhece o local de cor sabe encontrar. O
              guia leva o grupo exatamente até esses pontos, e ainda registra os momentos com o olhar de quem já
              fotografou centenas de grupos naquele mesmo cenário.
            </p>
            <p>
              Sem guia, você fotografa o que enxerga. Com guia, você fotografa o que a Chapada realmente tem para
              mostrar. <strong>As fotos que você vai guardar para sempre são as que o guia torna possíveis.</strong>
            </p>

            <figure class="gcv-post-figure">
              ${picture(ap, C_IMGS.fotoTuristaTrianguloCouros, "Turista deitado sobre rochas ao lado de uma poça triangular que reflete o céu nas Cataratas dos Couros, Chapada dos Veadeiros", 1200, 1200)}
              <figcaption>Turista relaxando em local secreto nas Cataratas dos Couros</figcaption>
            </figure>

            <h2><span class="ico" aria-hidden="true">🌿</span> Aproveitamento de 100%: nenhum atrativo desperdiçado</h2>

            <p>
              Cada atrativo esconde lugares que não aparecem em nenhum mapa turístico comum: piscinas naturais
              escondidas, trilhas secundárias com pontos de vista inacreditáveis, horários certos para evitar multidões.
              <strong>O guia conhece todos esses segredos</strong> porque os vivencia diariamente.
            </p>

            <div class="gcv-post-highlight">
              <div class="lbl">Sabia disso?</div>
              <p>
                Grupos sem guia visitam em média apenas 40% dos pontos mais bonitos de cada atrativo. Com um condutor
                experiente, o aproveitamento chega a 100%, incluindo mirantes secretos, poços de banho e atalhos que a
                maioria dos turistas nunca descobre.
              </p>
            </div>

            <figure class="gcv-post-figure">
              ${picture(ap, C_IMGS.foto4, "Selfie de grupo com guia local às Cataratas dos Couros na Chapada dos Veadeiros, Alto Paraíso de Goiás", 1200, 900)}
              <figcaption>Cataratas dos Couros — uma das formações mais impressionantes da Chapada. Um guia local conhece cada detalhe dessa trilha e os melhores horários.</figcaption>
            </figure>

            <h2><span class="ico" aria-hidden="true">👨‍👩‍👧‍👦</span> Atenção especial para famílias, crianças e idosos</h2>

            <p>
              Trilhar com crianças pequenas ou com pessoas da terceira idade exige planejamento diferente: ritmo adaptado,
              paradas estratégicas, atenção constante ao nível de esforço e, principalmente, um olho sempre atento
              perto da água.
            </p>
            <p>
              <strong>O guia adapta o roteiro para cada perfil de grupo.</strong> Para famílias com crianças,
              priorizamos trilhas mais curtas com recompensas incríveis ao final. Para grupos de terceira idade,
              escolhemos percursos com sombra, boa estrutura e paradas confortáveis. Ninguém fica para trás.
            </p>

            <figure class="gcv-post-figure">
              ${picture(ap, C_IMGS.foto5, "Grupo multigeracional com guia em mirante de madeira sobre canyon e trecho de rio na Chapada dos Veadeiros", 1200, 900)}
              <figcaption>Parque Nacional e mirantes: o guia adapta o ritmo para cada perfil. Com famílias e grupos de terceira idade nas plataformas de observação, o cuidado é redobrado.</figcaption>
            </figure>

            <div class="gcv-post-img-strip">
              <figure class="gcv-post-figure">
                ${picture(ap, C_IMGS.trioA, "Guia e turistas em selfie à beira de rio com cachoeira ao fundo na Chapada dos Veadeiros", 900, 1200)}
                <figcaption>Guia e turistas em selfie à beira do rio, com cachoeira ao fundo na Chapada dos Veadeiros — registro espontâneo do passeio guiado.</figcaption>
              </figure>
              <figure class="gcv-post-figure">
                ${picture(ap, C_IMGS.trioB, "Grupo de turistas em selfie na base de cachoeira em degraus na Chapada dos Veadeiros com guia Cadastur", 1200, 900)}
                <figcaption>Grupo numeroso na base da queda d'água: com guia todos chegam juntos aos ângulos mais marcantes com segurança.</figcaption>
              </figure>
              <figure class="gcv-post-figure">
                ${picture(ap, C_IMGS.trioC, "Topo da Cachoeira Catedral no complexo Macaco Macacão na Chapada dos Veadeiros — roteiros guiados fora do eixo comercial", 1200, 900)}
                <figcaption>Passeios guiados com roteiros do lado B da Chapada que te levam a lugares fora do eixo comercial, sem aglomerações</figcaption>
              </figure>
            </div>

            <h2><span class="ico" aria-hidden="true">🤝</span> Novas amizades e experiências compartilhadas</h2>

            <p>
              Passeios em grupos compartilhados são uma das experiências mais ricas que a Chapada pode oferecer. Você
              chega como desconhecido e volta para casa com novos amigos, pessoas de diferentes cidades, histórias e
              perspectivas que se unem pela mesma paixão pela natureza.
            </p>
            <p>
              O guia é também o facilitador dessas conexões. Conhece cada membro do grupo pelo nome, cria um ambiente de
              confiança e transforma estranhos em companheiros de aventura.
              <strong>Muitas das amizades feitas nas trilhas duram para a vida toda.</strong>
            </p>

            <h2><span class="ico" aria-hidden="true">📚</span> Conhecimento local: história, biodiversidade e cultura</h2>

            <p>
              A formação do condutor de ecoturismo vai muito além do percurso físico. O guia conhece a história da
              região, a biodiversidade do cerrado, as lendas locais, inclusive aquelas sobre OVNIs avistados na
              Chapada, e as características geológicas únicas das rochas com mais de um bilhão de anos.
            </p>
            <p>
              Cada parada se transforma numa aula viva. Você aprende a identificar plantas medicinais do cerrado, entende
              por que a água das cachoeiras tem essa cor única e descobre por que a NASA considera esta região
              <strong>o lugar mais iluminado do mundo</strong>.
            </p>

            <h2><span class="ico" aria-hidden="true">❤️</span> O lado humano que faz toda a diferença</h2>

            <p>
              Conduzir grupos pela Chapada dos Veadeiros não é apenas um trabalho. É uma vocação. Cada passeio carrega
              uma história. Cada turista chega com uma expectativa e o guia tem o compromisso de superá-la.
            </p>

            <figure class="gcv-post-figure">
              ${picture(ap, C_IMGS.foto7, "Guia e família em poça natural entre rochas na Chapada dos Veadeiros — experiência humana do turismo com condutor local", 900, 1200)}
              <figcaption>Proximidade e confiança entre guia e grupo: o lado humano que diferencia um passeio com guia local na Chapada dos Veadeiros de um roteiro genérico.</figcaption>
            </figure>

            <p>
              Em um dia especial, Diego levou o filho para conhecer o trabalho do pai. Os turistas adoraram. Essa
              espontaneidade, essa humanidade, é exatamente o que diferencia um guia local credenciado de qualquer
              aplicativo de navegação ou roteiro impresso.
            </p>

            <h2><span class="ico" aria-hidden="true">✅</span> Resumo: tudo o que você ganha com um guia</h2>

            <div class="gcv-post-benefit-grid">
            ${benefitCards}
            </div>

            <h2><span class="ico" aria-hidden="true">⚖️</span> É obrigatório contratar um guia na Chapada?</h2>

            <p>
              Em alguns atrativos, sim. O Parque Nacional da Chapada dos Veadeiros exige guia para trilhas noturnas e
              para visitantes que chegam após as 13h, horário limite de entrada, a partir do qual há risco real de
              retorno fora do encerramento do parque. Proprietários de atrativos particulares também costumam exigir a
              presença de um condutor credenciado para garantir a segurança de seus visitantes.
            </p>
            <p>
              Nos demais atrativos, mesmo onde não é obrigatório, o guia é essencial. Alguns inclusive oferecem
              desconto na entrada para grupos acompanhados de guia local. Um fato permanece em qualquer caso: guia é
              sinônimo de segurança, e segurança não tem preço.
            </p>

            <div class="gcv-post-cta">
              <h3>Pronto para viver a Chapada do jeito certo?</h3>
              <p>
                Fale agora com a Guia Chapada Veadeiros e planeje seu passeio com segurança, aproveitamento máximo e fotos que você
                vai guardar para sempre.
              </p>
              <a href="${esc(WHATSAPP_CONTRATAR)}" class="gcv-post-cta-btn" target="_blank" rel="noopener noreferrer">💬 Falar no WhatsApp</a>
            </div>

            ${authorCard(h, AUTHOR_BIO, AUTHOR_SIGNOFF)}

            ${shareBar(h, canon, shareTitle, "footer")}
          </div>
          </article>
        </div>
      </div>`;

  return {
    fullTitle: `${CONTRATAR_SEO_TITLE} | ${SITE_NAME}`,
    desc: CONTRATAR_DESC,
    ogTitle: CONTRATAR_SEO_TITLE,
    ogDesc: CONTRATAR_OG_DESC,
    ogImageRel: C_IMGS.hero,
    extraHead,
    mainHtml,
  };
}

/** --- Melhor época --- */
const E_BASE = "uploads/revista/melhor-epoca";
const E_IMGS = {
  hero: `${E_BASE}/guia-diego-navi-palipalan-via-lactea-chapada-veadeiros.png`,
  f2: `${E_BASE}/poco-sol-cachoeira-loquinhas-chapada-veadeiros-periodo-chuva.jpg`,
  f3: `${E_BASE}/palipalan-chuveirinho-cerrado-chapada-veadeiros-floracao.jpg`,
  f4: `${E_BASE}/cachoeira-cordovil-poco-esmeralda-chapada-veadeiros-seca.jpg`,
  f5: `${E_BASE}/cachoeira-segredo-sao-jorge-chapada-veadeiros-seca-cristalina.jpg`,
  f6: `${E_BASE}/cachoeira-segredo-sao-jorge-chapada-veadeiros-chuva-vazao-maxima.jpg`,
  f7: `${E_BASE}/cachoeira-santa-barbara-cavalcante-chapada-veadeiros.jpg`,
  f8: `${E_BASE}/cachoeira-segredo-poco-verde-esmeralda-sao-jorge-chapada.jpg`,
};

const WA_EPOCA =
  "https://api.whatsapp.com/send?phone=5562982506891&text=Quero%20planejar%20minha%20visita%20%C3%A0%20Chapada%20dos%20Veadeiros";

const EPOCA_SEO_TITLE = "Melhor época para visitar a Chapada dos Veadeiros: guia mês a mês";
const EPOCA_DESC =
  "Descubra a melhor época para visitar a Chapada dos Veadeiros: período de chuvas x seca, melhores meses, floração do cerrado (chuveirinhos), temperatura da água, cachoeiras sazonais e dicas de segurança.";
const EPOCA_OG_TITLE = "Melhor época para visitar a Chapada dos Veadeiros: guia mês a mês";
const EPOCA_OG_DESC =
  "Período de chuvas ou seca? Chuveirinhos, temperatura da água e cachoeiras sazonais para planejar sua visita perfeita à Chapada dos Veadeiros.";
const EPOCA_KEYWORDS =
  "melhor época para visitar chapada dos veadeiros, melhor mês chapada dos veadeiros, quando visitar chapada dos veadeiros, período de chuvas chapada veadeiros, período de seca chapada veadeiros, clima chapada dos veadeiros, quando ir chapada veadeiros, chapada veadeiros qual época do ano, chuveirinho cerrado chapada, palipalan chapada veadeiros, floração cerrado chapada, temperatura água chapada veadeiros, cachoeiras sazonais chapada veadeiros, invernada chapada veadeiros";

const MESES = [
  { mes: "Janeiro", ico: "🌧️", badge: "rain", badgeLabel: "Chuva", stars: 4, texto: "Calor intenso, chuvas diárias. Rios no volume máximo. Vegetação exuberante." },
  { mes: "Fevereiro", ico: "🌧️", badge: "rain", badgeLabel: "Chuva", stars: 3, texto: "Chuvas torrentiais mais frequentes. Invernadas possíveis assim como veranicos. Clima imprevisível." },
  { mes: "Março", ico: "🌦️", badge: "rain", badgeLabel: "Chuva", stars: 4, texto: "Parecido com Fevereiro. Rios ainda cheios. Início do fim da estação úmida. Temperatura mais amena." },
  { mes: "Abril", ico: "🌤️", badge: "transition", badgeLabel: "Transição", stars: 5, texto: "Rios cheios, chuveirinhos surgindo, pôr do sol com arco íris alaranjados." },
  { mes: "Maio", ico: "⭐", badge: "best", badgeLabel: "Melhor mês", stars: 5, texto: "Volume ideal, água não tão fria, chuveirinhos, céu estrelado, baixa temporada." },
  { mes: "Junho", ico: "☀️", badge: "dry", badgeLabel: "Seca", stars: 5, texto: "Inverno seco, noites frias, sol constante, clima estável." },
  { mes: "Julho", ico: "🎉", badge: "high", badgeLabel: "Alta temp.", stars: 4, texto: "Festas, eventos culturais, Encontro de Culturas. Mesmo clima de junho." },
  { mes: "Agosto", ico: "🔥", badge: "intense-dry", badgeLabel: "Seca intensa", stars: 4, texto: "Piscinas cristalinas e temperatura da água amena. Calor extremo e poeira; atenção para queimadas e cachoeiras sazonais secas." },
  { mes: "Setembro", ico: "🔥", badge: "intense-dry", badgeLabel: "Seca intensa", stars: 4, texto: "Similar a agosto: piscinas cristalinas e temperatura da água amena; algumas cachoeiras sazonais sem água." },
  { mes: "Outubro", ico: "🌦️", badge: "transition", badgeLabel: "Transição", stars: 4, texto: "Início das chuvas. Rios voltam a encher. Vegetação renascendo." },
  { mes: "Novembro", ico: "🌧️", badge: "rain", badgeLabel: "Chuva", stars: 3, texto: "Chuvas torrencias setorizadas, vazão aumentando progressivamente." },
  { mes: "Dezembro", ico: "🌧️", badge: "rain", badgeLabel: "Chuva", stars: 4, texto: "Verão úmido. Fluxo turístico aumenta. Paisagem exuberante." },
];

const FAQS = [
  { q: "Posso visitar a Chapada dos Veadeiros em qualquer época do ano?", a: "Sim. O melhor dia para conhecer a Chapada é aquele em que você pode vir. Cada período tem suas belezas e particularidades. Um guia local experiente adapta o roteiro para aproveitar 100% da época em que você está visitando." },
  { q: "Posso visitar no verão (dezembro/janeiro)?", a: "Sim! O verão úmido tem charme único: verde exuberante, cachoeiras poderosas e clima agradável. Redobre a atenção com chuvas e seja criterioso ao contratar um guia credenciado para atrativos com acesso a rios." },
  { q: "Qual a temperatura da água das cachoeiras na seca?", a: "No período de seca, especialmente em junho e julho, a água pode estar bem fria, entre 16°C e 20°C em alguns pontos. Em agosto e setembro tende a esquentar um pouco com o calor intenso do dia." },
  { q: "Quais cachoeiras podem estar secas em agosto e setembro?", a: "A Cachoeira Cordovil (Poço Esmeralda) é um exemplo que pode secar nesse período. Por isso é essencial consultar um guia local antes de montar o roteiro. Ele saberá o estado atual de cada atrativo." },
  { q: "Quando florescem os chuveirinhos do cerrado?", a: "O Paepalanthus speciosus (chuveirinho) floresce entre abril e julho, com pico em maio. É uma das experiências mais únicas e fotogênicas da Chapada dos Veadeiros." },
  { q: "Preciso de carro 4x4 no período de chuvas?", a: "Para alguns atrativos fora das estradas principais, sim. Uma alternativa é contratar o translado com o guia, que já inclui veículo adequado para as condições da estrada na época." },
];

function buildEpoca(h) {
  const { ap, esc, picture, pictureHero, formatPublicationDatePt, safeJsonLd } = h;
  const canon = pageCanonical(h.SITE_ORIGIN, h.locale, h.pathKey);
  const shareTitle = "Melhor época para visitar a Chapada dos Veadeiros: guia completo mês a mês";

  const articleImagesAbsolute = Object.values(E_IMGS).map((p) => absImg(h.SITE_ORIGIN, p));

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Melhor época para visitar a Chapada dos Veadeiros: guia completo mês a mês",
    description: EPOCA_DESC,
    image: articleImagesAbsolute,
    author: {
      "@type": "Person",
      name: "Diego Navi",
      jobTitle: "Analista de sistemas e condutor de ecoturismo credenciado (Cadastur)",
      image: absImg(h.SITE_ORIGIN, AUTHOR_PHOTO_IMG),
    },
    publisher: {
      "@type": "Organization",
      name: "Guia Chapada Veadeiros",
      logo: {
        "@type": "ImageObject",
        url: "https://www.guiachapadaveadeiros.com/wp-content/uploads/2024/05/Logo-Guia-Chapada-Veadeiros-2024.jpg",
      },
    },
    datePublished: "2026-05-13",
    dateModified: "2026-05-13",
    mainEntityOfPage: { "@type": "WebPage", "@id": canon },
    keywords: ["melhor época chapada dos veadeiros", "quando visitar chapada dos veadeiros", "período de chuvas seca chapada", "chuveirinho cerrado chapada", "palipalan chapada veadeiros"],
  };

  const jsonLdFaq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const tableRows = MESES.map(
    (m) => `<tr>
                      <td>${m.ico} ${esc(m.mes)}</td>
                      <td><span class="gcv-post-period-badge gcv-post-period-badge--${esc(m.badge)}">${esc(m.badgeLabel)}</span></td>
                      <td style="white-space:nowrap">${"⭐".repeat(m.stars)}</td>
                      <td>${esc(m.texto)}</td>
                    </tr>`,
  ).join("\n                  ");

  const faqBlocks = FAQS.map(
    (f) => `<div class="gcv-post-faq-item">
                <p class="faq-q">${esc(f.q)}</p>
                <p class="faq-a">${esc(f.a)}</p>
              </div>`,
  ).join("\n            ");

  const maioBenefits = [
    { ico: "💧", titulo: "Água na temperatura ideal", texto: "Rios com volume seguro e temperatura ainda não tão fria quanto no inverno pleno." },
    { ico: "🌸", titulo: "Chuveirinhos em plena floração", texto: "Os campos rupestres cobertos de Paepalanthus: espetáculo único no mundo." },
    { ico: "🌌", titulo: "Céu estrelado perfeito", texto: "Noites sem nuvens. A Via Láctea visível com clareza impressionante." },
    { ico: "🌈", titulo: "Pôr do sol com arco íris", texto: "Umidade residual cria arco íris dourados em toda região ao entardecer." },
    { ico: "👥", titulo: "Baixa temporada", texto: "Sem multidões, sem filas, preços acessíveis. Mais atenção do guia ao seu grupo." },
    { ico: "✅", titulo: "100% dos atrativos acessíveis", texto: "Volume ideal: atrativos de chuva E de seca funcionando simultaneamente." },
  ]
    .map(
      (b) => `<div class="gcv-post-benefit-card">
                  <span class="ico">${b.ico}</span>
                  <h4>${esc(b.titulo)}</h4>
                  <p>${esc(b.texto)}</p>
                </div>`,
    )
    .join("\n              ");

  const extraHead = `    <meta name="keywords" content="${esc(EPOCA_KEYWORDS)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="800" />
    <meta property="og:image:alt" content="${esc("Guia Diego Navi entre chuveirinhos do cerrado sob a Via Láctea na Chapada dos Veadeiros")}" />
    <meta property="article:author" content="Diego Navi" />
    <meta property="article:published_time" content="2026-05-13T00:00:00-03:00" />
    <meta property="article:modified_time" content="2026-05-13T00:00:00-03:00" />
    <meta property="article:section" content="Dicas" />
    <meta property="article:tag" content="melhor época chapada dos veadeiros" />
    <meta property="article:tag" content="quando visitar chapada veadeiros" />
    <meta property="article:tag" content="período de chuvas seca chapada" />
    <script type="application/ld+json">${safeJsonLd(jsonLdArticle)}</script>
    <script type="application/ld+json">${safeJsonLd(jsonLdFaq)}</script>`;

  const homeHref = bc(h, "");
  const revistaHref = bc(h, "revista.html");

  const mainHtml = `<div class="gcv-post-page">
        <div class="gcv-post-shell">
          <article class="gcv-post-surface">
          <nav class="gcv-post-breadcrumb" aria-label="Caminho de navegação">
            <a href="${esc(homeHref)}">Home</a>
            <span class="sep">›</span>
            <a href="${esc(revistaHref)}">Revista</a>
            <span class="sep">›</span>
            <a href="${esc(revistaHref)}">Dicas</a>
            <span class="sep">›</span>
            <span>Melhor Época para Visitar a Chapada</span>
          </nav>

          <header class="gcv-post-hero">
            ${pictureHero(
              ap,
              E_IMGS.hero,
              "Diego Navi em trilha noturna entre chuveirinhos do cerrado (Paepalanthus) e a Via Láctea na Chapada dos Veadeiros, foto de Márcio Cabral",
              1200,
              800,
            )}
            <div class="gcv-post-hero-overlay">
              <a href="${esc(revistaHref)}" class="gcv-post-category">Planejamento de Viagem</a>
              <h1>Melhor época para visitar a Chapada dos Veadeiros: guia completo mês a mês</h1>
            </div>
          </header>

          <div class="gcv-post-meta">
            <span class="autor">Diego Navi</span>
            <span class="dot">·</span>
            <time dateTime="2026-05-13">${esc(formatPublicationDatePt(ARTICLE_PUBLISHED_ISO))}</time>
            <span class="dot">·</span>
            <span>10 min de leitura</span>
            <span class="dot">·</span>
            <span class="tag">Melhor Época</span>
            <span class="tag">Planejamento</span>
            <span class="tag">Clima</span>
          </div>

          ${shareBar(h, canon, shareTitle, "afterHero")}

          <p class="gcv-post-lead">
            Essa é a pergunta que mais recebo antes de cada viagem: <strong>“Qual a melhor época para conhecer a Chapada dos Veadeiros?”</strong> A resposta honesta é que cada período tem sua própria
            magia; mas sim, existem meses que se destacam. Aqui você vai entender as diferenças entre o período de chuvas e o de seca, o que acontece em cada mês do ano, e qual a melhor época para o
            <em>seu</em> perfil de viagem.
          </p>

          <div class="gcv-post-body">
            <h2><span class="ico">🌍</span> O cerrado tem duas estações: chuva e seca</h2>

            <p>
              Diferente de outros biomas, o cerrado da Chapada dos Veadeiros não segue as quatro estações do calendário convencional. Aqui o que define tudo são
              <strong>dois grandes períodos: o das chuvas e o da seca</strong>, com dois meses de transição em cada extremo que pertencem aos dois mundos ao mesmo tempo.
            </p>

            <div class="gcv-post-period-grid">
              <div class="gcv-post-period-card gcv-post-period-card--rain">
                <span class="card-ico">🌧️</span>
                <strong>Período de Chuvas de outubro a abril</strong>
                <p>Vegetação exuberante, rios cheios, clima ameno, verde intenso. Cachoeiras no auge da sua força e beleza.</p>
              </div>
              <div class="gcv-post-period-card gcv-post-period-card--dry">
                <span class="card-ico">☀️</span>
                <strong>Período de Seca de abril a outubro</strong>
                <p>Clima árido, noites frias, dias quentes, piscinas cristalinas. Céu limpo e perfeito para observação de estrelas.</p>
              </div>
            </div>

            <p><strong>Abril e outubro são os meses de transição</strong> e são frequentemente os mais surpreendentes para os visitantes, pois reúnem características dos dois períodos simultaneamente.</p>

            <h2><span class="ico">🌧️</span> Período de chuvas: outubro a abril</h2>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.f6, "Cachoeira do Segredo em São Jorge na Chapada dos Veadeiros durante o período de chuvas, com vazão máxima e água branca descendo pela parede de rocha coberta de vegetação verde", 900, 1200)}
              <figcaption>
                A Cachoeira do Segredo no período de chuvas: força bruta, vazão máxima e verde por todo lado. Um espetáculo completamente
                diferente do período de seca.
              </figcaption>
            </figure>

            <p>
              O período de chuvas transforma a Chapada num paraíso de verde intenso. A vegetação do cerrado desperta com toda a força, os rios atingem sua
              <strong>capacidade máxima de vazão</strong> e as cachoeiras ganham volume impressionante. A temperatura da água fica mais agradável ao toque e o clima é
              ameno, com sol pela manhã, nuvens ao longo do dia e chuvas ocasionais à tarde.
            </p>

            <div class="gcv-post-highlight">
              <div class="lbl">Como são as chuvas na Chapada?</div>
              <p>
                Ao contrário do que muitos pensam, <strong>não chove o tempo inteiro</strong>. As precipitações costumam ser setorizadas; pode estar chovendo numa
                cachoeira enquanto outra, a poucos quilômetros, está com sol. Chuvas longas e contínuas são menos comuns, mas acontecem. Nos dias de
                <strong>invernada</strong>, o céu fica com neblina baixa e chuvisco fino, numa atmosfera mística e única que só a Chapada proporciona.
              </p>
            </div>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.f2, "Turistas no Poço do Sol da Cachoeira Loquinhas na Chapada dos Veadeiros durante o período de chuvas, com água esverdeada entre rochas e mata fechada", 1366, 768)}
              <figcaption>
                Poço do Sol da Cachoeira Loquinhas. Esse acesso só existe no período de chuvas, quando a água está no volume máximo. Um lugar secreto que a maioria
                dos turistas nunca encontra sem guia.
              </figcaption>
            </figure>

            <div class="gcv-post-alert">
              <div class="gcv-post-alert-title">⚠️ Atenção redobrada no período de chuvas</div>
              <ul>
                <li><strong>Risco de cabeça d'água</strong>: enchentes repentinas nos rios após chuvas na cabeceira. Sempre com guia em atrativos aquáticos.</li>
                <li><strong>Correntezas ocultas e armadilhas invisíveis</strong>: alguns dos pontos mais bonitos da Chapada escondem correntes subaquâneas traiçoeiras que não se percebem olhando para a superfície.</li>
                <li><strong>Pedras molhadas e escorregadias</strong>: risco de queda é maior. Calçado com sola antiderrapante é essencial.</li>
                <li><strong>Atolamento de veículos</strong>: estradas de terra ficam perigosas. Prefira veículos 4x4 ou contrate translado com guia.</li>
                <li><strong>Trilhas com barro e lama</strong>: o guia conhece as condições do dia e adapta o roteiro.</li>
              </ul>
            </div>

            <h2><span class="ico">☀️</span> Período de seca: abril a outubro</h2>

            <div class="gcv-post-compare-grid">
              <figure class="gcv-post-figure">
                ${picture(ap, E_IMGS.f5, "Cachoeira do Segredo em São Jorge na Chapada dos Veadeiros durante a seca, com paredão de rocha exposta e água cristalina no poço", 768, 1366)}
                <figcaption>Cachoeira do Segredo na seca</figcaption>
              </figure>
              <figure class="gcv-post-figure">
                ${picture(ap, E_IMGS.f4, "Cachoeira Cordovil na Chapada dos Veadeiros em junho, com água cristalina no poço", 1366, 768)}
                <figcaption>Cachoeira Cordovil em junho</figcaption>
              </figure>
            </div>

            <p>
              O período de seca traz um clima que lembra o de deserto: <strong>muito frio à noite e muito calor durante o dia</strong>. A amplitude térmica pode ser
              grande, com manhãs geladas abaixo de 10°C e tardes escaldantes acima de 35°C. Os ventos gelados das serras chegam com o inverno e a vegetação adquire tons
              dourados e terrosos característicos do cerrado seco.
            </p>
            <p>
              Em compensação, as piscinas naturais ficam <strong>mais transparentes e cristalinas</strong>, com visibilidade total no fundo. As trilhas ficam mais firmes. O
              céu, sem nuvens, é perfeito para observação de estrelas. A poeira das estradas de terra é a principal desvantagem; prefira janelas fechadas nos
              translados.
            </p>

            <div class="gcv-post-highlight">
              <div class="lbl">⚠️ Cuidado em agosto e setembro</div>
              <p>
                A seca intensa pode fazer desaparecer completamente algumas cachoeiras sazonais, como a Cachoeira do Abismo.
                Além disso, o risco de <strong>queimadas</strong> é real nesse período. É fundamental consultar um guia local
                para saber quais atrativos estão acessíveis e seguros antes de sair.
              </p>
            </div>

            <h2><span class="ico">🌸</span> A floração após a chuva: o espetáculo dos chuveirinhos</h2>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.f3, "Paepalanthus speciosus, o chuveirinho do cerrado, em floração na Chapada dos Veadeiros, planta típica dos campos rupestres que floresce entre abril e julho", 768, 1366)}
              <figcaption>
                O chuveirinho do cerrado (Paepalanthus) em floração, um dos fenômenos mais belos e únicos da Chapada dos Veadeiros. Acontece entre abril e julho, com
                pico em maio.
              </figcaption>
            </figure>

            <p>
              Uma das experiências mais únicas da Chapada acontece na transição entre a chuva e a seca: a <strong>floração dos chuveirinhos do cerrado</strong>. O
              <em>Paepalanthus speciosus</em>, popularmente chamado de chuveirinho ou palipalan, transforma os campos rupestres num tapete de flores brancas entre
              <strong>abril e julho</strong>, com pico em maio.
            </p>
            <p>
              É nesse cenário que
              <a href="https://g1.globo.com/go/goias/noticia/2024/02/07/foto-da-chapada-dos-veadeiros-premiada-internacionalmente-levou-1-ano-para-ser-produzida-diz-fotografo.ghtml" target="_blank" rel="noopener noreferrer">o fotógrafo Márcio Cabral foi premiado pela National Geographic Channel</a>,
              registrando uma das suas fotos mais icônicas: chuveirinhos iluminados sob o arco da Via Láctea. Uma imagem que resume a magia da Chapada nesse período e que você pode viver também.
            </p>

            <h2><span class="ico">📅</span> Guia completo mês a mês</h2>

            <div class="gcv-post-table-responsive">
              <table class="gcv-post-months-table">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th>Período</th>
                    <th>Nota</th>
                    <th>O que esperar</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>

            <h2><span class="ico">⭐</span> Maio: o melhor mês para visitar a Chapada dos Veadeiros</h2>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.hero, "Diego Navi em trilha noturna entre chuveirinhos do cerrado e a Via Láctea na Chapada dos Veadeiros em maio, foto de Márcio Cabral", 1200, 800)}
              <figcaption>Diego Navi numa trilha noturna entre chuveirinhos e a via Láctea. Foto: Márcio Cabral.</figcaption>
            </figure>

            <p>Se você puder escolher apenas um mês, escolha <strong>maio</strong>. É quando tudo se alinha de forma perfeita:</p>

            <div class="gcv-post-benefit-grid">
              ${maioBenefits}
            </div>

            <h2><span class="ico">🌤️</span> Abril e junho: os melhores vice campeões</h2>

            <p>
              <strong>Abril</strong> é o mês de transição da chuva para a seca. Os rios ainda estão com alto volume, a temperatura da água é agradável e os chuveirinhos
              começam a surgir. Os pôr do sol com arco íris alaranjados, violetas ou vermelhos são frequentes e deslumbrantes. Baixa temporada, tranquilidade.
            </p>
            <p>
              <strong>Junho</strong> é o inverno seco em sua plenitude: frio intenso à noite, sol constante durante o dia, clima completamente estável. As águas das
              cachoeiras ficam mais geladas, mas absolutamente cristalinas. Ideal para quem prefere trilhas sem calor excessivo e céu sempre limpo.
            </p>

            <h2><span class="ico">🎉</span> Julho: alta temporada, festas e cultura</h2>

            <p>
              Julho tem o mesmo clima excepcional de junho, mas com um ingrediente extra: <strong>vida cultural intensa</strong>. O Encontro de Culturas de Alto Paraíso de
              Goiás acontece nesse período, reunindo artesãos, raizeiros, músicos e muita festa. A vila de São Jorge fervilha de energia. Se você quer sentir o
              pulso vivo da Chapada, julho é imperdível; só reserve tudo com bastante antecedência.
            </p>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.f7, "Poço azul turquesa da Cachoeira Santa Bárbara em Cavalcante na Chapada dos Veadeiros com cachoeira ao fundo", 1366, 768)}
              <figcaption>Cachoeira Santa Bárbara em Cavalcante, um dos atrativos mais bonitos da Chapada em qualquer época do ano.</figcaption>
            </figure>

            <figure class="gcv-post-figure">
              ${picture(ap, E_IMGS.f8, "Poço verde esmeralda da Cachoeira do Segredo em São Jorge na Chapada dos Veadeiros, com reflexo das árvores na água calma e trilha de areia na margem", 1366, 768)}
              <figcaption>O poço espelho da Cachoeira do Segredo tem água calma e reflexo perfeito. Melhor aproveitado em abril e maio, na transição entre chuva e seca.</figcaption>
            </figure>

            <h2><span class="ico">💚</span> A verdade que todo guia sabe</h2>

            <div class="gcv-post-highlight">
              <div class="lbl">Filosofia do guia local</div>
              <p>
                <strong>O melhor dia para conhecer a Chapada dos Veadeiros é aquele em que você pode vir.</strong> Cada mês tem suas cachoeiras, suas flores, suas
                cores e sua personalidade. Um guia experiente adapta o roteiro para entregar o melhor do período em que você está: seja na força bruta das chuvas ou
                na transparência cristalina da seca.
              </p>
            </div>

            <h2><span class="ico">❓</span> Perguntas frequentes</h2>

            ${faqBlocks}

            <div class="gcv-post-cta">
              <h3>Pronto para planejar sua visita?</h3>
              <p>
                Conte com a Guia Chapada Veadeiros para montar o roteiro ideal para a época em que você vai, seja na chuva, na seca
                ou na transição. Cada visita é única e você vai aproveitar 100%.
              </p>
              <a href="${esc(WA_EPOCA)}" class="gcv-post-cta-btn" target="_blank" rel="noopener noreferrer">💬 Planejar minha visita no WhatsApp</a>
            </div>

            ${authorCard(h, AUTHOR_BIO, AUTHOR_SIGNOFF)}

            ${shareBar(h, canon, shareTitle, "footer")}
          </div>
          </article>
        </div>
      </div>`;

  return {
    fullTitle: `${EPOCA_SEO_TITLE} | ${SITE_NAME}`,
    desc: EPOCA_DESC,
    ogTitle: EPOCA_OG_TITLE,
    ogDesc: EPOCA_OG_DESC,
    ogImageRel: E_IMGS.hero,
    extraHead,
    mainHtml,
  };
}

export function premiumRevistaPtBundle(slug, helpers) {
  if (helpers.locale !== "pt") return null;
  if (!PREMIUM_REVISTA_PT_SLUGS.has(slug)) return null;
  if (slug === "contratar-guia-local-chapada-veadeiros") return buildContratar(helpers);
  if (slug === "melhor-epoca-visitar-chapada-dos-veadeiros") return buildEpoca(helpers);
  return null;
}

export function revistaSlugFromPathKey(pathKey) {
  return String(pathKey || "")
    .replace(/^revista\//i, "")
    .replace(/\.html$/i, "");
}
