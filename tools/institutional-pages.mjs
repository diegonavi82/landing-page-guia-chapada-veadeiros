/**
 * Páginas institucionais (sobre, privacidade, termos) em pt, en e es.
 * O texto de termos resume as políticas já aceitas no carrinho.
 */

/** @type {Record<string, Record<"pt"|"en"|"es", { h1: string, desc: string, sections: { h: string, paragraphs: string[] }[] }>>} */
export const INSTITUTIONAL = {
  "sobre.html": {
    pt: {
      h1: "Sobre o Guia Chapada Veadeiros",
      desc: "Quem organiza os passeios com guia local na Chapada dos Veadeiros, em Alto Paraíso de Goiás.",
      sections: [
        {
          h: "Quem somos",
          paragraphs: [
            "O Guia Chapada Veadeiros é o site de passeios e guias locais da Chapada dos Veadeiros, com base em Alto Paraíso de Goiás. Por aqui o visitante consulta cachoeiras, trilhas e roteiros e reserva vaga com guia credenciado no Cadastur.",
            "CNPJ 24.354.289/0001-05.",
          ],
        },
        {
          h: "Quem conduz",
          paragraphs: [
            "Diego Navi Marques Carvalho conduz o projeto. Em 2017 concluiu a formação de condutor local de visitantes de ecoturismo da Chapada dos Veadeiros e criou o Guia Chapada Veadeiros para orientar o planejamento da viagem e conectar o visitante a guias da região.",
          ],
        },
        {
          h: "Onde estamos",
          paragraphs: [
            "A base é Alto Paraíso de Goiás, na Chapada dos Veadeiros, Goiás, Brasil. O atendimento é por WhatsApp, telefone +55 62 98250-6891 e e-mail contato@guiachapadaveadeiros.com.",
          ],
        },
      ],
    },
    en: {
      h1: "About Guia Chapada Veadeiros",
      desc: "Who organizes local-guide tours in Chapada dos Veadeiros, based in Alto Paraíso de Goiás, Brazil.",
      sections: [
        {
          h: "Who we are",
          paragraphs: [
            "Guia Chapada Veadeiros is the local site for tours and guides in Chapada dos Veadeiros, based in Alto Paraíso de Goiás. Visitors look up waterfalls, trails and itineraries and book a place with a Cadastur-licensed guide.",
            "CNPJ 24.354.289/0001-05.",
          ],
        },
        {
          h: "Who runs it",
          paragraphs: [
            "Diego Navi Marques Carvalho runs the project. In 2017 he qualified as a local ecotourism visitor guide in Chapada dos Veadeiros and created Guia Chapada Veadeiros to help people plan the trip and reach guides in the region.",
          ],
        },
        {
          h: "Where we are",
          paragraphs: [
            "The base is Alto Paraíso de Goiás, in Chapada dos Veadeiros, Goiás, Brazil. Reach us on WhatsApp, by phone at +55 62 98250-6891, or by email at contato@guiachapadaveadeiros.com.",
          ],
        },
      ],
    },
    es: {
      h1: "Acerca de Guía Chapada Veadeiros",
      desc: "Quién organiza las excursiones con guía local en la Chapada dos Veadeiros, con base en Alto Paraíso de Goiás.",
      sections: [
        {
          h: "Quiénes somos",
          paragraphs: [
            "Guía Chapada Veadeiros es el sitio de excursiones y guías locales de la Chapada dos Veadeiros, con base en Alto Paraíso de Goiás. El visitante consulta cascadas, senderos y rutas y reserva plaza con un guía acreditado en Cadastur.",
            "CNPJ 24.354.289/0001-05.",
          ],
        },
        {
          h: "Quién lo conduce",
          paragraphs: [
            "Diego Navi Marques Carvalho conduce el proyecto. En 2017 completó la formación de conductor local de visitantes de ecoturismo de la Chapada dos Veadeiros y creó Guía Chapada Veadeiros para orientar la planificación del viaje y conectar al visitante con guías de la región.",
          ],
        },
        {
          h: "Dónde estamos",
          paragraphs: [
            "La base es Alto Paraíso de Goiás, en la Chapada dos Veadeiros, Goiás, Brasil. La atención es por WhatsApp, teléfono +55 62 98250-6891 y correo contato@guiachapadaveadeiros.com.",
          ],
        },
      ],
    },
  },
  "privacidade.html": {
    pt: {
      h1: "Política de privacidade",
      desc: "Como o Guia Chapada Veadeiros trata os dados informados no contato e na reserva.",
      sections: [
        {
          h: "Controlador",
          paragraphs: [
            "O controlador dos dados é o Guia Chapada Veadeiros, CNPJ 24.354.289/0001-05, com base em Alto Paraíso de Goiás, GO. O contato para privacidade é contato@guiachapadaveadeiros.com e o telefone +55 62 98250-6891.",
          ],
        },
        {
          h: "Dados que você informa",
          paragraphs: [
            "No formulário de contato coletamos nome, e-mail, telefone e a mensagem.",
            "Na reserva coletamos nome, e-mail, telefone, a data, o passeio escolhido e os dados necessários ao pagamento por Pix ou cartão.",
          ],
        },
        {
          h: "Para que usamos",
          paragraphs: [
            "Usamos esses dados para responder mensagens, confirmar a reserva, avisar o guia que vai conduzir o passeio e cumprir obrigações legais.",
          ],
        },
        {
          h: "Com quem compartilhamos",
          paragraphs: [
            "O guia designado recebe o que precisa para executar o passeio, como nome e telefone. O pagamento é processado pelo meio de pagamento da reserva. Não vendemos dados pessoais.",
          ],
        },
        {
          h: "Cookies",
          paragraphs: [
            "O site público não usa cookie de publicidade. A área de login de guia e de administração grava um cookie de sessão somente depois do acesso.",
          ],
        },
        {
          h: "Seus direitos",
          paragraphs: [
            "Você pode pedir confirmação, acesso, correção ou exclusão dos seus dados pelo e-mail contato@guiachapadaveadeiros.com. A lei aplicável é a Lei Geral de Proteção de Dados (Lei 13.709/2018).",
          ],
        },
      ],
    },
    en: {
      h1: "Privacy policy",
      desc: "How Guia Chapada Veadeiros handles the details you send by contact form or when booking a tour.",
      sections: [
        {
          h: "Controller",
          paragraphs: [
            "The data controller is Guia Chapada Veadeiros, CNPJ 24.354.289/0001-05, based in Alto Paraíso de Goiás, GO, Brazil. Privacy contact: contato@guiachapadaveadeiros.com and +55 62 98250-6891.",
          ],
        },
        {
          h: "What you send us",
          paragraphs: [
            "The contact form collects your name, email, phone number and message.",
            "A booking collects your name, email, phone number, date, chosen tour and the details needed to pay by Pix or card.",
          ],
        },
        {
          h: "Why we use it",
          paragraphs: [
            "We use this information to answer messages, confirm the booking, tell the guide who will lead the tour, and meet legal duties.",
          ],
        },
        {
          h: "Who else receives it",
          paragraphs: [
            "The assigned guide receives what they need to run the tour, such as your name and phone number. Payment is handled by the booking payment provider. We do not sell personal data.",
          ],
        },
        {
          h: "Cookies",
          paragraphs: [
            "The public site does not use advertising cookies. The guide and admin login areas store a session cookie only after you sign in.",
          ],
        },
        {
          h: "Your rights",
          paragraphs: [
            "You can ask us to confirm, access, correct or delete your data by emailing contato@guiachapadaveadeiros.com. Brazilian law applies, in particular the General Data Protection Law (Law 13.709/2018).",
          ],
        },
      ],
    },
    es: {
      h1: "Política de privacidad",
      desc: "Cómo Guía Chapada Veadeiros trata los datos que envías en el contacto y en la reserva.",
      sections: [
        {
          h: "Responsable",
          paragraphs: [
            "El responsable de los datos es Guía Chapada Veadeiros, CNPJ 24.354.289/0001-05, con base en Alto Paraíso de Goiás, GO, Brasil. El contacto de privacidad es contato@guiachapadaveadeiros.com y el teléfono +55 62 98250-6891.",
          ],
        },
        {
          h: "Datos que nos informas",
          paragraphs: [
            "En el formulario de contacto recogemos nombre, correo, teléfono y el mensaje.",
            "En la reserva recogemos nombre, correo, teléfono, la fecha, la excursión elegida y los datos necesarios para pagar por Pix o tarjeta.",
          ],
        },
        {
          h: "Para qué los usamos",
          paragraphs: [
            "Usamos esos datos para responder mensajes, confirmar la reserva, avisar al guía que conducirá la excursión y cumplir obligaciones legales.",
          ],
        },
        {
          h: "Con quién los compartimos",
          paragraphs: [
            "El guía asignado recibe lo necesario para realizar la excursión, como nombre y teléfono. El pago lo procesa el medio de pago de la reserva. No vendemos datos personales.",
          ],
        },
        {
          h: "Cookies",
          paragraphs: [
            "El sitio público no usa cookies de publicidad. El área de acceso de guías y de administración guarda una cookie de sesión solo después del ingreso.",
          ],
        },
        {
          h: "Tus derechos",
          paragraphs: [
            "Puedes pedir confirmación, acceso, corrección o eliminación de tus datos en contato@guiachapadaveadeiros.com. Se aplica la Ley General de Protección de Datos de Brasil (Ley 13.709/2018).",
          ],
        },
      ],
    },
  },
  "termos.html": {
    pt: {
      h1: "Termos de uso e cancelamento",
      desc: "Regras de reserva, pagamento, cancelamento e segurança dos passeios do Guia Chapada Veadeiros.",
      sections: [
        {
          h: "Reserva",
          paragraphs: [
            "A reserva é de um passeio em uma data, prestado pelo Guia Chapada Veadeiros. Na excursão sem translado, entra o primeiro dos 3 guias da fila que aceitar. No privativo, o contratante escolhe o guia numa lista de quem aceitou participar. Com translado na excursão, os guias com veículo recebem a proposta ao mesmo tempo e o primeiro que aceitar fica com a vaga.",
          ],
        },
        {
          h: "Pagamento e cancelamento",
          paragraphs: [
            "No cartão, o cartão fica salvo e a cobrança de 100% ocorre quando o guia está alocado e, se houver translado, o veículo. No Pix já pago, o cancelamento enquanto o passeio ainda está em formação devolve 100% daquele passeio. Em Aguardando confirmação operacional, o Pix permanece até a saída ser cancelada.",
            "Enquanto a saída está em Aguardando confirmação operacional, o contratante não cancela. O cancelamento pelo contratante só é possível em formação. Quando o passeio está confirmado, o contratante não cancela. O estorno, quando houver, é o da contratada.",
          ],
        },
        {
          h: "Clima",
          paragraphs: [
            "Chuva, garoa, tempo nublado, lama e mudança de vazão fazem parte do ecoturismo e não são, por si, motivo de reembolso. O cancelamento por mau tempo, quando houver risco à segurança, só ocorre antes da saída da cidade de embarque, por decisão do administrador, com estorno integral. Depois da saída, o serviço está iniciado.",
          ],
        },
        {
          h: "Segurança",
          paragraphs: [
            "A atividade em ambiente natural tem riscos que não podem ser eliminados: trilha irregular, pedra escorregadia, rio, cachoeira, sol, fauna e mudança de tempo. Cada participante cuida da própria segurança, permanece com o grupo e segue as orientações do guia.",
            "O participante informa, antes do passeio, condição de saúde que possa representar risco. Não é permitida a participação sob efeito de álcool ou droga. É proibido molestar animal silvestre ou retirar planta, pedra ou outro elemento do ambiente.",
            "Para proteger o grupo, o guia pode alterar roteiro, ordem ou horário, substituir um atrativo ou encerrar o passeio. O texto integral da Política de Cancelamento e da Política de Segurança aparece na reserva e precisa ser aceito antes do pagamento.",
          ],
        },
      ],
    },
    en: {
      h1: "Terms of use and cancellation",
      desc: "Booking, payment, cancellation and safety rules for Guia Chapada Veadeiros tours.",
      sections: [
        {
          h: "Booking",
          paragraphs: [
            "A booking is for a tour on a date, provided by Guia Chapada Veadeiros. On a shared tour without transport, the first of the 3 guides in the queue who accepts takes the departure. On a private tour, the customer chooses the guide from a list of those who agreed to be chosen. On a shared tour with transport, guides who have a vehicle receive the offer at the same time, and the first to accept takes the seat.",
          ],
        },
        {
          h: "Payment and cancellation",
          paragraphs: [
            "On card, the card is saved and the 100% charge happens when the guide is assigned and, if there is transport, the vehicle. If Pix is already paid, cancelling while that tour is still forming refunds 100% of that tour. While the departure is Waiting for operational confirmation, Pix stays until the departure is cancelled.",
            "While the departure is Waiting for operational confirmation, the customer cannot cancel. The customer can cancel only while the tour is still forming. Once the tour is confirmed, the customer does not cancel. A refund, when there is one, is the Company's.",
          ],
        },
        {
          h: "Weather",
          paragraphs: [
            "Rain, drizzle, cloud, mud and a change in river flow are part of ecotourism and are not, by themselves, a reason for a refund. A weather cancellation, when there is a safety risk, happens only before leaving the departure town, by an admin decision, with a full refund. After departure, the service has started.",
          ],
        },
        {
          h: "Safety",
          paragraphs: [
            "Time outdoors has risks that cannot be removed: uneven trail, slippery rock, river, waterfall, sun, wildlife and changing weather. Each person looks after their own safety, stays with the group and follows the guide.",
            "Tell us before the tour about any health condition that could add risk. Joining under the influence of alcohol or drugs is not allowed. Disturbing wildlife or removing plants, rocks or anything else from the place is not allowed.",
            "To protect the group, the guide may change the route, the order or the time, replace a stop, or end the tour. The full Cancellation Policy and Safety Policy are shown at booking and must be accepted before payment.",
          ],
        },
      ],
    },
    es: {
      h1: "Términos de uso y cancelación",
      desc: "Reglas de reserva, pago, cancelación y seguridad de las excursiones de Guía Chapada Veadeiros.",
      sections: [
        {
          h: "Reserva",
          paragraphs: [
            "La reserva es de una excursión en una fecha, prestada por Guía Chapada Veadeiros. En la excursión sin traslado, entra el primero de los 3 guías de la fila que acepte. En el paseo privado, el contratante elige al guía en una lista de quienes aceptaron participar. Con traslado en la excursión, los guías con vehículo reciben la propuesta al mismo tiempo y el primero que acepte se queda con la plaza.",
          ],
        },
        {
          h: "Pago y cancelación",
          paragraphs: [
            "En tarjeta, la tarjeta queda guardada y el cobro del 100% ocurre cuando el guía está asignado y, si hay traslado, el vehículo. En el Pix ya pagado, la cancelación mientras la excursión sigue en formación devuelve el 100% de esa salida. En Esperando confirmación operativa, el Pix permanece hasta que la salida se cancele.",
            "Mientras la salida está en Esperando confirmación operativa, el contratante no puede cancelar. La cancelación por el contratante solo es posible en formación. Cuando la excursión está confirmada, el contratante no cancela. El reembolso, cuando lo hay, es el de la contratada.",
          ],
        },
        {
          h: "Clima",
          paragraphs: [
            "Lluvia, llovizna, cielo nublado, barro y un cambio de caudal forman parte del ecoturismo y no son, por sí solos, motivo de reembolso. La cancelación por mal tiempo, cuando hay riesgo para la seguridad, solo ocurre antes de salir de la ciudad de embarque, por decisión del administrador, con reembolso íntegro. Después de la salida, el servicio ya comenzó.",
          ],
        },
        {
          h: "Seguridad",
          paragraphs: [
            "La actividad al aire libre tiene riesgos que no se pueden eliminar: sendero irregular, piedra resbaladiza, río, cascada, sol, fauna y cambio de tiempo. Cada participante cuida su seguridad, permanece con el grupo y sigue las indicaciones del guía.",
            "El participante informa, antes de la excursión, cualquier condición de salud que pueda suponer un riesgo. No se permite participar bajo efecto de alcohol o drogas. Está prohibido molestar a la fauna o retirar planta, piedra u otro elemento del lugar.",
            "Para proteger al grupo, el guía puede cambiar la ruta, el orden o el horario, sustituir una parada o terminar la excursión. El texto completo de la Política de cancelación y de la Política de seguridad aparece en la reserva y debe aceptarse antes del pago.",
          ],
        },
      ],
    },
  },
};
