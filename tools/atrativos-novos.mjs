/** Páginas novas dos passeios vendidos. Textos originais; fotos livres ou acervo do site. */

function L(pt, en, es) {
  return { pt, en, es };
}

function spot(o) {
  return {
    slug: o.slug,
    image: `imagens/${o.file}`,
    ...(o.mapOf ? { mapOf: o.mapOf } : {}),
    ...(o.map ? { map: o.map } : {}),
    title: o.title,
    lead: o.lead,
    story: {
      pt: { info: o.info.pt, html: o.html.pt },
      en: { info: o.info.en, html: o.html.en },
      es: { info: o.info.es, html: o.html.es },
    },
  };
}

function gal(file, alt, title) {
  return { src: `/imagens/${file}`, alt, title };
}

const CC40 = "CC BY-SA 4.0, Wikimedia Commons";
const CC20 = "CC BY-SA 2.0, Wikimedia Commons";

const RAW = [
  spot({
    slug: "bocaina-de-farias-guia-chapada-veadeiros",
    file: "cachoeira-bocaina-de-farias-guia-chapada-veadeiros.jpg",
    map: { l: 72, t: 78, w: 10, h: 4 },
    title: L("Bocaina de Farias", "Bocaina de Farias", "Bocaina de Farias"),
    lead: L(
      "Cânion estreito em São João d'Aliança, na Chapada dos Veadeiros, com poços no encontro dos rios Farias e Farinha.",
      "A narrow canyon in São João d'Aliança, in Chapada dos Veadeiros, with pools where the Farias and Farinha rivers meet.",
      "Un cañón estrecho en São João d'Aliança, en la Chapada dos Veadeiros, con pozas en el encuentro de los ríos Farias y Farinha.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 50 km",
        "Distância de São João d'Aliança: cerca de 52 km (asfalto e terra)",
        "Distância da Trilha (ida e volta): cerca de 6 km",
        "Nível de Dificuldade: Difícil",
        "Atrativos:",
        "- cânion com paredões de até 50 m",
        "- poços e trechos a nado",
        "- encontro dos rios Farias e Farinha",
        "Entrada: cobrada no local, com agendamento",
        "Guia obrigatório",
        "Período recomendado para visitação:",
        "Seca, de maio a setembro",
      ],
      [
        "Distance from Alto Paraíso: about 50 km",
        "Distance from São João d'Aliança: about 52 km (paved road and dirt)",
        "Trail distance (round trip): about 6 km",
        "Difficulty: Hard",
        "Highlights:",
        "- canyon with walls up to 50 m",
        "- pools and swimming sections",
        "- meeting of the Farias and Farinha rivers",
        "Entry: paid on site, by appointment",
        "Guide required",
        "Best time to visit:",
        "Dry season, May to September",
      ],
      [
        "Distancia desde Alto Paraíso: unos 50 km",
        "Distancia desde São João d'Aliança: unos 52 km (asfalto y tierra)",
        "Distancia del sendero (ida y vuelta): unos 6 km",
        "Dificultad: Difícil",
        "Atractivos:",
        "- cañón con paredes de hasta 50 m",
        "- pozas y tramos a nado",
        "- encuentro de los ríos Farias y Farinha",
        "Entrada: de pago en el lugar, con reserva",
        "Guía obligatorio",
        "Mejor época:",
        "Seca, de mayo a septiembre",
      ],
    ),
    html: L(
      `<p>A Bocaina de Farias fica na Serra Geral do Paranã, no município de São João d'Aliança, na Chapada dos Veadeiros. O nome, de origem tupi, lembra uma garganta: uma fenda de centenas de metros, com paredões que chegam a cerca de 50 metros, aberta onde os rios Farias e Farinha se encontram.</p>
<h3><strong>O cânion</strong></h3>
<p>Dentro da fenda o caminho alterna pedra seca, água na altura do joelho e trechos a nado. Quando o sol entra na rachadura, a água e a rocha mudam de cor. Fora do cânion, a trilha cruza campo aberto, com vista para o vale do Paranã, e um trecho de mata de galeria até a sede antiga da propriedade.</p>
<h3><strong>Como chegar</strong></h3>
<p>Saindo de Alto Paraíso são cerca de 50 km, com um longo trecho de terra depois da GO-118. O final da descida da serra é íngreme: carro comum costuma parar antes e o grupo segue a pé ou com o veículo do guia. A entrada é controlada e o passeio só acontece com condutor credenciado pelo atrativo.</p>
<h3><strong>Para quem é</strong></h3>
<p>A volta sobe o mesmo desnível. É uma das trilhas mais pesadas de São João d'Aliança e pede preparo, calçado firme e dia seco. Na chuva o cânion pode fechar por risco de tromba d'água. Leve água, proteção solar e combine o horário com o guia antes de sair.</p>`,
      `<p>Bocaina de Farias sits on the Serra Geral do Paranã, in São João d'Aliança, in Chapada dos Veadeiros. The Tupi name suggests a throat: a crack hundreds of meters long, with walls up to about 50 meters, where the Farias and Farinha rivers meet.</p>
<h3><strong>The canyon</strong></h3>
<p>Inside the cleft the path switches between dry rock, knee-deep water and short swims. When sunlight reaches the crack, water and stone change color. Outside, the trail crosses open grassland with a view of the Paranã valley, then a strip of gallery forest to the old farm buildings.</p>
<h3><strong>How to get there</strong></h3>
<p>From Alto Paraíso it is about 50 km, with a long dirt stretch after highway GO-118. The last drop off the escarpment is steep: an ordinary car usually stops early and the group walks, or rides with the guide. Entry is controlled and the visit only happens with a conductor accredited by the property.</p>
<h3><strong>Who it suits</strong></h3>
<p>The return climbs the same elevation. It is one of the hardest trails around São João d'Aliança and needs fitness, solid shoes and a dry day. In the rains the canyon can close because of flash-flood risk. Carry water and sun protection, and set the time with your guide before you leave.</p>`,
      `<p>La Bocaina de Farias está en la Serra Geral do Paranã, en São João d'Aliança, en la Chapada dos Veadeiros. El nombre tupí sugiere una garganta: una grieta de cientos de metros, con paredes de hasta unos 50 metros, donde se encuentran los ríos Farias y Farinha.</p>
<h3><strong>El cañón</strong></h3>
<p>Dentro de la hendidura el camino alterna roca seca, agua a la rodilla y tramos a nado. Cuando el sol entra en la grieta, el agua y la piedra cambian de color. Fuera, el sendero cruza campo abierto con vista al valle del Paranã y un trecho de bosque de galería hasta la sede antigua.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde Alto Paraíso hay unos 50 km, con un largo tramo de tierra después de la GO-118. La bajada final de la sierra es empinada: el coche común suele parar antes y el grupo sigue a pie o con el vehículo del guía. La entrada está controlada y la visita solo se hace con un conductor acreditado por el atractivo.</p>
<h3><strong>Para quién es</strong></h3>
<p>La vuelta sube el mismo desnivel. Es uno de los senderos más duros de São João d'Aliança y pide preparación, calzado firme y un día seco. Con lluvia el cañón puede cerrar por riesgo de crecida. Lleva agua y protección solar, y combina el horario con el guía antes de salir.</p>`,
    ),
  }),
  spot({
    slug: "boqueirao-guia-chapada-veadeiros",
    file: "boqueirao-guia-chapada-veadeiros-mapa.jpg",
    map: { l: 40, t: 11, w: 9, h: 4 },
    title: L("Boqueirão", "Boqueirão", "Boqueirão"),
    lead: L(
      "Poços verde-esmeralda do Rio Capivara, no interior de Cavalcante, na Chapada dos Veadeiros.",
      "Emerald pools on the Capivara River, in the Cavalcante backcountry of Chapada dos Veadeiros.",
      "Pozas verde esmeralda del río Capivara, en el interior de Cavalcante, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 76 km de estrada de terra",
        "Distância da Trilha (ida e volta): cerca de 600 m",
        "Nível de Dificuldade: Leve na trilha; acesso de carro difícil",
        "Atrativos:",
        "- poços do Rio Capivara",
        "- escorregador natural de pedra",
        "- mini borda infinita",
        "Entrada: somente com guia, cobrada no local",
        "Último trecho pede carro alto ou 4x4",
        "Período recomendado para visitação:",
        "Seca, de maio a outubro",
      ],
      [
        "Distance from Cavalcante: about 76 km of dirt road",
        "Trail distance (round trip): about 600 m",
        "Difficulty: Easy trail; hard drive in",
        "Highlights:",
        "- pools on the Capivara River",
        "- natural rock slide",
        "- small infinity edge",
        "Entry: guide only, paid on site",
        "The last stretch needs a high car or 4x4",
        "Best time to visit:",
        "Dry season, May to October",
      ],
      [
        "Distancia desde Cavalcante: unos 76 km de camino de tierra",
        "Distancia del sendero (ida y vuelta): unos 600 m",
        "Dificultad: Sendero fácil; acceso en coche difícil",
        "Atractivos:",
        "- pozas del río Capivara",
        "- tobogán natural de piedra",
        "- pequeña borde infinita",
        "Entrada: solo con guía, de pago en el lugar",
        "El último tramo pide coche alto o 4x4",
        "Mejor época:",
        "Seca, de mayo a octubre",
      ],
    ),
    html: L(
      `<p>O Complexo Boqueirão fica no rumo do povoado de São José, no interior de Cavalcante, perto da faixa da divisa com o Tocantins, na Chapada dos Veadeiros. O Rio Capivara abre ali uma sequência de poços entre paredões, com água que fica verde-esmeralda na seca.</p>
<h3><strong>Os poços</strong></h3>
<p>A caminhada depois da porteira é curta e liga quatro ou cinco poços. Há escorregador de pedra, uma mini borda infinita e pontos de onde se pula com orientação do guia. É um passeio de banho, mais do que de trilha longa.</p>
<h3><strong>Como chegar</strong></h3>
<p>São cerca de 76 km de terra a partir de Cavalcante. O último lance sobe íngreme e, em muitos dias, só passa com carro alto ou 4x4. Se o veículo parar antes, a caminhada até a entrada aumenta. A propriedade é particular: a visita é com guia.</p>
<h3><strong>Quando ir</strong></h3>
<p>Na seca, de maio a outubro, a água fica mais transparente e o banho mais confortável. Depois de chuva forte a estrada piora e a correnteza muda. Confirme o acesso com o guia no dia anterior.</p>`,
      `<p>Complexo Boqueirão lies toward the village of São José, in the Cavalcante interior, near the Tocantins line, in Chapada dos Veadeiros. The Capivara River opens a sequence of pools between rock walls there, and the water turns emerald green in the dry season.</p>
<h3><strong>The pools</strong></h3>
<p>The walk after the gate is short and links four or five pools. There is a rock slide, a small infinity edge and jump spots used only with the guide's call. This is a swimming day, not a long hike.</p>
<h3><strong>How to get there</strong></h3>
<p>It is about 76 km of dirt road from Cavalcante. The last climb is steep and, on many days, only a high car or a 4x4 gets through. If the vehicle stops early, the walk to the gate gets longer. The land is private: the visit is with a guide.</p>
<h3><strong>When to go</strong></h3>
<p>In the dry months, May to October, the water is clearer and the swim more comfortable. After heavy rain the road worsens and the current changes. Confirm the drive with your guide the day before.</p>`,
      `<p>El Complejo Boqueirão queda hacia el pueblo de São José, en el interior de Cavalcante, cerca del límite con Tocantins, en la Chapada dos Veadeiros. El río Capivara abre allí una secuencia de pozas entre paredes, y el agua se pone verde esmeralda en la seca.</p>
<h3><strong>Las pozas</strong></h3>
<p>La caminata después de la portería es corta y une cuatro o cinco pozas. Hay tobogán de piedra, una pequeña borde infinita y puntos de salto solo con la indicación del guía. Es un día de baño, no de sendero largo.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Hay unos 76 km de tierra desde Cavalcante. La última subida es empinada y, muchos días, solo pasa un coche alto o un 4x4. Si el vehículo para antes, la caminata hasta la entrada crece. La propiedad es particular: la visita es con guía.</p>
<h3><strong>Cuándo ir</strong></h3>
<p>En la seca, de mayo a octubre, el agua queda más transparente y el baño más cómodo. Después de lluvia fuerte el camino empeora y la corriente cambia. Confirma el acceso con el guía el día anterior.</p>`,
    ),
  }),
  spot({
    slug: "candaru-guia-chapada-veadeiros",
    file: "cachoeira-candaru-guia-chapada-veadeiros-cavalcante.jpg",
    map: { l: 50, t: 12, w: 8, h: 4 },
    title: L("Candaru", "Candaru", "Candaru"),
    lead: L(
      "Queda de cerca de 70 metros no quilombo Kalunga do Engenho II, em Cavalcante, na Chapada dos Veadeiros.",
      "A fall of about 70 meters in the Kalunga quilombo of Engenho II, in Cavalcante, Chapada dos Veadeiros.",
      "Una caída de unos 70 metros en el quilombo Kalunga de Engenho II, en Cavalcante, Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 27 km de terra até o Engenho II",
        "Distância da Trilha (ida e volta): cerca de 3 km, além do traslado interno",
        "Nível de Dificuldade: Moderado",
        "Atrativos:",
        "- queda de cerca de 70 m",
        "- dois poços de água verde",
        "- território Kalunga do Engenho II",
        "Entrada: ingresso da comunidade",
        "Guia Kalunga obrigatório",
        "Período recomendado para visitação:",
        "Seca; confirme o calendário da comunidade",
      ],
      [
        "Distance from Cavalcante: about 27 km of dirt road to Engenho II",
        "Trail distance (round trip): about 3 km, plus the internal transfer",
        "Difficulty: Moderate",
        "Highlights:",
        "- a fall of about 70 m",
        "- two green-water pools",
        "- Kalunga land at Engenho II",
        "Entry: community ticket",
        "Kalunga guide required",
        "Best time to visit:",
        "Dry season; check the community calendar",
      ],
      [
        "Distancia desde Cavalcante: unos 27 km de tierra hasta Engenho II",
        "Distancia del sendero (ida y vuelta): unos 3 km, más el traslado interno",
        "Dificultad: Moderada",
        "Atractivos:",
        "- caída de unos 70 m",
        "- dos pozas de agua verde",
        "- territorio Kalunga de Engenho II",
        "Entrada: entrada de la comunidad",
        "Guía Kalunga obligatorio",
        "Mejor época:",
        "Seca; confirma el calendario de la comunidad",
      ],
    ),
    html: L(
      `<p>A Cachoeira do Candaru fica no povoado Kalunga do Engenho II, em Cavalcante, na Chapada dos Veadeiros, no mesmo complexo da Santa Bárbara e da Capivara. A água desce cerca de 70 metros e forma poços verdes, em dois níveis, protegidos por um paredão.</p>
<h3><strong>Por que é mais vazia</strong></h3>
<p>O acesso é mais longo que o das vizinhas. Muita gente faz Santa Bárbara e Capivara e deixa o Candaru para outro dia. Quem chega encontra a queda mais quieta do conjunto, com um poço fundo e outro na base, onde a água bate na pedra como um jato.</p>
<h3><strong>Como chegar</strong></h3>
<p>O Engenho II fica a cerca de 27 km de terra de Cavalcante, pela GO-241 e um desvio à direita. O check-in é no centro de apoio da comunidade. Dali ainda há alguns quilômetros até o início da trilha, às vezes de traslado interno, às vezes a pé por subida de serra. A caminhada em si fica na casa de 3 km ida e volta, com trechos íngremes.</p>
<h3><strong>Regra da comunidade</strong></h3>
<p>A visita é com guia Kalunga. O ingresso é o da comunidade e as vagas do dia têm limite. Dá para combinar Candaru, Capivara e Santa Bárbara, mas o dia começa cedo. Na chuva a trilha e a estrada mudam de risco: o guia decide se entra.</p>
<p><em>Foto: Clara Goldenstein, <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>, Wikimedia Commons. A imagem foi redimensionada e mostra o leito de pedra da cachoeira.</em></p>`,
      `<p>Candaru waterfall is in the Kalunga village of Engenho II, in Cavalcante, Chapada dos Veadeiros, in the same complex as Santa Bárbara and Capivara. The water drops about 70 meters into green pools on two levels, held by a rock wall.</p>
<h3><strong>Why it is quieter</strong></h3>
<p>The approach is longer than the neighbors'. Many people do Santa Bárbara and Capivara and leave Candaru for another day. Those who arrive find the quietest fall of the set, with a deep pool and another at the base where the water hits the rock.</p>
<h3><strong>How to get there</strong></h3>
<p>Engenho II is about 27 km of dirt road from Cavalcante, along GO-241 and a right-hand turn. Check-in is at the community visitor center. From there it is still a few kilometers to the trailhead, sometimes by an internal transfer, sometimes on foot up the hill. The walk itself is about 3 km round trip, with steep sections.</p>
<h3><strong>Community rule</strong></h3>
<p>The visit is with a Kalunga guide. The ticket belongs to the community and the day's places are limited. Candaru, Capivara and Santa Bárbara can share a day, but the start is early. In the rain the trail and the road change risk: the guide decides whether to go in.</p>
<p><em>Photo: Clara Goldenstein, <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>, Wikimedia Commons. The image was resized and shows the waterfall's rock bed.</em></p>`,
      `<p>La cascada Candaru está en el pueblo Kalunga de Engenho II, en Cavalcante, Chapada dos Veadeiros, en el mismo complejo que Santa Bárbara y Capivara. El agua baja unos 70 metros y forma pozas verdes, en dos niveles, protegidas por una pared de roca.</p>
<h3><strong>Por qué está más vacía</strong></h3>
<p>El acceso es más largo que el de las vecinas. Mucha gente hace Santa Bárbara y Capivara y deja Candaru para otro día. Quien llega encuentra la caída más tranquila del conjunto, con una poza honda y otra en la base, donde el agua golpea la piedra.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Engenho II queda a unos 27 km de tierra de Cavalcante, por la GO-241 y un desvío a la derecha. El registro es en el centro de apoyo de la comunidad. Desde allí aún hay unos kilómetros hasta el inicio del sendero, a veces en traslado interno, a veces a pie cuesta arriba. La caminata en sí ronda los 3 km ida y vuelta, con tramos empinados.</p>
<h3><strong>Regla de la comunidad</strong></h3>
<p>La visita es con guía Kalunga. La entrada es de la comunidad y las plazas del día tienen límite. Se puede juntar Candaru, Capivara y Santa Bárbara, pero el día empieza temprano. Con lluvia el sendero y el camino cambian de riesgo: el guía decide si se entra.</p>
<p><em>Foto: Clara Goldenstein, <a href="https://creativecommons.org/licenses/by-sa/3.0">CC BY-SA 3.0</a>, Wikimedia Commons. La imagen fue redimensionada y muestra el lecho de piedra de la cascada.</em></p>`,
    ),
  }),
  spot({
    slug: "canjica-aguas-lindas-guia-chapada-veadeiros",
    file: "complexo-aguas-lindas-canjica-guia-chapada-veadeiros-cavalcante.jpg",
    map: { l: 36, t: 2, w: 11, h: 4.5 },
    title: L("Canjica e Águas Lindas", "Canjica and Águas Lindas", "Canjica y Águas Lindas"),
    lead: L(
      "Poços, cânion e a cachoeira da Canjica, a cerca de 75 km de Cavalcante, na Chapada dos Veadeiros.",
      "Pools, a canyon and Canjica waterfall, about 75 km from Cavalcante, in Chapada dos Veadeiros.",
      "Pozas, un cañón y la cascada Canjica, a unos 75 km de Cavalcante, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 75 km de estrada de terra",
        "Distância da Trilha (ida e volta): cerca de 11 km",
        "Nível de Dificuldade: Moderado a difícil",
        "Atrativos:",
        "- Poço das Pedras",
        "- Poço das Águas Lindas",
        "- Cânion das Águas Lindas",
        "- piscina de borda infinita",
        "- Cachoeira da Canjica",
        "Entrada: cobrada no local",
        "Guia obrigatório",
        "Período recomendado para visitação:",
        "Dia inteiro, de preferência na seca",
      ],
      [
        "Distance from Cavalcante: about 75 km of dirt road",
        "Trail distance (round trip): about 11 km",
        "Difficulty: Moderate to hard",
        "Highlights:",
        "- Poço das Pedras",
        "- Poço das Águas Lindas",
        "- Águas Lindas canyon",
        "- infinity-edge pool",
        "- Canjica waterfall",
        "Entry: paid on site",
        "Guide required",
        "Best time to visit:",
        "A full day, preferably in the dry season",
      ],
      [
        "Distancia desde Cavalcante: unos 75 km de camino de tierra",
        "Distancia del sendero (ida y vuelta): unos 11 km",
        "Dificultad: Moderada a difícil",
        "Atractivos:",
        "- Poço das Pedras",
        "- Poço das Águas Lindas",
        "- Cañón das Águas Lindas",
        "- piscina de borde infinito",
        "- Cascada de la Canjica",
        "Entrada: de pago en el lugar",
        "Guía obligatorio",
        "Mejor época:",
        "Día completo, de preferencia en la seca",
      ],
    ),
    html: L(
      `<p>Canjica e Águas Lindas formam um complexo no norte de Cavalcante, na divisa de Goiás com o Tocantins, na Chapada dos Veadeiros. Aberto ao turismo por volta de 2020, ainda recebe menos gente do que as cachoeiras clássicas porque a estrada e a trilha são longas.</p>
<h3><strong>A sequência</strong></h3>
<p>O circuito passa pelo Poço das Pedras, pelo Poço das Águas Lindas — fundo, transparente, com peixes visíveis —, pelo cânion do mesmo nome, por uma piscina de borda infinita aberta para o vale e, no fim, pela Cachoeira da Canjica. A água costuma ser mais morna que a das quedas do planalto.</p>
<h3><strong>Como chegar</strong></h3>
<p>São cerca de 75 km de terra a partir de Cavalcante. O último trecho pede carro alto e, depois de chuva, 4x4. A trilha até a Canjica fica na casa de 5,5 km por sentido, cerca de 11 km ida e volta, com lajes e subidas. Com as paradas de banho, reserve o dia inteiro.</p>
<h3><strong>Guia</strong></h3>
<p>A entrada é paga e o acompanhamento de guia é obrigatório. O passeio também sai de Alto Paraíso, com mais estrada. Leve comida, água de sobra e calçado que possa molhar.</p>`,
      `<p>Canjica and Águas Lindas form a complex in northern Cavalcante, on the Goiás–Tocantins line, in Chapada dos Veadeiros. Opened to visitors around 2020, it still draws fewer people than the classic falls because the road and the trail are long.</p>
<h3><strong>The sequence</strong></h3>
<p>The circuit passes Poço das Pedras, Poço das Águas Lindas — deep, clear, with fish you can see —, the canyon of the same name, an infinity-edge pool open to the valley and, at the end, Canjica waterfall. The water is often warmer than the falls up on the plateau.</p>
<h3><strong>How to get there</strong></h3>
<p>It is about 75 km of dirt road from Cavalcante. The last stretch wants a high car and, after rain, a 4x4. The trail to Canjica is about 5.5 km each way, roughly 11 km round trip, on slabs and climbs. With swim stops, keep the whole day.</p>
<h3><strong>Guide</strong></h3>
<p>Entry is paid and a guide is required. The tour also leaves from Alto Paraíso, with more road time. Bring food, extra water and shoes that can get wet.</p>`,
      `<p>Canjica y Águas Lindas forman un complejo al norte de Cavalcante, en el límite de Goiás con Tocantins, en la Chapada dos Veadeiros. Abierto al turismo hacia 2020, todavía recibe menos gente que las cascadas clásicas porque el camino y el sendero son largos.</p>
<h3><strong>La secuencia</strong></h3>
<p>El circuito pasa por el Poço das Pedras, el Poço das Águas Lindas — hondo, transparente, con peces a la vista —, el cañón del mismo nombre, una piscina de borde infinito abierta al valle y, al final, la cascada Canjica. El agua suele ser más tibia que la de las caídas del altiplano.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Hay unos 75 km de tierra desde Cavalcante. El último tramo pide coche alto y, después de la lluvia, 4x4. El sendero hasta Canjica ronda 5,5 km por sentido, unos 11 km ida y vuelta, con lajas y subidas. Con las paradas de baño, reserva el día entero.</p>
<h3><strong>Guía</strong></h3>
<p>La entrada se paga y el guía es obligatorio. El paseo también sale de Alto Paraíso, con más camino. Lleva comida, agua de sobra y calzado que pueda mojarse.</p>`,
    ),
  }),
  spot({
    slug: "capivara-guia-chapada-veadeiros",
    file: "cachoeira-capivara-guia-chapada-veadeiros-cavalcante.jpg",
    map: { l: 53, t: 6, w: 8, h: 4 },
    title: L("Capivara", "Capivara", "Capivara"),
    lead: L(
      "Cachoeira do quilombo Kalunga do Engenho II, ao lado da Santa Bárbara, em Cavalcante, na Chapada dos Veadeiros.",
      "A waterfall in the Kalunga quilombo of Engenho II, next to Santa Bárbara, in Cavalcante, Chapada dos Veadeiros.",
      "Cascada del quilombo Kalunga de Engenho II, junto a Santa Bárbara, en Cavalcante, Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 27 km de terra até o Engenho II",
        "Distância da Trilha (ida e volta): cerca de 1 km",
        "Nível de Dificuldade: Leve a moderado",
        "Atrativos:",
        "- poços da Cachoeira da Capivara",
        "- território Kalunga do Engenho II",
        "Entrada: ingresso da comunidade",
        "Guia Kalunga obrigatório",
        "Período recomendado para visitação:",
        "Ano inteiro, com mais conforto na seca",
      ],
      [
        "Distance from Cavalcante: about 27 km of dirt road to Engenho II",
        "Trail distance (round trip): about 1 km",
        "Difficulty: Easy to moderate",
        "Highlights:",
        "- pools at Capivara waterfall",
        "- Kalunga land at Engenho II",
        "Entry: community ticket",
        "Kalunga guide required",
        "Best time to visit:",
        "Year-round, more comfortable in the dry season",
      ],
      [
        "Distancia desde Cavalcante: unos 27 km de tierra hasta Engenho II",
        "Distancia del sendero (ida y vuelta): cerca de 1 km",
        "Dificultad: Fácil a moderada",
        "Atractivos:",
        "- pozas de la cascada Capivara",
        "- territorio Kalunga de Engenho II",
        "Entrada: entrada de la comunidad",
        "Guía Kalunga obligatorio",
        "Mejor época:",
        "Todo el año, más cómoda en la seca",
      ],
    ),
    html: L(
      `<p>A Cachoeira da Capivara fica no Engenho II, território Kalunga em Cavalcante, na Chapada dos Veadeiros. É a vizinha da Santa Bárbara e a parada que os moradores mais usam, porque a trilha é curta e o poço fica perto do povoado.</p>
<h3><strong>A trilha</strong></h3>
<p>Do centro de apoio até os primeiros poços são algumas centenas de metros, na casa de 1 km ida e volta, com descidas em pedra e um trecho no leito. Não é plana o tempo todo, mas é bem mais curta que a do Candaru. Em dia cheio, a comunidade pode limitar o tempo de permanência, como faz na Santa Bárbara.</p>
<h3><strong>Como chegar</strong></h3>
<p>O povoado fica a cerca de 27 km de estrada de terra de Cavalcante. O passeio também sai de Alto Paraíso e de São Jorge, com mais horas de carro. O guia é Kalunga, credenciado pela comunidade, e o ingresso é pago no circuito do quilombo.</p>
<h3><strong>No mesmo dia</strong></h3>
<p>Capivara, Santa Bárbara e Candaru dividem a mesma portaria. Começar pela Capivara deixa a Santa Bárbara para mais tarde, quando o movimento muda. Leve dinheiro do ingresso, água e roupa de banho.</p>
<p><em>Foto: Adelano Lázaro, ${CC40}. Segunda foto: João Bispo de Aragão Filho, ${CC40}.</em></p>`,
      `<p>Capivara waterfall is in Engenho II, Kalunga land in Cavalcante, Chapada dos Veadeiros. It sits next to Santa Bárbara and is the stop residents use most, because the trail is short and the pool is close to the village.</p>
<h3><strong>The trail</strong></h3>
<p>From the visitor center to the first pools is a few hundred meters, about 1 km round trip, with rocky drops and a stretch in the creek bed. It is not flat the whole way, but it is much shorter than Candaru. On a busy day the community may limit how long you stay, as it does at Santa Bárbara.</p>
<h3><strong>How to get there</strong></h3>
<p>The village is about 27 km of dirt road from Cavalcante. The tour also leaves from Alto Paraíso and São Jorge, with more hours in the car. The guide is Kalunga, accredited by the community, and the ticket is paid on the quilombo circuit.</p>
<h3><strong>Same day</strong></h3>
<p>Capivara, Santa Bárbara and Candaru share the same gate. Starting at Capivara leaves Santa Bárbara for later, when the crowd shifts. Bring ticket money, water and swimwear.</p>
<p><em>Photo: Adelano Lázaro, ${CC40}. Second photo: João Bispo de Aragão Filho, ${CC40}.</em></p>`,
      `<p>La cascada Capivara está en Engenho II, territorio Kalunga en Cavalcante, Chapada dos Veadeiros. Queda al lado de Santa Bárbara y es la parada que más usan los vecinos, porque el sendero es corto y la poza está cerca del pueblo.</p>
<h3><strong>El sendero</strong></h3>
<p>Del centro de apoyo a las primeras pozas hay unos cientos de metros, cerca de 1 km ida y vuelta, con bajadas en piedra y un tramo en el lecho. No es plano todo el tiempo, pero es mucho más corto que Candaru. En un día lleno la comunidad puede limitar el tiempo de estancia, como hace en Santa Bárbara.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>El pueblo queda a unos 27 km de tierra de Cavalcante. El paseo también sale de Alto Paraíso y de São Jorge, con más horas de coche. El guía es Kalunga, acreditado por la comunidad, y la entrada se paga en el circuito del quilombo.</p>
<h3><strong>El mismo día</strong></h3>
<p>Capivara, Santa Bárbara y Candaru comparten la misma portería. Empezar por Capivara deja Santa Bárbara para más tarde, cuando cambia el movimiento. Lleva el dinero de la entrada, agua y ropa de baño.</p>
<p><em>Foto: Adelano Lázaro, ${CC40}. Segunda foto: João Bispo de Aragão Filho, ${CC40}.</em></p>`,
    ),
  }),
  spot({
    slug: "catoa-guia-chapada-veadeiros",
    file: "catoa-guia-chapada-veadeiros-mapa.jpg",
    map: { l: 28, t: 2, w: 8, h: 4 },
    title: L("Catoá", "Catoá", "Catoá"),
    lead: L(
      "Queda alta no povoado de Campo Alegre, ao norte de Cavalcante, com um poço verde e outro de água morna, na Chapada dos Veadeiros.",
      "A tall fall at Campo Alegre, north of Cavalcante, with one green pool and one warm pool, in Chapada dos Veadeiros.",
      "Una caída alta en Campo Alegre, al norte de Cavalcante, con una poza verde y otra de agua tibia, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 66 km",
        "Distância da Trilha (ida e volta): cerca de 8 km a partir de onde o 4x4 para",
        "Nível de Dificuldade: Difícil",
        "Atrativos:",
        "- queda alta em paredão",
        "- poço verde da cachoeira",
        "- poço de água morna na rocha",
        "Entrada: cobrada no local",
        "Guia credenciado obrigatório",
        "Período recomendado para visitação:",
        "Seca, de maio a setembro",
      ],
      [
        "Distance from Cavalcante: about 66 km",
        "Trail distance (round trip): about 8 km from where the 4x4 stops",
        "Difficulty: Hard",
        "Highlights:",
        "- a tall fall on a cliff",
        "- the waterfall's green pool",
        "- a warm pool in the rock",
        "Entry: paid on site",
        "Accredited guide required",
        "Best time to visit:",
        "Dry season, May to September",
      ],
      [
        "Distancia desde Cavalcante: unos 66 km",
        "Distancia del sendero (ida y vuelta): unos 8 km desde donde para el 4x4",
        "Dificultad: Difícil",
        "Atractivos:",
        "- caída alta en un paredón",
        "- poza verde de la cascada",
        "- poza de agua tibia en la roca",
        "Entrada: de pago en el lugar",
        "Guía acreditado obligatorio",
        "Mejor época:",
        "Seca, de mayo a septiembre",
      ],
    ),
    html: L(
      `<p>A Cachoeira do Catoá, também escrita Catuá, fica no povoado de Campo Alegre, na faixa norte de Cavalcante, na Chapada dos Veadeiros. Guias locais falam em uma queda na casa dos 70 metros; o cadastro de turismo do estado chega a registrar cerca de 100. O que não muda é o par de poços: um verde e gelado, da cachoeira, e outro azul-turquesa, de água morna que nasce na rocha.</p>
<h3><strong>A trilha</strong></h3>
<p>Boa parte dos cerca de 22 km desde Campo Alegre se faz de carro. A caminhada começa onde o 4x4 para e fica na casa de 8 km ida e volta, por cerradão e porteiras. São umas quatro horas de movimento, com guia o tempo todo.</p>
<h3><strong>Como chegar</strong></h3>
<p>De Cavalcante são cerca de 66 km, com terra ruim no final. Também se combina a saída a partir de Alto Paraíso, com mais estrada. Sem guia credenciado de Campo Alegre o passeio não entra.</p>
<h3><strong>Quando ir</strong></h3>
<p>A seca, de maio a setembro, deixa a trilha e os córregos mais previsíveis. Chuva forte atrapalha o acesso e aumenta o risco no caminho. Não há estrutura de apoio no poço: leve água, comida e capa de sol.</p>`,
      `<p>Catoá waterfall, also spelled Catuá, is in the village of Campo Alegre, on the northern edge of Cavalcante, in Chapada dos Veadeiros. Local guides speak of a drop around 70 meters; the state tourism register lists about 100. What does not change is the pair of pools: one green and cold, fed by the fall, and one turquoise, warm water that rises in the rock.</p>
<h3><strong>The trail</strong></h3>
<p>Much of the roughly 22 km from Campo Alegre is driven. The walk starts where the 4x4 stops and is about 8 km round trip, through tall cerrado and gates. Count on about four hours of moving, with a guide the whole way.</p>
<h3><strong>How to get there</strong></h3>
<p>From Cavalcante it is about 66 km, with a rough dirt finish. Departures from Alto Paraíso are also sold, with more road. Without an accredited guide from Campo Alegre the visit does not go in.</p>
<h3><strong>When to go</strong></h3>
<p>The dry months, May to September, make the trail and the creeks more predictable. Heavy rain spoils the access and raises the risk on the path. There is no support at the pool: bring water, food and sun cover.</p>`,
      `<p>La cascada Catoá, también escrita Catuá, está en el pueblo de Campo Alegre, en la franja norte de Cavalcante, en la Chapada dos Veadeiros. Los guías locales hablan de una caída de unos 70 metros; el registro de turismo del estado llega a unos 100. Lo que no cambia es el par de pozas: una verde y fría, de la cascada, y otra turquesa, de agua tibia que nace en la roca.</p>
<h3><strong>El sendero</strong></h3>
<p>Buena parte de los cerca de 22 km desde Campo Alegre se hace en coche. La caminata empieza donde para el 4x4 y ronda 8 km ida y vuelta, por cerradão y porteras. Calcula unas cuatro horas en movimiento, con guía todo el tiempo.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde Cavalcante hay unos 66 km, con tierra mala al final. También se combina la salida desde Alto Paraíso, con más camino. Sin un guía acreditado de Campo Alegre la visita no entra.</p>
<h3><strong>Cuándo ir</strong></h3>
<p>La seca, de mayo a septiembre, deja el sendero y los arroyos más previsibles. La lluvia fuerte estropea el acceso y sube el riesgo en el camino. No hay estructura en la poza: lleva agua, comida y protección solar.</p>`,
    ),
  }),
  spot({
    slug: "chapada-alta-guia-chapada-veadeiros",
    file: "chapada-alta-guia-chapada-veadeiros-mapa.jpg",
    map: { l: 74, t: 39, w: 10, h: 4 },
    title: L("Chapada Alta", "Chapada Alta", "Chapada Alta"),
    lead: L(
      "Complexo de cachoeiras e mirantes na serra a nordeste de Alto Paraíso, na Chapada dos Veadeiros.",
      "A complex of waterfalls and lookouts on the ridge northeast of Alto Paraíso, in Chapada dos Veadeiros.",
      "Un complejo de cascadas y miradores en la sierra al noreste de Alto Paraíso, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 51 a 60 km (GO-118 e terra de fazenda)",
        "Distância da Trilha (ida e volta): parte de cima cerca de 6 km; parte de baixo cerca de 19 km",
        "Nível de Dificuldade: Moderado a difícil",
        "Atrativos:",
        "- Cachoeira do Lajeado com borda",
        "- Samambaia, Mirante e Véu de Noiva",
        "- Mirante do Vale das Araras",
        "Entrada: cobrada por parte do circuito",
        "Guia obrigatório (porteiras da fazenda)",
        "Período recomendado para visitação:",
        "Abril a novembro",
      ],
      [
        "Distance from Alto Paraíso: about 51 to 60 km (GO-118 and farm dirt road)",
        "Trail distance (round trip): upper circuit about 6 km; lower circuit about 19 km",
        "Difficulty: Moderate to hard",
        "Highlights:",
        "- Lajeado fall with an edge pool",
        "- Samambaia, Mirante and Véu de Noiva",
        "- Vale das Araras lookout",
        "Entry: charged per circuit section",
        "Guide required (farm gates)",
        "Best time to visit:",
        "April to November",
      ],
      [
        "Distancia desde Alto Paraíso: unos 51 a 60 km (GO-118 y tierra de hacienda)",
        "Distancia del sendero (ida y vuelta): parte alta unos 6 km; parte baja unos 19 km",
        "Dificultad: Moderada a difícil",
        "Atractivos:",
        "- Cascada del Lajeado con borde",
        "- Samambaia, Mirante y Véu de Noiva",
        "- Mirador del Vale das Araras",
        "Entrada: se cobra por tramo del circuito",
        "Guía obligatorio (porteras de la hacienda)",
        "Mejor época:",
        "Abril a noviembre",
      ],
    ),
    html: L(
      `<p>Chapada Alta é um complexo particular na fazenda do alto da serra, a nordeste de Alto Paraíso, na Chapada dos Veadeiros. O dia de cima junta cachoeiras e mirantes em poucos quilômetros, mas com descida e subida em cada parada. A parte de baixo é outra jornada, longa o bastante para virar pernoite.</p>
<h3><strong>Parte de cima</strong></h3>
<p>Em cerca de 6 km aparecem a Cachoeira do Lajeado com borda, uma piscina natural, as quedas Samambaia, do Mirante e Véu de Noiva, e o Mirante do Vale das Araras. Há cordas em trechos expostos. O nome Lajeado aqui é o da fazenda, não a cachoeira da Vila de São Jorge.</p>
<h3><strong>Como chegar</strong></h3>
<p>O caminho segue a GO-118 no sentido de Teresina de Goiás, cerca de 40 km de asfalto, e depois uns 10 a 12 km de terra com porteiras. Só o guia tem as chaves. O acesso cruza o Rio das Almas: se a água cobrir a ponte, o passeio não passa.</p>
<h3><strong>Parte de baixo</strong></h3>
<p>A trilha de baixo fica na casa de 19 km e pede outro dia, ou os dois circuitos com camping. A entrada é cobrada por parte. Visitas de abril a novembro, com carro alto.</p>`,
      `<p>Chapada Alta is a private complex on a ridge-top farm northeast of Alto Paraíso, in Chapada dos Veadeiros. The upper day packs waterfalls and lookouts into a few kilometers, but every stop drops and climbs. The lower section is another journey, long enough to become an overnight.</p>
<h3><strong>Upper section</strong></h3>
<p>In about 6 km you meet the Lajeado fall with its edge, a natural pool, the Samambaia, Mirante and Véu de Noiva falls, and the Vale das Araras lookout. Fixed ropes appear on exposed bits. This Lajeado is the farm's fall, not the waterfall at Vila de São Jorge.</p>
<h3><strong>How to get there</strong></h3>
<p>The road follows GO-118 toward Teresina de Goiás, about 40 km of pavement, then 10 to 12 km of dirt with locked gates. Only the guide has the keys. The access crosses the Rio das Almas: if water covers the bridge, the tour does not cross.</p>
<h3><strong>Lower section</strong></h3>
<p>The lower trail is about 19 km and wants another day, or both circuits with camping. Entry is charged per section. Visits run from April to November, in a high car.</p>`,
      `<p>Chapada Alta es un complejo particular en una hacienda en lo alto de la sierra, al noreste de Alto Paraíso, en la Chapada dos Veadeiros. El día de arriba junta cascadas y miradores en pocos kilómetros, pero cada parada baja y sube. La parte de abajo es otra jornada, bastante larga para volverse pernocta.</p>
<h3><strong>Parte de arriba</strong></h3>
<p>En unos 6 km aparecen la cascada del Lajeado con borde, una piscina natural, las caídas Samambaia, del Mirante y Véu de Noiva, y el mirador del Vale das Araras. Hay cuerdas en tramos expuestos. Este Lajeado es el de la hacienda, no la cascada de la Vila de São Jorge.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>El camino sigue la GO-118 hacia Teresina de Goiás, unos 40 km de asfalto, y después 10 a 12 km de tierra con porteras. Solo el guía tiene las llaves. El acceso cruza el río das Almas: si el agua cubre el puente, el paseo no pasa.</p>
<h3><strong>Parte de abajo</strong></h3>
<p>El sendero de abajo ronda 19 km y pide otro día, o los dos circuitos con camping. La entrada se cobra por tramo. Las visitas van de abril a noviembre, en coche alto.</p>`,
    ),
  }),
  spot({
    slug: "curriola-guia-chapada-veadeiros",
    file: "curriola-guia-chapada-veadeiros-mapa.jpg",
    map: { l: 66, t: 1.5, w: 8, h: 4 },
    title: L("Curriola", "Curriola", "Curriola"),
    lead: L(
      "Salto do Rio Curriola no Vão do Moleque, território Kalunga, em Cavalcante, na Chapada dos Veadeiros.",
      "A drop on the Curriola River in Vão do Moleque, Kalunga land, in Cavalcante, Chapada dos Veadeiros.",
      "Un salto del río Curriola en el Vão do Moleque, territorio Kalunga, en Cavalcante, Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 53 km, com 4x4 no final",
        "Distância da Trilha (ida e volta): cerca de 2 km",
        "Nível de Dificuldade: Leve na trilha; estrada difícil",
        "Atrativos:",
        "- poço azul-esverdeado do Salto do Curriola",
        "- poços rio acima, em trecho opcional",
        "Entrada: cobrada no local",
        "Guia Kalunga obrigatório",
        "Período recomendado para visitação:",
        "Seca, de maio a novembro",
      ],
      [
        "Distance from Cavalcante: about 53 km, with a 4x4 at the end",
        "Trail distance (round trip): about 2 km",
        "Difficulty: Easy trail; hard road",
        "Highlights:",
        "- blue-green pool at Salto do Curriola",
        "- upstream pools on an optional stretch",
        "Entry: paid on site",
        "Kalunga guide required",
        "Best time to visit:",
        "Dry season, May to November",
      ],
      [
        "Distancia desde Cavalcante: unos 53 km, con 4x4 al final",
        "Distancia del sendero (ida y vuelta): unos 2 km",
        "Dificultad: Sendero fácil; camino difícil",
        "Atractivos:",
        "- poza azul verdosa del Salto do Curriola",
        "- pozas río arriba, en un tramo opcional",
        "Entrada: de pago en el lugar",
        "Guía Kalunga obligatorio",
        "Mejor época:",
        "Seca, de mayo a noviembre",
      ],
    ),
    html: L(
      `<p>O Salto do Curriola fica no Vão do Moleque, território Kalunga em Cavalcante, na Chapada dos Veadeiros. É uma queda do mesmo rio que abriga a Cachoeira do Guardião, mas é outro atrativo: o poço é mais perto da estrada e a trilha é curta.</p>
<h3><strong>O poço</strong></h3>
<p>A água desce de um paredão estreito para um poço azul-esverdeado, cercado de mata. A trilha principal tem cerca de 2 km ida e volta. Quem quiser segue rio acima por mais uns 4 km, passando por outros poços.</p>
<h3><strong>Como chegar</strong></h3>
<p>O acesso curto, cerca de 53 km desde Cavalcante, sobe a estrada do Maquiné a partir do Engenho II. É serra de 4x4. Existe um contorno bem mais longo, pela estrada do Complexo do Prata, que carro comum enfrenta na seca. O guia Kalunga é obrigatório e a entrada é da comunidade.</p>
<h3><strong>Quando ir</strong></h3>
<p>A visitação se concentra na seca, de maio a novembro. Na chuva o rio enche e o atrativo costuma fechar. Calçado que molhe e um dia inteiro, se for juntar o Guardião.</p>`,
      `<p>Salto do Curriola is in Vão do Moleque, Kalunga land in Cavalcante, Chapada dos Veadeiros. It is a fall on the same river as Cachoeira do Guardião, but it is a separate place: the pool is closer to the road and the trail is short.</p>
<h3><strong>The pool</strong></h3>
<p>Water comes off a narrow wall into a blue-green pool, wrapped in forest. The main trail is about 2 km round trip. Anyone who wants can follow the river upstream for about 4 km more, past other pools.</p>
<h3><strong>How to get there</strong></h3>
<p>The short access, about 53 km from Cavalcante, climbs the Maquiné road out of Engenho II. It is 4x4 country. A much longer way around, by the Complexo do Prata road, is what an ordinary car attempts in the dry season. A Kalunga guide is required and the ticket belongs to the community.</p>
<h3><strong>When to go</strong></h3>
<p>Visits concentrate in the dry season, May to November. In the rains the river rises and the place usually closes. Bring shoes that can get wet, and a full day if you add Guardião.</p>`,
      `<p>El Salto do Curriola está en el Vão do Moleque, territorio Kalunga en Cavalcante, Chapada dos Veadeiros. Es una caída del mismo río que alberga la Cachoeira do Guardião, pero es otro atractivo: la poza queda más cerca del camino y el sendero es corto.</p>
<h3><strong>La poza</strong></h3>
<p>El agua baja de una pared estrecha a una poza azul verdosa, rodeada de mata. El sendero principal tiene unos 2 km ida y vuelta. Quien quiera sigue río arriba unos 4 km más, pasando por otras pozas.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>El acceso corto, unos 53 km desde Cavalcante, sube el camino del Maquiné desde Engenho II. Es sierra de 4x4. Hay un rodeo mucho más largo, por el camino del Complejo do Prata, que el coche común intenta en la seca. El guía Kalunga es obligatorio y la entrada es de la comunidad.</p>
<h3><strong>Cuándo ir</strong></h3>
<p>La visita se concentra en la seca, de mayo a noviembre. Con lluvia el río crece y el lugar suele cerrar. Calzado que se moje y un día entero si se suma el Guardião.</p>`,
    ),
  }),
  spot({
    slug: "dragao-4x4-guia-chapada-veadeiros",
    file: "cachoeira-do-dragao-guia-chapada-veadeiros.jpg",
    map: { l: 88, t: 72, w: 8, h: 4 },
    title: L("Dragão", "Dragão", "Dragão"),
    lead: L(
      "Cachoeira do Dragão no cânion do Rio Macaquinhos, em São João d'Aliança, com trecho a nado na Chapada dos Veadeiros.",
      "Dragão waterfall in the Macaquinhos River canyon, in São João d'Aliança, with a swimming section in Chapada dos Veadeiros.",
      "Cascada del Dragão en el cañón del río Macaquinhos, en São João d'Aliança, con un tramo a nado en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 44 a 50 km, com longo trecho de terra",
        "Distância da Trilha (ida e volta): cerca de 9 a 13 km, conforme o ponto do carro",
        "Nível de Dificuldade: Difícil",
        "Atrativos:",
        "- queda de cerca de 90 m",
        "- cânion do Rio Macaquinhos",
        "- travessia aquática com neoprene",
        "Entrada: em torno de R$ 170, neoprene à parte",
        "Guia credenciado obrigatório",
        "Período recomendado para visitação:",
        "Somente na seca, de maio a outubro",
      ],
      [
        "Distance from Alto Paraíso: about 44 to 50 km, with a long dirt stretch",
        "Trail distance (round trip): about 9 to 13 km, depending on where the car stops",
        "Difficulty: Hard",
        "Highlights:",
        "- a fall of about 90 m",
        "- Macaquinhos River canyon",
        "- a water crossing in a wetsuit",
        "Entry: around R$ 170, wetsuit extra",
        "Accredited guide required",
        "Best time to visit:",
        "Dry season only, May to October",
      ],
      [
        "Distancia desde Alto Paraíso: unos 44 a 50 km, con un largo tramo de tierra",
        "Distancia del sendero (ida y vuelta): unos 9 a 13 km, según dónde pare el coche",
        "Dificultad: Difícil",
        "Atractivos:",
        "- caída de unos 90 m",
        "- cañón del río Macaquinhos",
        "- travesía acuática con neopreno",
        "Entrada: alrededor de R$ 170, neopreno aparte",
        "Guía acreditado obligatorio",
        "Mejor época:",
        "Solo en la seca, de mayo a octubre",
      ],
    ),
    html: L(
      `<p>A Cachoeira do Dragão fica no cânion do Rio Macaquinhos, em São João d'Aliança, na Chapada dos Veadeiros. A queda passa dos 90 metros, entre paredões altos. O passeio é de 4x4 porque a estrada de terra é longa e o retorno sobe forte.</p>
<h3><strong>Duas etapas</strong></h3>
<p>Primeiro vem a descida seca, de alguns quilômetros, até a base. Depois o grupo veste neoprene, capacete e colete e caminha dentro do cânion, com trechos a nado. O neoprene é alugado no atrativo. Não se entra debaixo da queda: há risco de queda de pedra.</p>
<h3><strong>Como chegar</strong></h3>
<p>De Alto Paraíso são cerca de 44 a 50 km, a maior parte em terra depois da GO-118. O passeio também sai de São Jorge. A trilha completa, ida e volta, fica entre 9 e 13 km conforme o carro pare mais perto ou mais longe. Há quadriciclo opcional na subida de volta.</p>
<h3><strong>Janela do ano</strong></h3>
<p>O cânion só abre na seca, em geral de maio a outubro, com entrada pela manhã. Fora dessa janela a água no corredor não deixa margem. É um dia inteiro, com guia credenciado e grupo pequeno.</p>`,
      `<p>Dragão waterfall is in the canyon of the Macaquinhos River, in São João d'Aliança, Chapada dos Veadeiros. The drop is past 90 meters, between high walls. The tour is a 4x4 day because the dirt road is long and the way back climbs hard.</p>
<h3><strong>Two stages</strong></h3>
<p>First comes the dry descent, a few kilometers, to the base. Then the group puts on a wetsuit, helmet and vest and walks inside the canyon, with swimming stretches. The wetsuit is rented at the site. Do not go under the fall: rockfall is the risk.</p>
<h3><strong>How to get there</strong></h3>
<p>From Alto Paraíso it is about 44 to 50 km, most of it dirt after GO-118. The tour also leaves from São Jorge. The full trail, round trip, runs from 9 to 13 km depending on where the car stops. An optional quad bike covers the climb back.</p>
<h3><strong>Season</strong></h3>
<p>The canyon opens only in the dry season, usually May to October, with morning entry. Outside that window the water in the corridor leaves no margin. It is a full day, with an accredited guide and a small group.</p>`,
      `<p>La cascada del Dragão está en el cañón del río Macaquinhos, en São João d'Aliança, Chapada dos Veadeiros. La caída pasa de 90 metros, entre paredes altas. El paseo es de 4x4 porque el camino de tierra es largo y la vuelta sube fuerte.</p>
<h3><strong>Dos etapas</strong></h3>
<p>Primero viene la bajada seca, de algunos kilómetros, hasta la base. Después el grupo se pone neopreno, casco y chaleco y camina dentro del cañón, con tramos a nado. El neopreno se alquila en el atractivo. No se entra debajo de la caída: hay riesgo de desprendimiento.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde Alto Paraíso hay unos 44 a 50 km, la mayor parte en tierra después de la GO-118. El paseo también sale de São Jorge. El sendero completo, ida y vuelta, queda entre 9 y 13 km según dónde pare el coche. Hay cuatrimoto opcional en la subida de vuelta.</p>
<h3><strong>Ventana del año</strong></h3>
<p>El cañón solo abre en la seca, en general de mayo a octubre, con entrada por la mañana. Fuera de esa ventana el agua en el corredor no deja margen. Es un día entero, con guía acreditado y grupo pequeño.</p>`,
    ),
  }),
  spot({
    slug: "guardiao-4x4-guia-chapada-veadeiros",
    file: "guardiao-4x4-guia-chapada-veadeiros-mapa.jpg",
    map: { l: 64, t: 9, w: 9, h: 4 },
    title: L("Guardião", "Guardião", "Guardião"),
    lead: L(
      "Cachoeira do Guardião no cânion do Rio Curriola, Vão do Moleque, em Cavalcante, na Chapada dos Veadeiros.",
      "Guardião waterfall in the Curriola River canyon, Vão do Moleque, in Cavalcante, Chapada dos Veadeiros.",
      "Cascada del Guardião en el cañón del río Curriola, Vão do Moleque, en Cavalcante, Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 70 km de terra",
        "Distância da Trilha (ida e volta): cerca de 6 km, quase toda no rio",
        "Nível de Dificuldade: Difícil",
        "Atrativos:",
        "- poço azul no fim do cânion",
        "- trampolim natural de pedra",
        "- leito do Rio Curriola",
        "Entrada: cobrada no local",
        "Guia Kalunga obrigatório",
        "Período recomendado para visitação:",
        "Seca, de maio a novembro",
      ],
      [
        "Distance from Cavalcante: about 70 km of dirt road",
        "Trail distance (round trip): about 6 km, almost all in the river",
        "Difficulty: Hard",
        "Highlights:",
        "- a blue pool at the end of the canyon",
        "- a natural rock jump",
        "- the bed of the Curriola River",
        "Entry: paid on site",
        "Kalunga guide required",
        "Best time to visit:",
        "Dry season, May to November",
      ],
      [
        "Distancia desde Cavalcante: unos 70 km de tierra",
        "Distancia del sendero (ida y vuelta): unos 6 km, casi todo en el río",
        "Dificultad: Difícil",
        "Atractivos:",
        "- poza azul al final del cañón",
        "- trampolín natural de piedra",
        "- lecho del río Curriola",
        "Entrada: de pago en el lugar",
        "Guía Kalunga obligatorio",
        "Mejor época:",
        "Seca, de mayo a noviembre",
      ],
    ),
    html: L(
      `<p>A Cachoeira do Guardião fica no Vão do Moleque, território Kalunga em Cavalcante, na Chapada dos Veadeiros. A queda fecha um cânion do Rio Curriola. O poço é azul e fundo, com uma laje que serve de trampolim. Quase toda a trilha é dentro do rio.</p>
<h3><strong>A trilha</strong></h3>
<p>São cerca de 3 km por sentido, 6 km ida e volta, em pedra molhada no fundo do cânion. O sol entra na queda mais ou menos entre 10h e 14h. Fora da seca o volume sobe e o passeio fecha pelo risco de cabeça d'água.</p>
<h3><strong>Como chegar</strong></h3>
<p>De Cavalcante são cerca de 70 km pela GO-241, terra o caminho inteiro. 4x4 é o veículo do passeio. O guia é Kalunga e a entrada é da comunidade, à parte da diária do condutor.</p>
<h3><strong>Vizinha</strong></h3>
<p>O Salto do Curriola é outro poço do mesmo rio, com trilha mais curta. Juntar os dois pede saída cedo e perna para o dia inteiro. Leve calçado que molhe e uma troca de roupa no carro.</p>`,
      `<p>Guardião waterfall is in Vão do Moleque, Kalunga land in Cavalcante, Chapada dos Veadeiros. The fall closes a canyon of the Curriola River. The pool is blue and deep, with a slab that works as a jump. Almost the whole trail is in the river.</p>
<h3><strong>The trail</strong></h3>
<p>It is about 3 km each way, 6 km round trip, on wet rock at the bottom of the canyon. Sun reaches the fall roughly between 10 a.m. and 2 p.m. Outside the dry season the volume rises and the tour closes because of flash-flood risk.</p>
<h3><strong>How to get there</strong></h3>
<p>From Cavalcante it is about 70 km on GO-241, dirt the whole way. A 4x4 is the vehicle for this tour. The guide is Kalunga and the ticket belongs to the community, separate from the guide's day rate.</p>
<h3><strong>Neighbor</strong></h3>
<p>Salto do Curriola is another pool on the same river, with a shorter trail. Doing both means an early start and legs for a full day. Bring shoes that can get wet and a change of clothes in the car.</p>`,
      `<p>La cascada del Guardião está en el Vão do Moleque, territorio Kalunga en Cavalcante, Chapada dos Veadeiros. La caída cierra un cañón del río Curriola. La poza es azul y honda, con una losa que sirve de trampolín. Casi todo el sendero va dentro del río.</p>
<h3><strong>El sendero</strong></h3>
<p>Hay unos 3 km por sentido, 6 km ida y vuelta, en piedra mojada al fondo del cañón. El sol entra en la caída más o menos entre las 10 h y las 14 h. Fuera de la seca el caudal sube y el paseo cierra por riesgo de crecida.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde Cavalcante hay unos 70 km por la GO-241, tierra todo el camino. El 4x4 es el vehículo del paseo. El guía es Kalunga y la entrada es de la comunidad, aparte de la diaria del conductor.</p>
<h3><strong>Vecina</strong></h3>
<p>El Salto do Curriola es otra poza del mismo río, con un sendero más corto. Juntar las dos pide salida temprano y piernas para el día entero. Lleva calzado que se moje y ropa de cambio en el coche.</p>`,
    ),
  }),
  spot({
    slug: "lajeado-guia-chapada-veadeiros",
    file: "cachoeira-do-lajeado-guia-chapada-veadeiros-sao-jorge.jpg",
    map: { l: 20, t: 78, w: 7, h: 4 },
    title: L("Lajeado", "Lajeado", "Lajeado"),
    lead: L(
      "Trilha curta e sombreada a poucos quilômetros de São Jorge, com poços de córrego na Chapada dos Veadeiros.",
      "A short, shaded trail a few kilometers from São Jorge, with creek pools in Chapada dos Veadeiros.",
      "Un sendero corto y sombreado a pocos kilómetros de São Jorge, con pozas de arroyo en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de São Jorge: cerca de 6 km",
        "Distância de Alto Paraíso: cerca de 41 km",
        "Distância da Trilha (ida e volta): cerca de 1,2 km",
        "Nível de Dificuldade: Leve",
        "Atrativos:",
        "- Banho das Crianças",
        "- queda principal com prainha",
        "- escorregador natural",
        "Entrada: cobrada na recepção",
        "Melhor na cheia do córrego",
        "Período recomendado para visitação:",
        "Chuvas, quando o córrego tem água",
      ],
      [
        "Distance from São Jorge: about 6 km",
        "Distance from Alto Paraíso: about 41 km",
        "Trail distance (round trip): about 1.2 km",
        "Difficulty: Easy",
        "Highlights:",
        "- children's pool",
        "- main fall with a small beach",
        "- natural slide",
        "Entry: paid at reception",
        "Best when the creek is full",
        "Best time to visit:",
        "The rains, when the creek has water",
      ],
      [
        "Distancia desde São Jorge: unos 6 km",
        "Distancia desde Alto Paraíso: unos 41 km",
        "Distancia del sendero (ida y vuelta): unos 1,2 km",
        "Dificultad: Fácil",
        "Atractivos:",
        "- baño de los niños",
        "- caída principal con playita",
        "- tobogán natural",
        "Entrada: de pago en la recepción",
        "Mejor con el arroyo lleno",
        "Mejor época:",
        "Las lluvias, cuando el arroyo tiene agua",
      ],
    ),
    html: L(
      `<p>A Cachoeira do Lajeado fica a cerca de 6 km da Vila de São Jorge, na Chapada dos Veadeiros, na mesma região da Raizama. É um córrego de três paradas: um banho raso, a queda principal com uma prainha e um escorregador de pedra no poço mais fundo.</p>
<h3><strong>A trilha</strong></h3>
<p>Da recepção aos três pontos são cerca de 600 metros, pouco mais de 1 km ida e volta, em trilha sombreada e fácil. Serve para família e para quem quer um banho sem comprometer o resto do dia. O córrego perde força na seca e, no auge do inverno, a visitação pode fechar. Confirme antes de sair.</p>
<h3><strong>Como chegar</strong></h3>
<p>Siga a GO-239 depois de São Jorge por cerca de 2 km e entre à esquerda na placa. São mais uns 3 km de terra, em geral transitável de carro comum. De Alto Paraíso o total fica na casa de 41 km.</p>
<h3><strong>Cuidado com o nome</strong></h3>
<p>Existe outro Lajeado no complexo Chapada Alta, a nordeste de Alto Paraíso. Este aqui é o da Vila de São Jorge. A entrada é cobrada na recepção.</p>
<p><em>Foto: A. Duarte, ${CC20}.</em></p>`,
      `<p>Lajeado waterfall is about 6 km from Vila de São Jorge, in Chapada dos Veadeiros, in the same area as Raizama. It is a creek with three stops: a shallow pool, the main fall with a small beach, and a rock slide into the deepest pool.</p>
<h3><strong>The trail</strong></h3>
<p>From reception to the three spots is about 600 meters, a little over 1 km round trip, on a shaded, easy path. It suits families and anyone who wants a swim without using the whole day. The creek weakens in the dry season and, at the height of winter, the visit can close. Confirm before you leave.</p>
<h3><strong>How to get there</strong></h3>
<p>Follow GO-239 past São Jorge for about 2 km and turn left at the sign. Another 3 km of dirt is usually fine for an ordinary car. From Alto Paraíso the total is about 41 km.</p>
<h3><strong>Watch the name</strong></h3>
<p>There is another Lajeado in the Chapada Alta complex, northeast of Alto Paraíso. This one belongs to Vila de São Jorge. Entry is paid at reception.</p>
<p><em>Photo: A. Duarte, ${CC20}.</em></p>`,
      `<p>La cascada del Lajeado queda a unos 6 km de la Vila de São Jorge, en la Chapada dos Veadeiros, en la misma zona que Raizama. Es un arroyo de tres paradas: un baño poco hondo, la caída principal con una playita y un tobogán de piedra en la poza más honda.</p>
<h3><strong>El sendero</strong></h3>
<p>De la recepción a los tres puntos hay unos 600 metros, poco más de 1 km ida y vuelta, en un camino sombreado y fácil. Sirve para familia y para quien quiere un baño sin ocupar el resto del día. El arroyo pierde fuerza en la seca y, en pleno invierno, la visita puede cerrar. Confirma antes de salir.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Sigue la GO-239 después de São Jorge unos 2 km y entra a la izquierda en el cartel. Hay unos 3 km más de tierra, en general transitables en coche común. Desde Alto Paraíso el total ronda 41 km.</p>
<h3><strong>Cuidado con el nombre</strong></h3>
<p>Hay otro Lajeado en el complejo Chapada Alta, al noreste de Alto Paraíso. Este es el de la Vila de São Jorge. La entrada se paga en la recepción.</p>
<p><em>Foto: A. Duarte, ${CC20}.</em></p>`,
    ),
  }),
  spot({
    slug: "mirante-da-janela-noturno-guia-chapada-veadeiros",
    file: "mirante-da-janela-noturno-guia-chapada-veadeiros-sao-jorge.jpg",
    mapOf: "mirante-janela-cachoeira-abismo-guia-chapada-veadeiros-sao-jorge",
    title: L("Mirante da Janela Noturno", "Mirante da Janela at night", "Mirador de la Ventana nocturno"),
    lead: L(
      "O Mirante da Janela do Parque Nacional da Chapada dos Veadeiros depois que o sol se põe, saindo de São Jorge.",
      "Mirante da Janela in Chapada dos Veadeiros National Park after sunset, leaving from São Jorge.",
      "El Mirador de la Ventana del Parque Nacional da Chapada dos Veadeiros después de la puesta de sol, saliendo de São Jorge.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 31 km, mais 4 km de terra até a portaria",
        "Distância da Trilha (ida e volta): cerca de 8 km",
        "Nível de Dificuldade: Moderado",
        "Atrativos:",
        "- Mirante da Janela à noite",
        "- céu do cerrado sem luz da vila",
        "- mesma trilha do passeio diurno",
        "Ingresso do Parque Nacional",
        "Saída noturna com guia",
        "Período recomendado para visitação:",
        "Noites secas e sem lua cheia, se o objetivo for o céu",
      ],
      [
        "Distance from Alto Paraíso: about 31 km, plus 4 km of dirt to the gate",
        "Trail distance (round trip): about 8 km",
        "Difficulty: Moderate",
        "Highlights:",
        "- Mirante da Janela at night",
        "- cerrado sky away from the village lights",
        "- the same trail as the daytime visit",
        "National Park ticket",
        "Night departure with a guide",
        "Best time to visit:",
        "Dry, moonless nights if the sky is the goal",
      ],
      [
        "Distancia desde Alto Paraíso: unos 31 km, más 4 km de tierra hasta la portería",
        "Distancia del sendero (ida y vuelta): unos 8 km",
        "Dificultad: Moderada",
        "Atractivos:",
        "- Mirador de la Ventana de noche",
        "- cielo del cerrado lejos de las luces del pueblo",
        "- el mismo sendero de la visita diurna",
        "Entrada del Parque Nacional",
        "Salida nocturna con guía",
        "Mejor época:",
        "Noches secas y sin luna llena, si el objetivo es el cielo",
      ],
    ),
    html: L(
      `<p>O Mirante da Janela Noturno é o mesmo mirante do Parque Nacional da Chapada dos Veadeiros, visitado depois do pôr do sol. De dia ele é um dos cartões do parque. À noite o vale some e fica o céu do cerrado, longe da luz da vila.</p>
<h3><strong>A trilha</strong></h3>
<p>O percurso é o da visita diurna: cerca de 8 km ida e volta, nível moderado, com trechos de pedra. No escuro o mesmo chão pede lanterna de cabeça, passo curto e grupo junto. Não é um passeio para correr.</p>
<h3><strong>Como chegar</strong></h3>
<p>A portaria fica em São Jorge, a cerca de 31 km de Alto Paraíso pela GO-239, mais uns 4 km de terra. O ingresso é o do Parque Nacional e a saída noturna segue a regra do ICMBio e do guia no dia. O mapa desta página marca o Mirante da Janela, que é o mesmo lugar.</p>
<h3><strong>O que levar</strong></h3>
<p>Agasalho, lanterna com pilha sobrando, água e calçado fechado. A foto desta página mostra o mirante de dia, para reconhecer o lugar. O passeio em si acontece com o vale já escuro.</p>`,
      `<p>The night visit to Mirante da Janela is the same lookout in Chapada dos Veadeiros National Park, after sunset. By day it is one of the park's postcards. At night the valley disappears and the cerrado sky remains, away from the village lights.</p>
<h3><strong>The trail</strong></h3>
<p>The route is the daytime one: about 8 km round trip, moderate, with rocky sections. In the dark the same ground wants a headlamp, short steps and the group kept together. This is not a tour for rushing.</p>
<h3><strong>How to get there</strong></h3>
<p>The gate is in São Jorge, about 31 km from Alto Paraíso on GO-239, plus about 4 km of dirt. The ticket is the National Park's, and the night departure follows the ICMBio rule and the guide's call that day. The map on this page marks Mirante da Janela, which is the same place.</p>
<h3><strong>What to bring</strong></h3>
<p>A warm layer, a flashlight with spare batteries, water and closed shoes. The photo on this page shows the lookout by day, so you can recognize the place. The tour itself happens once the valley is dark.</p>`,
      `<p>El Mirador de la Ventana nocturno es el mismo mirador del Parque Nacional da Chapada dos Veadeiros, visitado después de la puesta de sol. De día es una de las postales del parque. De noche el valle desaparece y queda el cielo del cerrado, lejos de la luz del pueblo.</p>
<h3><strong>El sendero</strong></h3>
<p>El recorrido es el de la visita diurna: unos 8 km ida y vuelta, nivel moderado, con tramos de piedra. En la oscuridad el mismo suelo pide linterna frontal, paso corto y el grupo junto. No es un paseo para correr.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>La portería está en São Jorge, a unos 31 km de Alto Paraíso por la GO-239, más unos 4 km de tierra. La entrada es la del Parque Nacional y la salida nocturna sigue la regla del ICMBio y del guía ese día. El mapa de esta página marca el Mirador de la Ventana, que es el mismo lugar.</p>
<h3><strong>Qué llevar</strong></h3>
<p>Abrigo, linterna con pila de sobra, agua y calzado cerrado. La foto de esta página muestra el mirador de día, para reconocer el lugar. El paseo en sí ocurre con el valle ya oscuro.</p>`,
    ),
  }),
  spot({
    slug: "morada-do-sol-guia-chapada-veadeiros",
    file: "complexo-morada-do-sol-guia-chapada-veadeiros-sao-jorge.jpg",
    map: { l: 12, t: 70, w: 9, h: 4 },
    title: L("Morada do Sol", "Morada do Sol", "Morada do Sol"),
    lead: L(
      "Quatro trilhas no Rio São Miguel, na GO-239, a cerca de 6 km de São Jorge, na Chapada dos Veadeiros.",
      "Four trails on the São Miguel River, on GO-239, about 6 km from São Jorge, in Chapada dos Veadeiros.",
      "Cuatro senderos en el río São Miguel, en la GO-239, a unos 6 km de São Jorge, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de São Jorge: cerca de 6 km (4 km de asfalto e 2 km de terra)",
        "Distância de Alto Paraíso: cerca de 40 km",
        "Distância da Trilha (ida e volta): até cerca de 3 km, conforme o atrativo",
        "Nível de Dificuldade: Leve a moderado",
        "Atrativos:",
        "- Banho das Crianças",
        "- Cachoeira Morada do Sol",
        "- Vale das Andorinhas",
        "- Barra das Douradas",
        "Entrada: cerca de R$ 40, um ingresso para as quatro trilhas",
        "Período recomendado para visitação:",
        "Ano inteiro; na chuva, atenção a tromba no rio",
      ],
      [
        "Distance from São Jorge: about 6 km (4 km paved and 2 km dirt)",
        "Distance from Alto Paraíso: about 40 km",
        "Trail distance (round trip): up to about 3 km, depending on the stop",
        "Difficulty: Easy to moderate",
        "Highlights:",
        "- children's pool",
        "- Morada do Sol waterfall",
        "- Vale das Andorinhas",
        "- Barra das Douradas",
        "Entry: about R$ 40, one ticket for all four trails",
        "Best time to visit:",
        "Year-round; in the rains, watch for river surges",
      ],
      [
        "Distancia desde São Jorge: unos 6 km (4 km de asfalto y 2 km de tierra)",
        "Distancia desde Alto Paraíso: unos 40 km",
        "Distancia del sendero (ida y vuelta): hasta unos 3 km, según la parada",
        "Dificultad: Fácil a moderada",
        "Atractivos:",
        "- baño de los niños",
        "- cascada Morada do Sol",
        "- Vale das Andorinhas",
        "- Barra das Douradas",
        "Entrada: unos R$ 40, una entrada para los cuatro senderos",
        "Mejor época:",
        "Todo el año; con lluvia, atención a las crecidas del río",
      ],
    ),
    html: L(
      `<p>O Complexo Morada do Sol fica na GO-239, km 85, sentido Colinas do Sul, a cerca de 6 km da Vila de São Jorge, na Chapada dos Veadeiros. Um ingresso abre quatro trilhas curtas no Rio São Miguel, quase planas, boas para família.</p>
<h3><strong>As quatro paradas</strong></h3>
<p>O Banho das Crianças fica a uns 150 metros da recepção. A Cachoeira Morada do Sol pede cerca de 900 metros. O Vale das Andorinhas, a uns 1,2 km, é borda de cânion: contemplação, sem banho naquele trecho. A Barra das Douradas fecha o conjunto, a cerca de 1,5 km. Canionismo e rapel existem mediante agendamento, à parte do banho.</p>
<h3><strong>Como chegar</strong></h3>
<p>De São Jorge são cerca de 4 km de asfalto e 2 km de terra até a recepção. De Alto Paraíso, cerca de 40 km. Carro comum chega com cuidado. A entrada costuma ser das 8h às 15h, com saída até as 17h.</p>
<h3><strong>Rio</strong></h3>
<p>Na chuva o São Miguel enche rápido. O guia ou a recepção fecha o trecho se a água subir. Leve comida se quiser ficar o dia; há restaurante no complexo em parte da temporada.</p>
<p><em>Fotos: Ricardo Henrique Pires de Sousa e Lucia Carvalho Horta, ${CC40}.</em></p>`,
      `<p>Complexo Morada do Sol is on GO-239, km 85, toward Colinas do Sul, about 6 km from Vila de São Jorge, in Chapada dos Veadeiros. One ticket opens four short trails on the São Miguel River, nearly flat, good for families.</p>
<h3><strong>The four stops</strong></h3>
<p>The children's pool is about 150 meters from reception. Morada do Sol waterfall is about 900 meters. Vale das Andorinhas, about 1.2 km, is a canyon rim: looking, not swimming on that stretch. Barra das Douradas closes the set, about 1.5 km. Canyoning and rappelling exist by appointment, separate from the swim.</p>
<h3><strong>How to get there</strong></h3>
<p>From São Jorge it is about 4 km of pavement and 2 km of dirt to reception. From Alto Paraíso, about 40 km. An ordinary car gets there with care. Entry is usually from 8 a.m. to 3 p.m., with exit by 5 p.m.</p>
<h3><strong>The river</strong></h3>
<p>In the rains the São Miguel rises fast. The guide or the desk closes the stretch if the water comes up. Bring food if you want to stay the day; the complex has a restaurant in part of the season.</p>
<p><em>Photos: Ricardo Henrique Pires de Sousa and Lucia Carvalho Horta, ${CC40}.</em></p>`,
      `<p>El Complejo Morada do Sol está en la GO-239, km 85, sentido Colinas do Sul, a unos 6 km de la Vila de São Jorge, en la Chapada dos Veadeiros. Una entrada abre cuatro senderos cortos en el río São Miguel, casi planos, buenos para familia.</p>
<h3><strong>Las cuatro paradas</strong></h3>
<p>El baño de los niños queda a unos 150 metros de la recepción. La cascada Morada do Sol pide unos 900 metros. El Vale das Andorinhas, a unos 1,2 km, es borde de cañón: contemplación, sin baño en ese tramo. Barra das Douradas cierra el conjunto, a unos 1,5 km. Barranquismo y rápel existen con reserva, aparte del baño.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde São Jorge hay unos 4 km de asfalto y 2 km de tierra hasta la recepción. Desde Alto Paraíso, unos 40 km. El coche común llega con cuidado. La entrada suele ser de 8 h a 15 h, con salida hasta las 17 h.</p>
<h3><strong>El río</strong></h3>
<p>Con lluvia el São Miguel crece rápido. El guía o la recepción cierra el tramo si el agua sube. Lleva comida si quieres quedarte el día; el complejo tiene restaurante en parte de la temporada.</p>
<p><em>Fotos: Ricardo Henrique Pires de Sousa y Lucia Carvalho Horta, ${CC40}.</em></p>`,
    ),
  }),
  spot({
    slug: "parque-nacional-noturno-guia-chapada-veadeiros",
    file: "parque-nacional-noturno-guia-chapada-veadeiros-sao-jorge.jpg",
    mapOf: "parque-nacional-chapada-veadeiros-saltos-rio-preto-sao-jorge",
    title: L("Parque Nacional Noturno", "National Park at night", "Parque Nacional nocturno"),
    lead: L(
      "Saída noturna no Parque Nacional da Chapada dos Veadeiros, a partir de São Jorge, com o cerrado já escuro.",
      "A night outing in Chapada dos Veadeiros National Park, from São Jorge, once the cerrado is dark.",
      "Una salida nocturna en el Parque Nacional da Chapada dos Veadeiros, desde São Jorge, con el cerrado ya oscuro.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 36 km até São Jorge, portaria do parque",
        "Distância da Trilha: a combinada com o guia e a regra do ICMBio no dia",
        "Nível de Dificuldade: Moderado",
        "Atrativos:",
        "- cerrado à noite",
        "- céu estrelado longe da cidade",
        "- trilhas do Parque Nacional",
        "Ingresso do Parque Nacional",
        "Saída com guia",
        "Período recomendado para visitação:",
        "Noites secas, dentro do horário autorizado",
      ],
      [
        "Distance from Alto Paraíso: about 36 km to São Jorge, the park gate",
        "Trail distance: the one agreed with the guide and the ICMBio rule that day",
        "Difficulty: Moderate",
        "Highlights:",
        "- the cerrado at night",
        "- a starred sky away from town",
        "- National Park trails",
        "National Park ticket",
        "Departure with a guide",
        "Best time to visit:",
        "Dry nights, inside the authorized hours",
      ],
      [
        "Distancia desde Alto Paraíso: unos 36 km hasta São Jorge, portería del parque",
        "Distancia del sendero: la acordada con el guía y la regla del ICMBio ese día",
        "Dificultad: Moderada",
        "Atractivos:",
        "- el cerrado de noche",
        "- cielo estrellado lejos de la ciudad",
        "- senderos del Parque Nacional",
        "Entrada del Parque Nacional",
        "Salida con guía",
        "Mejor época:",
        "Noches secas, dentro del horario autorizado",
      ],
    ),
    html: L(
      `<p>O Parque Nacional Noturno é a visita ao Parque Nacional da Chapada dos Veadeiros depois do fechamento do movimento diurno. O parque, em São Jorge, guarda os Saltos do Rio Preto, os cânions, as Cariocas e o Mirante da Janela. À noite o passeio não repete o banho do dia: o foco é o cerrado escuro, o som da mata e o céu.</p>
<h3><strong>O que muda</strong></h3>
<p>A trilha do dia tem horário, cota de visitantes e ingresso do ICMBio. A saída noturna segue a autorização vigente e o guia que conduz o grupo. Não há banho noturno nos saltos. Lanterna, agasalho e grupo fechado fazem parte do combinado.</p>
<h3><strong>Como chegar</strong></h3>
<p>A portaria principal fica na Vila de São Jorge, a cerca de 36 km de Alto Paraíso pela GO-239. O passeio sai de Alto Paraíso ou de São Jorge. O mapa desta página marca os Saltos do Rio Preto, a trilha mais conhecida do parque, porque o mapa ilustrado não tem um pino só para a noite.</p>
<h3><strong>A foto</strong></h3>
<p>A imagem mostra o parque de dia, no trecho dos saltos, para situar o lugar. O passeio noturno acontece com o sol já ido.</p>`,
      `<p>The night National Park visit is Chapada dos Veadeiros National Park after the daytime flow has closed. The park, in São Jorge, holds the Saltos do Rio Preto, the canyons, the Cariocas and Mirante da Janela. At night the tour does not repeat the daytime swim: the focus is the dark cerrado, the sound of the forest and the sky.</p>
<h3><strong>What changes</strong></h3>
<p>The day trail has hours, a visitor cap and an ICMBio ticket. The night departure follows the authorization in force and the guide leading the group. There is no night swimming at the falls. A flashlight, a warm layer and a closed group are part of the plan.</p>
<h3><strong>How to get there</strong></h3>
<p>The main gate is in Vila de São Jorge, about 36 km from Alto Paraíso on GO-239. The tour leaves from Alto Paraíso or São Jorge. The map on this page marks Saltos do Rio Preto, the park's best-known trail, because the illustrated map has no pin only for the night.</p>
<h3><strong>The photo</strong></h3>
<p>The image shows the park by day, on the falls section, so you can place it. The night tour happens after the sun is gone.</p>`,
      `<p>El Parque Nacional nocturno es la visita al Parque Nacional da Chapada dos Veadeiros después de que cierra el movimiento diurno. El parque, en São Jorge, guarda los Saltos do Rio Preto, los cañones, las Cariocas y el Mirador de la Ventana. De noche el paseo no repite el baño del día: el foco es el cerrado oscuro, el sonido de la mata y el cielo.</p>
<h3><strong>Qué cambia</strong></h3>
<p>El sendero de día tiene horario, cupo de visitantes y entrada del ICMBio. La salida nocturna sigue la autorización vigente y el guía que conduce el grupo. No hay baño nocturno en los saltos. Linterna, abrigo y grupo cerrado forman parte del acuerdo.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>La portería principal está en la Vila de São Jorge, a unos 36 km de Alto Paraíso por la GO-239. El paseo sale de Alto Paraíso o de São Jorge. El mapa de esta página marca los Saltos do Rio Preto, el sendero más conocido del parque, porque el mapa ilustrado no tiene un pin solo para la noche.</p>
<h3><strong>La foto</strong></h3>
<p>La imagen muestra el parque de día, en el tramo de los saltos, para situar el lugar. El paseo nocturno ocurre con el sol ya ido.</p>`,
    ),
  }),
  spot({
    slug: "raizama-guia-chapada-veadeiros",
    file: "santuario-raizama-guia-chapada-veadeiros-sao-jorge.jpg",
    map: { l: 13, t: 78, w: 7, h: 4 },
    title: L("Raizama", "Raizama", "Raizama"),
    lead: L(
      "Santuário no cânion do Rio São Miguel, a poucos quilômetros de São Jorge, na Chapada dos Veadeiros.",
      "A sanctuary in the São Miguel River canyon, a few kilometers from São Jorge, in Chapada dos Veadeiros.",
      "Un santuario en el cañón del río São Miguel, a pocos kilómetros de São Jorge, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de São Jorge: cerca de 2 a 6 km de terra",
        "Distância de Alto Paraíso: cerca de 42 km",
        "Distância da Trilha (ida e volta): cerca de 2,6 km",
        "Nível de Dificuldade: Leve a moderado",
        "Atrativos:",
        "- cânion do Rio São Miguel",
        "- poços e hidromassagem natural",
        "- mirantes na borda",
        "Entrada: cobrada na recepção do santuário",
        "Período recomendado para visitação:",
        "Abril a novembro; na chuva, menos paradas de banho",
      ],
      [
        "Distance from São Jorge: about 2 to 6 km of dirt road",
        "Distance from Alto Paraíso: about 42 km",
        "Trail distance (round trip): about 2.6 km",
        "Difficulty: Easy to moderate",
        "Highlights:",
        "- São Miguel River canyon",
        "- pools and a natural jacuzzi",
        "- rim lookouts",
        "Entry: paid at the sanctuary desk",
        "Best time to visit:",
        "April to November; in the rains, fewer swim stops",
      ],
      [
        "Distancia desde São Jorge: unos 2 a 6 km de tierra",
        "Distancia desde Alto Paraíso: unos 42 km",
        "Distancia del sendero (ida y vuelta): unos 2,6 km",
        "Dificultad: Fácil a moderada",
        "Atractivos:",
        "- cañón del río São Miguel",
        "- pozas e hidromasaje natural",
        "- miradores en el borde",
        "Entrada: de pago en la recepción del santuario",
        "Mejor época:",
        "Abril a noviembre; con lluvia, menos paradas de baño",
      ],
    ),
    html: L(
      `<p>O Santuário Raizama fica no cânion do Rio São Miguel, pertinho da Vila de São Jorge, na Chapada dos Veadeiros. A trilha anda na borda do cânion, com mirantes, poços e uma queda escondida entre as pedras. Não é o Vale da Lua: o vale é outro atrativo, muitas vezes feito no mesmo dia.</p>
<h3><strong>A trilha</strong></h3>
<p>São cerca de 2,6 km ida e volta, nível leve a moderado, com um trecho de descida e plataformas de madeira em parte do caminho. Na seca aparecem mais paradas de banho, inclusive um jato que funciona como hidromassagem. Na chuva o número de poços liberados diminui.</p>
<h3><strong>Como chegar</strong></h3>
<p>De São Jorge são poucos quilômetros de terra, na casa de 2 a 6 km conforme o ponto de partida na vila. De Alto Paraíso, cerca de 42 km, quase tudo asfalto na GO-239 e um final de terra. A recepção tem estacionamento. A entrada é cobrada no santuário.</p>
<h3><strong>Combinação</strong></h3>
<p>Raizama cabe numa manhã. À tarde, Vale da Lua ou Segredo são os vizinhos mais pedidos. Leve protetor solar: um pedaço da borda é aberto.</p>
<p><em>Foto: Augusto Miranda / Ministério do Turismo. Domínio público. Crédito obrigatório.</em></p>`,
      `<p>Santuário Raizama sits in the canyon of the São Miguel River, very close to Vila de São Jorge, in Chapada dos Veadeiros. The trail walks the canyon rim, with lookouts, pools and a fall hidden among the rocks. It is not Vale da Lua: that valley is another place, often done the same day.</p>
<h3><strong>The trail</strong></h3>
<p>It is about 2.6 km round trip, easy to moderate, with one descent and wooden platforms on part of the path. In the dry season more swim stops open, including a jet that works as a natural jacuzzi. In the rains fewer pools are open.</p>
<h3><strong>How to get there</strong></h3>
<p>From São Jorge it is a few kilometers of dirt, about 2 to 6 km depending on where you start in the village. From Alto Paraíso, about 42 km, almost all pavement on GO-239 and a dirt finish. Reception has parking. Entry is paid at the sanctuary.</p>
<h3><strong>Pairing</strong></h3>
<p>Raizama fits a morning. In the afternoon, Vale da Lua or Segredo are the neighbors people ask for most. Bring sunscreen: part of the rim is open.</p>
<p><em>Photo: Augusto Miranda / Ministry of Tourism. Public domain. Credit required.</em></p>`,
      `<p>El Santuario Raizama está en el cañón del río São Miguel, muy cerca de la Vila de São Jorge, en la Chapada dos Veadeiros. El sendero camina por el borde del cañón, con miradores, pozas y una caída escondida entre las piedras. No es el Vale da Lua: ese valle es otro atractivo, muchas veces hecho el mismo día.</p>
<h3><strong>El sendero</strong></h3>
<p>Hay unos 2,6 km ida y vuelta, nivel fácil a moderado, con un tramo de bajada y plataformas de madera en parte del camino. En la seca aparecen más paradas de baño, incluso un chorro que funciona como hidromasaje. Con lluvia baja el número de pozas abiertas.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde São Jorge hay pocos kilómetros de tierra, unos 2 a 6 km según el punto de salida en el pueblo. Desde Alto Paraíso, unos 42 km, casi todo asfalto en la GO-239 y un final de tierra. La recepción tiene estacionamiento. La entrada se paga en el santuario.</p>
<h3><strong>Combinación</strong></h3>
<p>Raizama cabe en una mañana. Por la tarde, Vale da Lua o Segredo son los vecinos más pedidos. Lleva protector solar: un tramo del borde está abierto.</p>
<p><em>Foto: Augusto Miranda / Ministerio de Turismo. Dominio público. Crédito obligatorio.</em></p>`,
    ),
  }),
  spot({
    slug: "sertao-zen-guia-chapada-veadeiros",
    file: "sertao-zen-guia-chapada-veadeiros-alto-paraiso-2.jpg",
    map: { l: 72, t: 56, w: 8, h: 4 },
    title: L("Sertão Zen", "Sertão Zen", "Sertão Zen"),
    lead: L(
      "Trilha longa na Serra da Baliza, com mirante sobre uma queda de cerca de 150 metros, perto de Alto Paraíso, na Chapada dos Veadeiros.",
      "A long trail on Serra da Baliza, with a lookout over a fall of about 150 meters, near Alto Paraíso, in Chapada dos Veadeiros.",
      "Un sendero largo en la Serra da Baliza, con mirador sobre una caída de unos 150 metros, cerca de Alto Paraíso, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: cerca de 10 km",
        "Distância da Trilha (ida e volta): cerca de 18 km",
        "Nível de Dificuldade: Difícil",
        "Atrativos:",
        "- Serra da Baliza",
        "- Banho Inca",
        "- mirante da queda de cerca de 150 m",
        "- nascente do Rio Macaco",
        "Entrada: gratuita",
        "Trilha pouco marcada; vá com guia",
        "Período recomendado para visitação:",
        "Seca, de maio a setembro",
      ],
      [
        "Distance from Alto Paraíso: about 10 km",
        "Trail distance (round trip): about 18 km",
        "Difficulty: Hard",
        "Highlights:",
        "- Serra da Baliza",
        "- Banho Inca",
        "- lookout over a fall of about 150 m",
        "- source of the Macaco River",
        "Entry: free",
        "Poorly marked trail; go with a guide",
        "Best time to visit:",
        "Dry season, May to September",
      ],
      [
        "Distancia desde Alto Paraíso: unos 10 km",
        "Distancia del sendero (ida y vuelta): unos 18 km",
        "Dificultad: Difícil",
        "Atractivos:",
        "- Serra da Baliza",
        "- Banho Inca",
        "- mirador de la caída de unos 150 m",
        "- nacimiento del río Macaco",
        "Entrada: gratuita",
        "Sendero poco marcado; ve con guía",
        "Mejor época:",
        "Seca, de mayo a septiembre",
      ],
    ),
    html: L(
      `<p>O Sertão Zen é um trekking a leste de Alto Paraíso, fora da cerca do Parque Nacional, na Chapada dos Veadeiros. A trilha sobe a Serra da Baliza, atravessa campo rupestre e chega a um mirante sobre uma queda de cerca de 150 metros, que despenca para o vale do Rio Macaco.</p>
<h3><strong>O caminho</strong></h3>
<p>São cerca de 9 km até o mirante, 18 km ida e volta, em seis a nove horas. O primeiro quilômetro sobe forte. Depois a trilha fica pouco nítida na pedra. No meio do caminho há o Banho Inca, uma cascata com poço escuro. Não há sinal de celular.</p>
<h3><strong>Como chegar</strong></h3>
<p>O estacionamento fica a cerca de 10 km de Alto Paraíso, em terra razoável. A entrada do atrativo é gratuita. Mesmo assim o passeio sai com guia: a marcação some e o sol é aberto.</p>
<h3><strong>Preparo</strong></h3>
<p>Leve no mínimo um litro e meio de água por pessoa, comida, chapéu e botina. Na chuva a laje escorrega. A melhor janela é a seca, de maio a setembro. A foto principal é um poço de pedra do percurso; a segunda mostra a escarpa da região.</p>
<p><em>Fotos: Guilherme Pitaluga e Bruno Posnik Roloff, ${CC40}.</em></p>`,
      `<p>Sertão Zen is a trek east of Alto Paraíso, outside the National Park fence, in Chapada dos Veadeiros. The trail climbs Serra da Baliza, crosses rocky grassland and reaches a lookout over a fall of about 150 meters, dropping into the Macaco River valley.</p>
<h3><strong>The path</strong></h3>
<p>It is about 9 km to the lookout, 18 km round trip, in six to nine hours. The first kilometer climbs hard. After that the trail fades on the rock. Midway there is Banho Inca, a small fall with a dark pool. There is no phone signal.</p>
<h3><strong>How to get there</strong></h3>
<p>The parking area is about 10 km from Alto Paraíso, on reasonable dirt. Entry is free. Even so the tour goes with a guide: the marks disappear and the sun is open.</p>
<h3><strong>Preparation</strong></h3>
<p>Carry at least a liter and a half of water per person, food, a hat and boots. In the rain the slab is slippery. The best window is the dry season, May to September. The main photo is a rock pool on the route; the second shows the escarpment of the area.</p>
<p><em>Photos: Guilherme Pitaluga and Bruno Posnik Roloff, ${CC40}.</em></p>`,
      `<p>Sertão Zen es un trekking al este de Alto Paraíso, fuera de la cerca del Parque Nacional, en la Chapada dos Veadeiros. El sendero sube la Serra da Baliza, cruza campo rocoso y llega a un mirador sobre una caída de unos 150 metros, que cae al valle del río Macaco.</p>
<h3><strong>El camino</strong></h3>
<p>Hay unos 9 km hasta el mirador, 18 km ida y vuelta, en seis a nueve horas. El primer kilómetro sube fuerte. Después el sendero se pierde en la piedra. A mitad hay el Banho Inca, una cascada con poza oscura. No hay señal de celular.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>El estacionamiento queda a unos 10 km de Alto Paraíso, en tierra razonable. La entrada es gratuita. Aun así el paseo sale con guía: la marcación desaparece y el sol está abierto.</p>
<h3><strong>Preparación</strong></h3>
<p>Lleva al menos un litro y medio de agua por persona, comida, sombrero y bota. Con lluvia la laja resbala. La mejor ventana es la seca, de mayo a septiembre. La foto principal es una poza de piedra del recorrido; la segunda muestra la escarpa de la región.</p>
<p><em>Fotos: Guilherme Pitaluga y Bruno Posnik Roloff, ${CC40}.</em></p>`,
    ),
  }),
  spot({
    slug: "simao-correia-guia-chapada-veadeiros",
    file: "cachoeira-simao-correia-guia-chapada-veadeiros.jpg",
    map: { l: 87, t: 46, w: 10, h: 4 },
    title: L("Simão Correia", "Simão Correia", "Simão Correia"),
    lead: L(
      "Cachoeira a leste de Alto Paraíso, depois da comunidade do Sertão, com trilha longa na Chapada dos Veadeiros.",
      "A waterfall east of Alto Paraíso, past the Sertão community, with a long trail in Chapada dos Veadeiros.",
      "Una cascada al este de Alto Paraíso, después de la comunidad del Sertão, con un sendero largo en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Alto Paraíso: estrada de terra na casa de 35 km, depois da comunidade do Sertão",
        "Distância da Trilha (ida): cerca de 6 km",
        "Nível de Dificuldade: Moderado a difícil",
        "Atrativos:",
        "- queda com poço",
        "- lajeado no caminho",
        "- outras cascatas na trilha",
        "Entrada: propriedade particular, combinar com o guia",
        "Vá com guia",
        "Período recomendado para visitação:",
        "Seca, com saída cedo",
      ],
      [
        "Distance from Alto Paraíso: a dirt road of about 35 km, past the Sertão community",
        "Trail distance (one way): about 6 km",
        "Difficulty: Moderate to hard",
        "Highlights:",
        "- a fall with a pool",
        "- a rock pavement on the way",
        "- other cascades on the trail",
        "Entry: private land, arrange it with the guide",
        "Go with a guide",
        "Best time to visit:",
        "Dry season, with an early start",
      ],
      [
        "Distancia desde Alto Paraíso: camino de tierra de unos 35 km, después de la comunidad del Sertão",
        "Distancia del sendero (ida): unos 6 km",
        "Dificultad: Moderada a difícil",
        "Atractivos:",
        "- caída con poza",
        "- lajeado en el camino",
        "- otras cascadas en el sendero",
        "Entrada: propiedad particular, combinar con el guía",
        "Ve con guía",
        "Mejor época:",
        "Seca, con salida temprano",
      ],
    ),
    html: L(
      `<p>A Cachoeira Simão Correia fica a leste de Alto Paraíso, depois da comunidade do Sertão, na borda da serra, na Chapada dos Veadeiros. Fica fora do circuito das cachoeiras mais visitadas. A queda junta altura, um poço e uma rocha retorcida no topo.</p>
<h3><strong>A trilha</strong></h3>
<p>A caminhada de ida fica na casa de 6 km, e o dia inteiro passa de 12 km se contar a volta. O caminho mistura beira de rio, pedra, uma subida e um lajedão, com cascatas menores antes da queda principal. O tempo no poço é o que organiza o retorno.</p>
<h3><strong>Como chegar</strong></h3>
<p>De carro são cerca de 35 km de terra, descendo o vale, passando pela entrada do Moinho, com a borda leste da serra ao lado. A fazenda é particular. O passeio sai com guia, cedo, porque a volta come a tarde.</p>
<h3><strong>No parque</strong></h3>
<p>O nome também aparece em documentos do Parque Nacional, entre atrativos do entorno que chegaram a ser citados na ampliação da unidade. A visitação vendida hoje é na propriedade rural, não numa trilha aberta da portaria de São Jorge.</p>`,
      `<p>Simão Correia waterfall is east of Alto Paraíso, past the Sertão community, on the rim of the ridge, in Chapada dos Veadeiros. It sits outside the circuit of the most visited falls. The drop brings height, a pool and twisted rock at the top.</p>
<h3><strong>The trail</strong></h3>
<p>The walk in is about 6 km, and the full day passes 12 km once you count the return. The path mixes riverbank, rock, a climb and a broad stone pavement, with smaller cascades before the main fall. Time at the pool is what sets the walk back.</p>
<h3><strong>How to get there</strong></h3>
<p>By car it is about 35 km of dirt, down the valley, past the Moinho turn, with the eastern rim of the ridge alongside. The farm is private. The tour leaves with a guide, early, because the return eats the afternoon.</p>
<h3><strong>And the park</strong></h3>
<p>The name also appears in National Park documents, among surrounding places mentioned when the unit was expanded. The visit sold today is on the private farm, not an open trail from the São Jorge gate.</p>`,
      `<p>La cascada Simão Correia está al este de Alto Paraíso, después de la comunidad del Sertão, en el borde de la sierra, en la Chapada dos Veadeiros. Queda fuera del circuito de las cascadas más visitadas. La caída junta altura, una poza y una roca retorcida en la cima.</p>
<h3><strong>El sendero</strong></h3>
<p>La caminata de ida ronda 6 km, y el día entero pasa de 12 km si se cuenta la vuelta. El camino mezcla orilla de río, piedra, una subida y un lajeado, con cascadas menores antes de la caída principal. El tiempo en la poza es lo que organiza el regreso.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>En coche hay unos 35 km de tierra, bajando el valle, pasando la entrada del Moinho, con el borde este de la sierra al lado. La hacienda es particular. El paseo sale con guía, temprano, porque la vuelta se come la tarde.</p>
<h3><strong>Y el parque</strong></h3>
<p>El nombre también aparece en documentos del Parque Nacional, entre atractivos del entorno citados cuando se amplió la unidad. La visita que se vende hoy es en la propiedad rural, no en un sendero abierto de la portería de São Jorge.</p>`,
    ),
  }),
  spot({
    slug: "veredas-guia-chapada-veadeiros",
    file: "complexo-veredas-guia-chapada-veadeiros-cavalcante.jpg",
    map: { l: 40, t: 22, w: 8, h: 4 },
    title: L("Veredas", "Veredas", "Veredas"),
    lead: L(
      "Fazenda Veredas, a cerca de 8 km de Cavalcante, com uma queda de quase 100 metros na Chapada dos Veadeiros.",
      "Fazenda Veredas, about 8 km from Cavalcante, with a fall of nearly 100 meters in Chapada dos Veadeiros.",
      "Hacienda Veredas, a unos 8 km de Cavalcante, con una caída de casi 100 metros en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 8 km (5 km de terra e 3 km dentro da fazenda)",
        "Distância da Trilha (ida e volta): cerca de 600 m até a queda principal; outras de 1,5 a 4,5 km",
        "Nível de Dificuldade: Leve na principal; moderado nas demais",
        "Atrativos:",
        "- Cachoeira Veredas, cerca de 98 m",
        "- Veredinha, Lara, Cascata e Escondidinha",
        "- Toca da Onça e Véu de Noiva",
        "Entrada: cobrada na fazenda, com agendamento",
        "Período recomendado para visitação:",
        "Chegar cedo para o circuito completo",
      ],
      [
        "Distance from Cavalcante: about 8 km (5 km of dirt and 3 km inside the farm)",
        "Trail distance (round trip): about 600 m to the main fall; others of 1.5 to 4.5 km",
        "Difficulty: Easy at the main fall; moderate on the others",
        "Highlights:",
        "- Veredas waterfall, about 98 m",
        "- Veredinha, Lara, Cascata and Escondidinha",
        "- Toca da Onça and Véu de Noiva",
        "Entry: paid at the farm, by appointment",
        "Best time to visit:",
        "Arrive early for the full circuit",
      ],
      [
        "Distancia desde Cavalcante: unos 8 km (5 km de tierra y 3 km dentro de la hacienda)",
        "Distancia del sendero (ida y vuelta): unos 600 m hasta la caída principal; otras de 1,5 a 4,5 km",
        "Dificultad: Fácil en la principal; moderada en las demás",
        "Atractivos:",
        "- Cascada Veredas, unos 98 m",
        "- Veredinha, Lara, Cascata y Escondidinha",
        "- Toca da Onça y Véu de Noiva",
        "Entrada: de pago en la hacienda, con reserva",
        "Mejor época:",
        "Llegar temprano para el circuito completo",
      ],
    ),
    html: L(
      `<p>O Complexo Veredas fica na Fazenda Veredas, a cerca de 8 km do centro de Cavalcante, na Chapada dos Veadeiros. A queda principal desce cerca de 98 metros dentro de um cânion. Uma passarela de uns 300 metros liga o estacionamento a esse primeiro mirante.</p>
<h3><strong>As outras quedas</strong></h3>
<p>O mesmo ingresso abre trilhas para Veredinha, Poço Encantado da fazenda, Lara, Cascata, Escondidinha, Toca da Onça e Véu de Noiva. Essas caminhadas ficam entre 1,5 e 4,5 km e sobem de dificuldade. O Véu de Noiva é o trecho que mais pede preparo. Quem chega entre 8h30 e 9h30 consegue circular o conjunto no mesmo dia.</p>
<h3><strong>Como chegar</strong></h3>
<p>Saia de Cavalcante no sentido de Colinas do Sul. São cerca de 5 km de terra até a portaria e mais 3 km de estrada interna até o estacionamento da queda principal. Carro comum encara na seca, com cuidado. A entrada é paga e o agendamento é da fazenda.</p>
<h3><strong>Não confundir</strong></h3>
<p>O Poço Encantado desta fazenda não é o Poço Encantado de Teresina de Goiás. São atrativos diferentes, em cidades diferentes.</p>
<p><em>Fotos: Laura Serradourada e Karina Eliane Quege, ${CC40}.</em></p>`,
      `<p>Complexo Veredas is at Fazenda Veredas, about 8 km from downtown Cavalcante, in Chapada dos Veadeiros. The main fall drops about 98 meters inside a canyon. A boardwalk of about 300 meters links the parking area to that first lookout.</p>
<h3><strong>The other falls</strong></h3>
<p>The same ticket opens trails to Veredinha, the farm's Poço Encantado, Lara, Cascata, Escondidinha, Toca da Onça and Véu de Noiva. Those walks run from 1.5 to 4.5 km and get harder. Véu de Noiva is the stretch that asks the most. Anyone who arrives between 8:30 and 9:30 a.m. can circle the set the same day.</p>
<h3><strong>How to get there</strong></h3>
<p>Leave Cavalcante toward Colinas do Sul. It is about 5 km of dirt to the gate and another 3 km of internal road to the main fall's parking. An ordinary car manages it in the dry season, with care. Entry is paid and the booking belongs to the farm.</p>
<h3><strong>Do not mix them up</strong></h3>
<p>This farm's Poço Encantado is not Poço Encantado in Teresina de Goiás. They are different places, in different towns.</p>
<p><em>Photos: Laura Serradourada and Karina Eliane Quege, ${CC40}.</em></p>`,
      `<p>El Complejo Veredas está en la Hacienda Veredas, a unos 8 km del centro de Cavalcante, en la Chapada dos Veadeiros. La caída principal baja unos 98 metros dentro de un cañón. Una pasarela de unos 300 metros une el estacionamiento con ese primer mirador.</p>
<h3><strong>Las otras caídas</strong></h3>
<p>La misma entrada abre senderos a Veredinha, el Poço Encantado de la hacienda, Lara, Cascata, Escondidinha, Toca da Onça y Véu de Noiva. Esas caminatas van de 1,5 a 4,5 km y suben de dificultad. El Véu de Noiva es el tramo que más pide preparación. Quien llega entre las 8:30 y las 9:30 puede recorrer el conjunto el mismo día.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Sal de Cavalcante hacia Colinas do Sul. Hay unos 5 km de tierra hasta la portería y 3 km más de camino interno hasta el estacionamiento de la caída principal. El coche común lo hace en la seca, con cuidado. La entrada se paga y la reserva es de la hacienda.</p>
<h3><strong>No confundir</strong></h3>
<p>El Poço Encantado de esta hacienda no es el Poço Encantado de Teresina de Goiás. Son atractivos distintos, en ciudades distintas.</p>
<p><em>Fotos: Laura Serradourada y Karina Eliane Quege, ${CC40}.</em></p>`,
    ),
  }),
  spot({
    slug: "sao-felix-guia-chapada-veadeiros",
    file: "cachoeira-sao-felix-guia-chapada-veadeiros-cavalcante.jpg",
    map: { l: 24.7, t: 16.3, w: 7.5, h: 7.7 },
    title: L("São Félix", "São Félix", "São Félix"),
    lead: L(
      "Prainha de areia clara e poço raso na fazenda São Félix, a noroeste de Cavalcante, na Chapada dos Veadeiros.",
      "A pale-sand river beach and a shallow pool at Fazenda São Félix, northwest of Cavalcante, in Chapada dos Veadeiros.",
      "Playa de río de arena clara y poza poco honda en la Hacienda São Félix, al noroeste de Cavalcante, en la Chapada dos Veadeiros.",
    ),
    info: L(
      [
        "Distância de Cavalcante: cerca de 68 km de terra",
        "Distância de Alto Paraíso: cerca de 160 km",
        "Distância da Trilha: cerca de 200 m",
        "Nível de Dificuldade: Fácil",
        "Atrativos:",
        "- prainha de areia clara",
        "- poço raso para banho",
        "- queda de cerca de 35 m",
        "Entrada: R$ 50 por pessoa",
        "Guia obrigatório",
        "Período recomendado para visitação:",
        "Seca, de maio a setembro. Na chuva a estrada de terra piora",
      ],
      [
        "Distance from Cavalcante: about 68 km of dirt road",
        "Distance from Alto Paraíso: about 160 km",
        "Trail distance: about 200 m",
        "Difficulty: Easy",
        "Highlights:",
        "- pale-sand river beach",
        "- shallow swimming pool",
        "- fall of about 35 m",
        "Entry: R$ 50 per person",
        "Guide required",
        "Best time to visit:",
        "Dry season, May to September. Rain makes the dirt road worse",
      ],
      [
        "Distancia desde Cavalcante: unos 68 km de tierra",
        "Distancia desde Alto Paraíso: unos 160 km",
        "Distancia del sendero: unos 200 m",
        "Dificultad: Fácil",
        "Atractivos:",
        "- playa de río de arena clara",
        "- poza poco honda para bañarse",
        "- caída de unos 35 m",
        "Entrada: R$ 50 por persona",
        "Guía obligatorio",
        "Mejor época:",
        "Seca, de mayo a septiembre. Con lluvia el camino de tierra empeora",
      ],
    ),
    html: L(
      `<p>A Cachoeira São Félix fica na fazenda de mesmo nome, a noroeste de Cavalcante, na Chapada dos Veadeiros. A prefeitura de Cavalcante descreve o lugar como a prainha do Cerrado: uma trilha curta, de cerca de 200 metros, abre uma faixa de areia clara e um poço raso. A queda tem cerca de 35 metros de altura, com um lance de corredeiras de cerca de 40 metros.</p>
<h3><strong>O banho</strong></h3>
<p>A água para na areia e forma um poço baixo, o que deixa o passeio confortável para família e para quem caminha pouco. Dá para passar o dia na sombra da mata, na beira da queda. O almoço da propriedade, quando a casa prepara, é por encomenda e não entra no valor do passeio.</p>
<h3><strong>Como chegar</strong></h3>
<p>Saindo de Cavalcante são cerca de 68 km de terra, no rumo de Minaçu, com uma bifurcação no caminho: um braço segue para o Rio da Prata e a Canjica, o outro passa pelo povoado de São Domingos e chega à fazenda. O trecho final pede carro alto e, depois da chuva, 4x4. De Alto Paraíso o percurso fica em torno de 160 km. Este passeio sai só de Cavalcante.</p>
<h3><strong>Entrada e guia</strong></h3>
<p>O ingresso de dia publicado pelos operadores é de R$ 50 por pessoa, pago na propriedade. A prefeitura não lista o valor no site da cidade, e anúncios mais antigos falavam em R$ 40: na hora da visita vale o que a fazenda estiver cobrando. O pernoite, quando existe, é outro valor, cobrado à parte. O acesso é com guia local.</p>
<p><em>Foto: João Carlos SC Barreto, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, Wikimedia Commons. A imagem foi redimensionada.</em></p>`,
      `<p>São Félix waterfall is on the farm of the same name, northwest of Cavalcante, in Chapada dos Veadeiros. The Cavalcante city page calls it the beach of the Cerrado: a short trail of about 200 meters opens onto a strip of pale sand and a shallow pool. The fall is about 35 meters high, with a run of rapids of about 40 meters.</p>
<h3><strong>The swim</strong></h3>
<p>The water stops on the sand and forms a low pool, which makes the visit comfortable for families and for anyone who walks little. The day can stay in the shade of the forest, at the edge of the fall. Lunch at the property, when the house cooks, is ordered ahead and is not part of the tour price.</p>
<h3><strong>How to get there</strong></h3>
<p>From Cavalcante it is about 68 km of dirt toward Minaçu, with a fork on the way: one arm goes to the Rio da Prata and Canjica, the other passes the village of São Domingos and reaches the farm. The last stretch needs a high car and, after rain, a 4x4. From Alto Paraíso the drive is about 160 km. This tour leaves only from Cavalcante.</p>
<h3><strong>Entry and guide</strong></h3>
<p>The day ticket published by operators is R$ 50 per person, paid at the property. The city website does not list the fee, and older ads said R$ 40: on the day, the farm's current charge is the one that counts. An overnight stay, when offered, is a separate fee. Access is with a local guide.</p>
<p><em>Photo: João Carlos SC Barreto, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, Wikimedia Commons. The image was resized.</em></p>`,
      `<p>La cascada São Félix está en la hacienda del mismo nombre, al noroeste de Cavalcante, en la Chapada dos Veadeiros. La página de la alcaldía llama al lugar la playa del Cerrado: un sendero corto, de unos 200 metros, abre una franja de arena clara y una poza poco honda. La caída tiene unos 35 metros de altura, con un tramo de rápidos de unos 40 metros.</p>
<h3><strong>El baño</strong></h3>
<p>El agua se detiene en la arena y forma una poza baja, lo que deja el paseo cómodo para familias y para quien camina poco. El día puede quedarse a la sombra del bosque, al borde de la caída. El almuerzo de la propiedad, cuando la casa cocina, se encarga antes y no entra en el precio del paseo.</p>
<h3><strong>Cómo llegar</strong></h3>
<p>Desde Cavalcante hay unos 68 km de tierra hacia Minaçu, con una bifurcación: un brazo sigue al Rio da Prata y a Canjica, el otro pasa por el pueblo de São Domingos y llega a la hacienda. El tramo final pide coche alto y, después de la lluvia, 4x4. Desde Alto Paraíso el recorrido ronda 160 km. Este paseo sale solo de Cavalcante.</p>
<h3><strong>Entrada y guía</strong></h3>
<p>La entrada de día publicada por los operadores es de R$ 50 por persona, pagada en la propiedad. El sitio de la ciudad no lista el valor, y anuncios más viejos hablaban de R$ 40: el día de la visita vale lo que la hacienda esté cobrando. El pernocte, cuando existe, es otro valor, cobrado aparte. El acceso es con guía local.</p>
<p><em>Foto: João Carlos SC Barreto, <a href="https://creativecommons.org/licenses/by-sa/4.0">CC BY-SA 4.0</a>, Wikimedia Commons. La imagen fue redimensionada.</em></p>`,
    ),
  }),
];

export const NEW_HOTSPOTS = RAW.map(({ map, ...rest }) => rest);

export const NEW_MAP_BOXES = Object.fromEntries(
  RAW.filter((item) => item.map).map((item) => [item.slug, item.map]),
);

export const NEW_DETAIL_IMAGES = Object.fromEntries(
  RAW.map((item) => [item.slug, `/${item.image}`]),
);

const GALLERY_EXTRA = {
  "canjica-aguas-lindas-guia-chapada-veadeiros": [
    gal(
      "complexo-aguas-lindas-canjica-guia-chapada-veadeiros-cavalcante-2.jpg",
      "Borda infinita do complexo Águas Lindas e Canjica na Chapada dos Veadeiros",
      "Borda infinita na Chapada dos Veadeiros",
    ),
  ],
  "capivara-guia-chapada-veadeiros": [
    gal(
      "cachoeira-capivara-guia-chapada-veadeiros-cavalcante-2.jpg",
      "Cachoeira da Capivara na Chapada dos Veadeiros, território Kalunga em Cavalcante",
      "Capivara na Chapada dos Veadeiros",
    ),
  ],
  "morada-do-sol-guia-chapada-veadeiros": [
    gal(
      "complexo-morada-do-sol-guia-chapada-veadeiros-sao-jorge-2.jpg",
      "Cânion do Complexo Morada do Sol na Chapada dos Veadeiros",
      "Cânion da Morada do Sol",
    ),
    gal(
      "complexo-morada-do-sol-guia-chapada-veadeiros-sao-jorge-3.jpg",
      "Poços de pedra do Complexo Morada do Sol na Chapada dos Veadeiros",
      "Poços da Morada do Sol",
    ),
  ],
  "sertao-zen-guia-chapada-veadeiros": [
    gal(
      "sertao-zen-guia-chapada-veadeiros-alto-paraiso.jpg",
      "Escarpa do Sertão Zen na Chapada dos Veadeiros",
      "Escarpa do Sertão Zen",
    ),
  ],
  "veredas-guia-chapada-veadeiros": [
    gal(
      "complexo-veredas-guia-chapada-veadeiros-cavalcante-2.jpg",
      "Cânion da Cachoeira Veredas em Cavalcante, na Chapada dos Veadeiros",
      "Cânion das Veredas",
    ),
  ],
};

const ALT_BY_SLUG = {
  "mirante-da-janela-noturno-guia-chapada-veadeiros":
    "Mirante da Janela no Parque Nacional da Chapada dos Veadeiros, fotografado de dia",
  "parque-nacional-noturno-guia-chapada-veadeiros":
    "Saltos do Rio Preto no Parque Nacional da Chapada dos Veadeiros, fotografados de dia",
  "candaru-guia-chapada-veadeiros": L(
    "Leito de pedra na Cachoeira Candaru, no quilombo Kalunga em Cavalcante, na Chapada dos Veadeiros",
    "Rock bed at Candaru waterfall, in the Kalunga quilombo in Cavalcante, Chapada dos Veadeiros",
    "Lecho de piedra en la cascada Candaru, en el quilombo Kalunga de Cavalcante, Chapada dos Veadeiros",
  ),
  "sao-felix-guia-chapada-veadeiros": L(
    "Cachoeira São Félix, prainha e queda na Chapada dos Veadeiros",
    "São Félix waterfall and river beach in Chapada dos Veadeiros",
    "Cascada São Félix y playa de río en la Chapada dos Veadeiros",
  ),
};

export const NEW_GALLERIES = Object.fromEntries(
  RAW.map((item) => {
    const file = item.image.replace(/^imagens\//, "");
    const alt = file.includes("-mapa.")
      ? `Recorte do mapa ilustrado de cachoeiras da Chapada dos Veadeiros, na marcação de ${item.title.pt}`
      : ALT_BY_SLUG[item.slug] || `${item.title.pt} na Chapada dos Veadeiros`;
    const main = gal(file, alt, `${item.title.pt} na Chapada dos Veadeiros`);
    const extras = (GALLERY_EXTRA[item.slug] || []).filter((entry) => entry.src !== main.src);
    return [item.slug, [main, ...extras]];
  }),
);

export const NEW_CACHOEIRA_SLUGS = RAW.filter((item) => !item.mapOf).map((item) => item.slug);
export const NEW_ECO_SLUGS = RAW.filter((item) => item.mapOf).map((item) => item.slug);
