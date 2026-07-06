/**
 * Políticas de cancelamento e segurança — carrinho de excursões.
 * Texto legal em PT; rótulos de UI traduzidos por locale.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  var UI = {
    pt: {
      agreePrefix: "Li e concordo com a",
      policyCancel: "Política de Cancelamento",
      policySecurity: "Política de Segurança",
      modalClose: "Fechar",
      agreeRequired:
        "Para pagar com Pix, leia e aceite a Política de Cancelamento e a Política de Segurança.",
    },
    en: {
      agreePrefix: "I have read and agree to the",
      policyCancel: "Cancellation Policy",
      policySecurity: "Safety Policy",
      modalClose: "Close",
      agreeRequired:
        "To pay with Pix, please read and accept both the Cancellation Policy and the Safety Policy.",
    },
    es: {
      agreePrefix: "He leído y acepto la",
      policyCancel: "Política de Cancelación",
      policySecurity: "Política de Seguridad",
      modalClose: "Cerrar",
      agreeRequired:
        "Para pagar con Pix, lea y acepte la Política de Cancelación y la Política de Seguridad.",
    },
  };

  var TITLES = {
    cancel: {
      pt: "Política de Cancelamento",
      en: "Cancellation Policy",
      es: "Política de Cancelación",
    },
    security: {
      pt: "Política de Segurança",
      en: "Safety Policy",
      es: "Política de Seguridad",
    },
  };

  /** @type {Record<string, { cancel: PolicySection[], security: PolicySection[] }>} */
  var SECTIONS = {
    pt: {
      cancel: [
        {
          heading: "1. Aceite da Contratação",
          paragraphs: [
            "Ao efetuar o pagamento, o CONTRATANTE declara ter lido, compreendido e aceitado integralmente esta Política de Cancelamento e os Termos de Prestação de Serviços da Guia Chapada Veadeiros.",
            "O pagamento confirma a contratação da prestação de serviços de guiamento turístico pela Guia Chapada Veadeiros, bem como a reserva da vaga na programação, sujeitando ambas as partes às condições aqui estabelecidas.",
            "A contratação refere-se à prestação do serviço pela Guia Chapada Veadeiros, não constituindo a contratação de um guia específico, salvo quando expressamente contratado como serviço privativo personalizado.",
          ],
        },
        {
          heading: '2. Passeios "Em Formação"',
          paragraphs: [
            'São considerados "Em Formação" os passeios que ainda dependem da formação do quórum mínimo de participantes, definido individualmente para cada passeio e informado na página de reserva.',
            'Enquanto o passeio permanecer com o status "Em Formação", tanto o CONTRATANTE quanto a CONTRATADA poderão cancelar a reserva a qualquer momento, sem aplicação de qualquer penalidade.',
            "Caso o CONTRATANTE solicite o cancelamento durante essa fase, terá direito ao reembolso integral (100%) dos valores pagos.",
            "A CONTRATADA poderá cancelar o passeio a qualquer momento por motivos operacionais ou por inviabilidade de sua realização.",
            "Caso o quórum mínimo não seja atingido até às 23h59 do dia anterior à data prevista para o passeio, este será cancelado automaticamente, não sendo a CONTRATADA obrigada a realizar a atividade.",
            "Nessa hipótese, o CONTRATANTE poderá optar pelo reembolso integral (100%) dos valores pagos ou pela utilização do valor pago como crédito para reagendamento de outro passeio disponível, realizando-se o pagamento da diferença ou a restituição do saldo, conforme o valor do novo passeio escolhido.",
          ],
        },
        {
          heading: "3. Passeios Confirmados",
          paragraphs: [
            'Considera-se "Confirmado" o passeio que atingir o quórum mínimo estabelecido ou que tenha sua realização garantida pela CONTRATADA.',
            "A confirmação do passeio implica: reserva definitiva da vaga do participante; bloqueio da agenda do guia responsável; organização da logística necessária para execução da atividade.",
            "Após a confirmação, o CONTRATANTE poderá solicitar o cancelamento de sua inscrição a qualquer momento.",
            "Entretanto, não haverá restituição dos valores pagos, em razão da reserva da agenda do guia, da ocupação da vaga e dos custos operacionais assumidos para a realização do passeio.",
            "Esta regra aplica-se, inclusive, aos casos de: desistência; alteração de planos; atraso; não comparecimento (no-show); perda de transporte; doença; motivos pessoais ou profissionais; qualquer outro impedimento não imputável à CONTRATADA.",
          ],
        },
        {
          heading: "3.1 Substituição do Participante",
          paragraphs: [
            "O CONTRATANTE poderá indicar outra pessoa para ocupar sua vaga em um passeio confirmado.",
            "A substituição estará sujeita à aprovação da CONTRATADA, observadas as condições operacionais da atividade e o envio prévio das informações necessárias do novo participante.",
            "Uma vez efetivada a substituição da vaga, o CONTRATANTE terá direito ao reembolso integral (100%) dos valores pagos ou à transferência integral da reserva ao participante substituto.",
            "Não sendo apresentada pessoa substituta apta a ocupar a vaga antes do início do passeio, não haverá direito à restituição dos valores pagos.",
          ],
        },
        {
          heading: "4. Cancelamento pela CONTRATADA",
          paragraphs: [
            "A CONTRATADA poderá cancelar qualquer passeio, inclusive após sua confirmação, quando sua realização se tornar inviável ou representar risco à segurança dos participantes.",
            "Constituem exemplos dessa hipótese: condições climáticas severas; interdição do atrativo; determinação de autoridade competente; caso fortuito; força maior; situações que coloquem em risco a integridade física dos participantes, do guia ou da equipe.",
            "Nessas hipóteses, o CONTRATANTE poderá optar pelo reembolso integral (100%) dos valores pagos ou pela utilização do valor pago como crédito para reagendamento de outro passeio disponível, realizando-se o pagamento da diferença ou a restituição do saldo, conforme o valor do novo passeio escolhido.",
          ],
        },
        {
          heading: "4.1 Substituição do Guia",
          paragraphs: [
            "A CONTRATADA poderá, por motivos operacionais, logísticos, técnicos, de saúde, segurança, caso fortuito, força maior ou qualquer outra necessidade operacional, substituir o guia originalmente designado por outro guia devidamente habilitado e apto à condução da atividade, sem necessidade de anuência prévia do CONTRATANTE.",
            "A substituição do guia não caracteriza cancelamento do passeio, alteração essencial do objeto contratado, falha na prestação do serviço ou descumprimento contratual, não conferindo ao CONTRATANTE direito ao cancelamento da reserva, reembolso dos valores pagos, abatimento proporcional do preço ou qualquer espécie de indenização.",
          ],
        },
        {
          heading: "5. Condições Climáticas",
          paragraphs: [
            "Os passeios são realizados em ambiente natural e estão sujeitos às condições climáticas típicas da Chapada dos Veadeiros.",
            "O CONTRATANTE declara estar ciente de que chuva, garoa, tempo nublado, alterações de temperatura, aumento da vazão dos rios, lama nas trilhas e demais fenômenos naturais fazem parte da atividade de ecoturismo e não constituem motivo para cancelamento ou reembolso.",
          ],
        },
        {
          heading: "5.1 Cancelamento antes da saída",
          paragraphs: [
            "O cancelamento do passeio por condições climáticas somente poderá ocorrer antes da saída da cidade de embarque, por decisão exclusiva da CONTRATADA, quando houver risco à segurança dos participantes ou inviabilidade técnica da atividade.",
          ],
        },
        {
          heading: "5.2 Adiamento da saída",
          paragraphs: [
            "Sempre que houver previsão de melhora das condições climáticas, a CONTRATADA poderá adiar o horário de saída em até 2 (duas) horas, sem que isso caracterize cancelamento do passeio ou gere direito a reembolso.",
            "Persistindo condições inseguras, a CONTRATADA poderá cancelar o passeio, aplicando-se as regras previstas nesta Política.",
          ],
        },
        {
          heading: "5.3 Início da prestação do serviço",
          paragraphs: [
            "Após a saída da cidade de embarque, considera-se iniciada a prestação do serviço.",
            "A partir desse momento, não será possível cancelar o passeio por condições climáticas, ainda que ocorram alterações meteorológicas durante o deslocamento ou durante a realização da atividade.",
          ],
        },
        {
          heading: "5.4 Alterações durante o passeio",
          paragraphs: [
            "Sempre que houver previsão ou ocorrência de condições que possam comprometer a segurança dos participantes, a CONTRATADA poderá: alterar o roteiro; modificar a ordem de visitação; cancelar determinado atrativo; substituir atrativos; reduzir o tempo de permanência; interromper atividades específicas; encerrar o passeio antecipadamente, retornando à cidade de embarque antes do horário inicialmente previsto.",
            "Tais medidas possuem finalidade exclusivamente preventiva e não caracterizam cancelamento do passeio, falha na prestação do serviço ou descumprimento contratual, não gerando direito a reembolso, abatimento proporcional do preço ou indenização.",
          ],
        },
        {
          heading: "6. Legislação Aplicável",
          paragraphs: [
            "Esta Política foi elaborada em conformidade com a legislação brasileira, especialmente o Código de Defesa do Consumidor, preservando os direitos legais do CONTRATANTE nas hipóteses de falha na prestação do serviço ou impossibilidade de sua execução por responsabilidade exclusiva da CONTRATADA.",
          ],
        },
      ],
      security: [
        {
          heading: "1. Objetivo",
          paragraphs: [
            "A Guia Chapada Veadeiros adota procedimentos destinados a reduzir os riscos inerentes às atividades de ecoturismo.",
            "Entretanto, o CONTRATANTE declara estar ciente de que atividades realizadas em ambiente natural envolvem riscos próprios que não podem ser totalmente eliminados.",
          ],
        },
        {
          heading: "2. Responsabilidade Individual",
          paragraphs: [
            "Cada participante é responsável por sua própria segurança, devendo agir com prudência, atenção e respeito às orientações do guia.",
            "O guia atua na orientação, condução e apoio ao grupo, não sendo responsável pelas decisões individuais tomadas pelos participantes.",
            "O CONTRATANTE assume os riscos decorrentes de atos de imprudência, negligência, imperícia, descumprimento das orientações recebidas ou condutas que coloquem em risco sua integridade física ou a de terceiros.",
          ],
        },
        {
          heading: "3. Cumprimento das Orientações",
          paragraphs: [
            "O CONTRATANTE compromete-se a: seguir integralmente as orientações do guia; permanecer junto ao grupo; respeitar os horários; utilizar equipamentos de segurança quando exigidos; respeitar áreas interditadas e sinalizações; comunicar imediatamente qualquer situação de risco ou mal-estar.",
            "O descumprimento dessas obrigações poderá resultar na exclusão do passeio, sem direito a reembolso.",
          ],
        },
        {
          heading: "4. Condições de Saúde",
          paragraphs: [
            "O CONTRATANTE declara possuir condições físicas e psicológicas compatíveis com a atividade contratada.",
            "Compromete-se também a informar previamente qualquer condição médica que possa representar risco durante o passeio.",
            "A omissão dessas informações será de inteira responsabilidade do CONTRATANTE.",
          ],
        },
        {
          heading: "5. Álcool e Drogas",
          paragraphs: [
            "É proibida a participação sob efeito de álcool, drogas ilícitas ou qualquer substância que comprometa a capacidade física ou mental.",
            "O guia poderá impedir o embarque ou retirar do passeio qualquer participante que coloque em risco sua segurança ou a de terceiros, sem direito a reembolso.",
          ],
        },
        {
          heading: "6. Ambiente Natural",
          paragraphs: [
            "O CONTRATANTE reconhece que poderá estar exposto a: trilhas irregulares; pedras escorregadias; rios e cachoeiras; cânions; animais silvestres; insetos; vegetação nativa; mudanças climáticas; exposição solar; demais riscos inerentes ao ambiente natural.",
            "Essas condições fazem parte da natureza do ecoturismo e não caracterizam falha na prestação do serviço.",
          ],
        },
        {
          heading: "7. Objetos Pessoais",
          paragraphs: [
            "Cada participante é integralmente responsável por seus pertences.",
            "A CONTRATADA não se responsabiliza por perdas, furtos, roubos, quebras, molhamento ou danos a celulares, câmeras, drones, documentos, dinheiro, joias, equipamentos eletrônicos ou quaisquer objetos pessoais.",
          ],
        },
        {
          heading: "8. Fauna e Flora",
          paragraphs: [
            "É proibido alimentar, capturar, perseguir, tocar ou provocar animais silvestres, bem como retirar plantas, pedras ou qualquer elemento do ambiente natural.",
            "O CONTRATANTE compromete-se a cumprir integralmente a legislação ambiental e as normas das unidades de conservação visitadas.",
          ],
        },
        {
          heading: "9. Emergências",
          paragraphs: [
            "Em caso de acidente ou mal súbito, o guia prestará os primeiros atendimentos compatíveis com seu treinamento e acionará os serviços públicos de emergência quando necessário.",
            "O CONTRATANTE reconhece que o tempo de resposta em áreas naturais pode ser superior ao observado em centros urbanos.",
          ],
        },
        {
          heading: "10. Decisões do Guia",
          paragraphs: [
            "Sempre que necessário para preservar a segurança do grupo, o guia poderá: alterar o roteiro; modificar horários; cancelar atrativos; interromper atividades; reduzir tempos de visita; retornar antecipadamente; encerrar o passeio.",
            "Essas decisões deverão ser imediatamente cumpridas pelos participantes.",
          ],
        },
        {
          heading: "11. Exclusão do Passeio",
          paragraphs: [
            "A CONTRATADA poderá excluir do passeio, sem direito a reembolso, o participante que: descumprir orientações do guia; colocar em risco sua própria segurança ou a de terceiros; consumir álcool ou drogas durante a atividade; praticar atos de indisciplina; causar danos ambientais; apresentar comportamento agressivo ou incompatível com a atividade.",
          ],
        },
        {
          heading: "12. Declaração de Ciência",
          paragraphs: [
            "Ao contratar o passeio, o CONTRATANTE declara que: compreende os riscos inerentes ao ecoturismo; assume responsabilidade por suas próprias ações e decisões; compromete-se a seguir integralmente as orientações do guia; autoriza o guia a adotar todas as medidas necessárias para preservar a segurança do grupo; reconhece que alterações de roteiro, horários, duração da atividade ou encerramento antecipado poderão ocorrer sempre que exigidos por questões de segurança.",
          ],
        },
      ],
    },
  };

  function resolveLocale(locale) {
    return locale === "en" || locale === "es" ? locale : "pt";
  }

  function uiStrings(locale) {
    var loc = resolveLocale(locale);
    return UI[loc] || UI.pt;
  }

  function docTitle(type, locale) {
    var loc = resolveLocale(locale);
    var pack = TITLES[type] || {};
    return pack[loc] || pack.pt || "";
  }

  function sectionsFor(type, locale) {
    var loc = resolveLocale(locale);
    var pack = SECTIONS[loc] || SECTIONS.pt;
    return (pack && pack[type]) || [];
  }

  function renderPolicyHtml(type, locale) {
    var sections = sectionsFor(type, locale);
    if (!sections.length && locale !== "pt") {
      sections = sectionsFor(type, "pt");
    }
    return sections
      .map(function (sec) {
        var tag = /^\d+\.\d+/.test(sec.heading) ? "h4" : "h3";
        var cls =
          tag === "h4"
            ? "gcv-exc-policy-doc__subsection"
            : "gcv-exc-policy-doc__section-title";
        var html =
          "<" +
          tag +
          ' class="' +
          cls +
          '">' +
          escapeHtml(sec.heading) +
          "</" +
          tag +
          ">";
        (sec.paragraphs || []).forEach(function (p) {
          html += "<p>" + escapeHtml(p) + "</p>";
        });
        return html;
      })
      .join("");
  }

  function policyLinkLabel(type, locale) {
    var ui = uiStrings(locale);
    if (type === "cancel") return ui.policyCancel;
    if (type === "security") return ui.policySecurity;
    return "";
  }

  global.GcvExcCartPolicies = {
    uiStrings: uiStrings,
    docTitle: docTitle,
    renderPolicyHtml: renderPolicyHtml,
    policyLinkLabel: policyLinkLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
