/**
 * Políticas de cancelamento e segurança — carrinho de excursões.
 * Cancelamento e segurança em pt, en e es. Termos do guia em PT.
 * Rótulos de UI traduzidos por locale.
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
      policyGuide: "Termos do Guia",
      modalClose: "Fechar",
      agreeRequired:
        "Para pagar, leia e aceite a Política de Cancelamento e a Política de Segurança.",
    },
    en: {
      agreePrefix: "I have read and agree to the",
      policyCancel: "Cancellation Policy",
      policySecurity: "Safety Policy",
      policyGuide: "Guide Terms",
      modalClose: "Close",
      agreeRequired:
        "To pay, please read and accept the Cancellation Policy and the Safety Policy.",
    },
    es: {
      agreePrefix: "He leído y acepto la",
      policyCancel: "Política de cancelación",
      policySecurity: "Política de seguridad",
      policyGuide: "Términos del Guía",
      modalClose: "Cerrar",
      agreeRequired:
        "Para pagar, lea y acepte la Política de cancelación y la Política de seguridad.",
    },
  };

  var TITLES = {
    cancel: {
      pt: "Política de Cancelamento",
      en: "Cancellation Policy",
      es: "Política de cancelación",
    },
    security: {
      pt: "Política de Segurança",
      en: "Safety Policy",
      es: "Política de seguridad",
    },
    guide: {
      pt: "Termos do Guia",
      en: "Guide Terms",
      es: "Términos del Guía",
    },
  };

  /** @type {Record<string, { cancel: PolicySection[], security: PolicySection[] }>} */
  var SECTIONS = {
    pt: {
      cancel: [
        {
          heading: "1. Aceite da contratação e cobrança",
          paragraphs: [
            "Versão de 12 de novembro de 2026.",
            "Ao concluir a compra, o CONTRATANTE declara ter lido, compreendido e aceitado integralmente esta Política de Cancelamento e os Termos de Prestação de Serviços da Guia Chapada Veadeiros.",
            "O CONTRATANTE contrata passeio(s) com guias locais, por dia. A Guia Chapada Veadeiros faz a conexão entre o CONTRATANTE e o GUIA LOCAL, que presta o passeio.",
          ],
        },
        {
          heading: "1.1 Quando o cartão é cobrado",
          paragraphs: [
            "No cartão de crédito, nacional ou internacional, a operadora apenas confirma na compra que o cartão existe e aceita cobrança futura.",
            "A cobrança automática do valor só é autorizada quando o passeio é confirmado, na forma da seção 2.6.",
            "No Pix, o valor é pago na reserva e estornado nos casos previstos nesta Política.",
          ],
        },
        {
          heading: "1.2 Quando o passeio é confirmado",
          paragraphs: [
            "Um passeio é confirmado se, e somente se, na Excursão, com ou sem translado, o quórum está fechado e todos os guias necessários aceitaram. Com translado, cada carro exige o próprio guia.",
            "No Privativo, com ou sem translado, o passeio é confirmado quando o guia aceitou e, se houver translado, o veículo está garantido.",
            "Nessas duas situações o passeio está confirmado. A cobrança de cada reserva no cartão é feita em seguida. A partir da confirmação o CONTRATANTE não cancela, mesmo que o cartão daquela reserva ainda não tenha sido cobrado. O estorno por decisão da CONTRATADA segue a seção 5. Trata-se de serviço com agendamento prévio, no qual o prestador, que é o guia, dedica aquela data ao grupo.",
          ],
        },
        {
          heading: "1.3 Translado",
          paragraphs: [
            "Com translado, cada carro leva até 4 clientes e 1 guia.",
          ],
        },
        {
          heading: "2. Passeios em Excursão",
          paragraphs: [
            "As regras desta seção valem para a modalidade Excursão.",
          ],
        },
        {
          heading: "2.1 Formação e quórum",
          paragraphs: [
            "O quórum é de 3 a 4 pessoas por saída, salvo quando o passeio tiver outro número configurado. Ele pode variar por passeio, roteiro e guia, sempre com aviso prévio pela plataforma.",
            "Quando alguém compra uma Excursão sem quórum, a plataforma abre uma saída com status Em formação, naquele dia, partindo da cidade, com ou sem translado. Outras pessoas podem entrar comprando pelo site enquanto houver vagas. A saída permanece em formação enquanto faltar quórum.",
          ],
        },
        {
          heading: "2.2 Aguardando confirmação operacional",
          paragraphs: [
            "Quando o quórum é atingido, a vaga é oferecida aos guias e o status passa a ser Aguardando confirmação operacional: quórum atingido, falta guia ou, no passeio com translado, veículo.",
            "O guia tem 4 horas e 20 minutos para aceitar ou recusar. Esse tempo só corre das 6h às 9h e das 16h às 22h. Fora desses horários a contagem para.",
            "Na Excursão sem translado, a proposta vai aos 3 primeiros da fila ao mesmo tempo, e entra o primeiro que aceitar. Se nenhum aceitar, a vez passa aos 3 seguintes.",
            "Na Excursão com translado, cada carro exige o próprio guia e veículo, e todos os guias com veículo cadastrado recebem a proposta juntos. Enquanto faltar um, o status continua e ninguém é cobrado.",
            "O CONTRATANTE é avisado por WhatsApp e por e-mail quando a saída entra nesse status.",
            "No cartão nada é cobrado. No Pix, o valor já pago permanece até a confirmação ou o cancelamento da saída. Nesse status o CONTRATANTE não pode cancelar.",
            "A espera termina no que vier primeiro: um guia aceita; a fila acaba sem aceite; ou faltam 12 horas para o início e a saída ainda não confirmou.",
            "Se a fila acabar sem aceite, o passeio é cancelado porque não há guias disponíveis. O CONTRATANTE é avisado por WhatsApp e por e-mail. No Pix o valor é estornado. No cartão nada é cobrado.",
            "Faltando 12 horas para o início, se a saída ainda estiver em formação ou em Aguardando confirmação operacional, ela é cancelada. O Pix é devolvido. A reserva do cartão que não foi cobrada é liberada e nada é cobrado.",
          ],
        },
        {
          heading: "2.3 Cancelamento pelo CONTRATANTE durante a formação",
          paragraphs: [
            "Enquanto a saída está Em formação, o CONTRATANTE pode cancelar a qualquer momento.",
            "No cartão não há cobrança nem estorno, porque o passeio ainda não foi cobrado. No Pix, a devolução é de 100% do valor daquele passeio.",
            "Em reserva com mais de um dia, o CONTRATANTE cancela só os passeios ainda em formação. O dia já confirmado permanece e não é estornado.",
            "A CONTRATADA também pode encerrar a formação a qualquer momento, por motivo operacional ou inviabilidade da realização. No Pix o valor é estornado. No cartão nada é cobrado.",
          ],
        },
        {
          heading: "2.4 Sem troca de passeio",
          paragraphs: [
            "Não há troca de passeio. O CONTRATANTE faz o passeio contratado ou cancela enquanto a saída está em formação. Não existe oferta para mudar para outro passeio do mesmo dia.",
          ],
        },
        {
          heading: "2.5 Cancelamento automático 12 horas antes",
          paragraphs: [
            "Faltando 12 horas para o início, se a Excursão ainda estiver em formação, sem quórum, ou em Aguardando confirmação operacional, sem guia ou sem veículo, a saída é cancelada pela plataforma.",
            "No Pix, a devolução é de 100%. No cartão, nada foi cobrado e a reserva do cartão é liberada.",
            "Passeio marcado para 8h de sábado é cancelado às 20h de sexta se, nesse horário, o quórum não fechou ou a confirmação operacional não foi concluída.",
            "Quando a saída confirma, a cobrança de 100% é feita no cartão e o CONTRATANTE não cancela e não recebe devolução. A confirmação da Excursão exige quórum e guia alocado e, se houver translado, veículo. A do Privativo exige o guia alocado e, se houver translado, veículo.",
          ],
        },
        {
          heading: "2.6 Confirmação e cobrança",
          paragraphs: [
            "A Excursão fica confirmada quando o quórum está fechado e todos os guias necessários aceitaram. Quórum sem guia não cobra o cartão. Com o aceite do guia, a saída está confirmada: a vaga fica definitiva, a agenda do guia é bloqueada e o CONTRATANTE não cancela, mesmo que o cartão ainda não tenha sido cobrado.",
            "Cada reserva é cobrada na sua vez, em 100%, no cartão salvo. Não há teste único de todos os cartões do grupo antes de cobrar alguém.",
            "Se o cartão de uma reserva for recusado, nada é cobrado daquela reserva e o CONTRATANTE é avisado para trocar o cartão, sem prazo fixo. A recusa não desfaz a confirmação: o guia continua associado à saída e não volta ao fim da fila.",
            "A partir da cobrança o CONTRATANTE não cancela e não há devolução, na forma da seção 4.",
          ],
        },
        {
          heading: "3. Passeios Privativos",
          paragraphs: [
            "O Privativo é exclusivo para o grupo do CONTRATANTE. Não é excursão compartilhada e não depende de outras inscrições. Não há troca de passeio. Faltando 12 horas para o início, se o guia ou o veículo ainda não estiver definido, a saída é cancelada: o Pix é devolvido e a reserva do cartão que não foi cobrada é liberada.",
            "O cartão fica apenas salvo, sem cobrança, até um guia ser definido.",
            "Os guias livres na data são chamados em levas de até 5. A lista fecha quando 3 guias aceitam participar. Se não houver 3 guias livres, a lista fecha com quem aceitou. Se ninguém aceitar, o passeio é cancelado porque não há guias disponíveis. O CONTRATANTE recebe o link por WhatsApp e por e-mail e tem 6 horas para escolher, contadas no mesmo relógio da seção 2.2: só correm das 6h às 9h e das 16h às 22h. Se o prazo acabar, entra o guia mais bem colocado entre os que aceitaram. Enquanto a lista está aberta, o CONTRATANTE não cancela e o cartão não é cobrado.",
            "Sem translado, o veículo é o do CONTRATANTE e a confirmação ocorre quando o guia é definido. Com translado, a lista só inclui guias com veículo, e a confirmação também exige o veículo: um carro e um guia para cada grupo de até 4 clientes. O CONTRATANTE escolhe o guia do primeiro carro. Os carros seguintes seguem a seção 6.2.",
            "Com o guia definido e, no translado, o veículo garantido, a CONTRATADA testa o cartão salvo. Se passar, o passeio fica associado a esse guia e o cartão é cobrado em 100%. A partir daí não há cancelamento nem devolução.",
            "Se o cartão for recusado, nada é cobrado e o CONTRATANTE é avisado para trocar o cartão, sem prazo fixo. A recusa não desfaz a confirmação. Quando o novo cartão passar, a cobrança de 100% ocorre automaticamente.",
          ],
        },
        {
          heading: "4. Passeio confirmado: sem restituição",
          paragraphs: [
            "Para Excursão e Privativo, depois da confirmação e da cobrança não há restituição por desistência ou alteração de planos, atraso, não comparecimento ou perda de transporte, doença, motivo pessoal ou profissional, ou qualquer outro impedimento que não seja da CONTRATADA.",
            "Quem não comparece continua cobrado pelo valor integral. A parte da plataforma continua sendo descontada e o guia recebe o pagamento daquela vaga. A ausência não entra na contagem de guiagem.",
          ],
        },
        {
          heading: "4.1 Check-in e contato do guia",
          paragraphs: [
            "Quando o passeio está confirmado e o cancelamento pelo CONTRATANTE já não é possível, a CONTRATADA envia a identificação do guia: foto, nome e WhatsApp.",
            "No dia do passeio, o guia confirma o check-in pela leitura do QR, e a confirmação é imediata. O CONTRATANTE recebe a mensagem de boas-vindas com foto, nome e WhatsApp do guia, e o link para avaliar o passeio ao final.",
          ],
        },
        {
          heading: "5. Cancelamento pela CONTRATADA",
          paragraphs: [
            "O cancelamento do passeio confirmado é feito apenas por um administrador da plataforma. O CONTRATANTE não cancela o passeio confirmado. O guia também não cancela o passeio: se ele solta a guiagem, a vaga volta à fila, na forma da seção 5.1.",
            "A CONTRATADA pode cancelar o passeio, inclusive depois da confirmação, por problema de saúde ou impedimento grave do guia, força maior ou caso fortuito, inviabilidade da realização ou risco à segurança dos participantes, incluindo condições climáticas severas, interdição do atrativo e determinação de autoridade competente, falta de veículo para realizar o Privativo, ou falta de guia disponível.",
            "Nessas hipóteses o CONTRATANTE recebe o estorno integral do que foi pago. No cartão, se a cobrança ainda não ocorreu, nada é cobrado. Nenhum guia recebe por esse passeio, e o guia é avisado do cancelamento por WhatsApp e por e-mail.",
          ],
        },
        {
          heading: "5.1 Substituição do guia",
          paragraphs: [
            "Depois que um guia confirmou, o CONTRATANTE não escolhe outro. O guia pode soltar a guiagem pela agenda e, nesse caso, a vaga volta à fila. Quando ele aceita, a agenda daquele dia bloqueia. Se o passeio for cancelado, a agenda abre de novo.",
            "O CONTRATANTE é avisado na hora, por WhatsApp e por e-mail, com os dados do novo guia: nome, telefone, e-mail, foto, nota e descrição, sem o motivo da saída. A troca de guia não cancela, não devolve e não reduz o preço.",
            "Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado porque não há guias disponíveis. No Pix o CONTRATANTE recebe o estorno. No cartão, a cobrança que já tiver ocorrido é estornada. Se o guia ainda não tinha aceitado, nada foi cobrado. Nenhum guia recebe por esse passeio.",
          ],
        },
        {
          heading: "6. Vaga do guia",
          paragraphs: [
            "As regras de vaga sem translado e com translado estão nas seções 6.1 e 6.2.",
          ],
        },
        {
          heading: "6.1 Sem translado",
          paragraphs: [
            "O CONTRATANTE contrata apenas o guia. O deslocamento é no veículo do próprio grupo. O carro de passeio tem 5 lugares: um é do guia e cabem no máximo 4 clientes. Com 5 ou mais pessoas, o grupo leva os carros necessários para que cada carro tenha no máximo 4 clientes e lugar para o guia.",
            "Se na saída não houver vaga para o guia, a CONTRATADA pode cancelar o passeio por inviabilidade operacional, e o CONTRATANTE recebe o reembolso integral do que foi pago.",
          ],
        },
        {
          heading: "6.2 Com translado",
          paragraphs: [
            "O CONTRATANTE contrata o passeio com o guia e o transporte a partir da cidade de hospedagem. O carro é do guia. Na Excursão, e nos carros do Privativo além do primeiro, não há fila: todos os guias com veículo cadastrado no perfil, com modelo e ano, recebem a proposta ao mesmo tempo. O guia do primeiro carro do Privativo é o escolhido na seção 3.",
            "O primeiro que aceitar fica com a vaga, e os demais são avisados de que ela não está mais disponível. Cada carro leva até 4 clientes e 1 guia. A conta é um guia e um carro para cada grupo de até 4 clientes: 5 clientes exigem 2 carros e 2 guias. O preço do Privativo com translado acompanha o número de carros.",
          ],
        },
        {
          heading: "7. Guia em outro idioma",
          paragraphs: [
            "Guia em português não tem acréscimo. Se o CONTRATANTE escolher outro idioma, entra o acréscimo em reais definido na tarifa daquele passeio.",
            "O acréscimo é cobrado uma vez sobre o total da compra, depois dos descontos de idade, e não por pessoa. O valor é o mesmo para qualquer compra e não muda conforme a cidade de saída. O desconto do Pix não entra nessa conta.",
          ],
        },
        {
          heading: "8. Condições climáticas",
          paragraphs: [
            "Os passeios são realizados em ambiente natural e estão sujeitos às condições climáticas típicas da Chapada dos Veadeiros.",
            "O CONTRATANTE declara estar ciente de que chuva, garoa, tempo nublado, alterações de temperatura, aumento da vazão dos rios, lama nas trilhas e demais fenômenos naturais fazem parte da atividade de ecoturismo e não constituem motivo para cancelamento ou reembolso.",
          ],
        },
        {
          heading: "8.1 Cancelamento antes da saída",
          paragraphs: [
            "O cancelamento por mau tempo só pode ocorrer antes da saída da cidade de embarque, por decisão do administrador, quando houver risco à segurança dos participantes ou inviabilidade técnica da atividade. Aplica-se o estorno integral da seção 5.",
            "Depois da saída da cidade de embarque, a prestação do serviço está iniciada e o passeio não se cancela por mudança do tempo no caminho ou durante a atividade.",
          ],
        },
        {
          heading: "8.2 Adiamento e alterações durante o passeio",
          paragraphs: [
            "Sempre que houver previsão de melhora das condições climáticas, a CONTRATADA pode adiar o horário de saída em até 2 horas, sem que isso caracterize cancelamento ou gere reembolso. Persistindo condições inseguras, a CONTRATADA pode cancelar o passeio, aplicando-se a seção 5.",
            "Para preservar a segurança, a CONTRATADA pode alterar o roteiro, a ordem de visitação, cancelar ou substituir um atrativo, reduzir o tempo de permanência, interromper uma atividade ou encerrar o passeio antes do horário, retornando à cidade de embarque. Essas medidas são preventivas e não caracterizam cancelamento, falha na prestação do serviço ou descumprimento contratual, nem geram reembolso, abatimento ou indenização.",
          ],
        },
        {
          heading: "9. Legislação aplicável",
          paragraphs: [
            "Esta Política foi elaborada em conformidade com a legislação brasileira, especialmente o Código de Defesa do Consumidor, preservando os direitos legais do CONTRATANTE nas hipóteses de falha na prestação do serviço ou impossibilidade de sua execução por responsabilidade exclusiva da CONTRATADA.",
          ],
        },
      ],
      security: [
        {
          heading: "1. Riscos da atividade",
          paragraphs: [
            "A Guia Chapada Veadeiros adota procedimentos para reduzir os riscos do ecoturismo. O CONTRATANTE declara estar ciente de que a atividade em ambiente natural tem riscos que não podem ser totalmente eliminados.",
            "O CONTRATANTE poderá estar exposto a trilhas irregulares, pedras escorregadias, rios, cachoeiras, cânions, animais silvestres, insetos, vegetação nativa, mudanças climáticas, exposição solar e demais condições do ambiente natural. Essas condições fazem parte do ecoturismo e não caracterizam falha na prestação do serviço.",
          ],
        },
        {
          heading: "2. Responsabilidade do participante",
          paragraphs: [
            "Cada participante é responsável pela própria segurança. Deve agir com prudência, permanecer junto ao grupo, seguir as orientações do guia, respeitar os horários, usar o equipamento de segurança quando exigido, respeitar áreas interditadas e sinalizações, e comunicar imediatamente qualquer risco ou mal-estar.",
            "O guia orienta, conduz e apoia o grupo. Não responde pelas decisões individuais do participante. O CONTRATANTE assume os riscos de imprudência, negligência, imperícia, descumprimento das orientações ou conduta que coloque em risco a si ou a terceiros.",
          ],
        },
        {
          heading: "3. Saúde",
          paragraphs: [
            "O CONTRATANTE declara ter condições físicas e psicológicas compatíveis com a atividade e informa, antes do passeio, qualquer condição médica que possa representar risco. A omissão dessa informação é de responsabilidade do CONTRATANTE.",
          ],
        },
        {
          heading: "4. Álcool, drogas e conduta",
          paragraphs: [
            "É proibida a participação sob efeito de álcool, drogas ilícitas ou qualquer substância que comprometa a capacidade física ou mental.",
            "A CONTRATADA pode impedir o embarque ou excluir do passeio, sem reembolso, quem descumprir orientação do guia, colocar em risco a si ou a terceiros, consumir álcool ou drogas durante a atividade, praticar indisciplina, causar dano ambiental ou agir de forma agressiva ou incompatível com a atividade.",
          ],
        },
        {
          heading: "5. Veículo",
          paragraphs: [
            "Com translado, o carro é do guia. Cada carro leva até 4 clientes e 1 guia, e o guia vai nesse carro.",
            "Sem translado, o deslocamento é no veículo do grupo. O carro de passeio tem 5 lugares: um é do guia e cabem no máximo 4 clientes. O CONTRATANTE garante lugar para o guia. Sem essa vaga, a CONTRATADA pode cancelar o passeio, na forma da Política de Cancelamento.",
          ],
        },
        {
          heading: "6. Objetos pessoais",
          paragraphs: [
            "Cada participante é responsável pelos próprios pertences. A CONTRATADA não responde por perda, furto, roubo, quebra, molhamento ou dano a celular, câmera, drone, documento, dinheiro, joia, equipamento eletrônico ou qualquer objeto pessoal.",
          ],
        },
        {
          heading: "7. Fauna e flora",
          paragraphs: [
            "É proibido alimentar, capturar, perseguir, tocar ou provocar animal silvestre, e retirar planta, pedra ou qualquer elemento do ambiente natural. O CONTRATANTE cumpre a legislação ambiental e as normas das unidades de conservação visitadas.",
          ],
        },
        {
          heading: "8. Emergências",
          paragraphs: [
            "Em acidente ou mal súbito, o guia presta os primeiros atendimentos compatíveis com o treinamento dele e aciona o serviço público de emergência quando necessário. O CONTRATANTE reconhece que o tempo de resposta em área natural pode ser maior do que na cidade.",
          ],
        },
        {
          heading: "9. Decisões do guia",
          paragraphs: [
            "Para preservar a segurança do grupo, o guia pode alterar o roteiro, os horários e a ordem de visitação, cancelar ou substituir um atrativo, reduzir o tempo de permanência, interromper uma atividade, voltar antes ou encerrar o passeio. O participante cumpre essas decisões na hora.",
            "Essas medidas são preventivas. O efeito sobre o preço e sobre o cancelamento está na Política de Cancelamento.",
          ],
        },
        {
          heading: "10. Ciência",
          paragraphs: [
            "Ao contratar, o CONTRATANTE declara que leu esta Política, compreende os riscos do ecoturismo e autoriza o guia a adotar as medidas necessárias para a segurança do grupo.",
          ],
        },
      ],
      guide: [
        {
          heading: "1. Aceite",
          paragraphs: [
            "Ao entrar na plataforma, o GUIA declara ter lido e aceito estes Termos. A plataforma é a Guia Chapada Veadeiros.",
          ],
        },
        {
          heading: "2. Fila",
          paragraphs: [
            "Para receber oportunidade, o GUIA precisa responder que tem interesse em participar da lista. Sem esse aceite, não entra na fila.",
            "A fila é só do passeio sem translado. Com translado não há fila: a proposta vai ao mesmo tempo para todos os guias com veículo, modelo e ano no perfil, e o primeiro que aceitar fica com a vaga. Na fila sem translado, o GUIA vê a própria posição e é avisado quando ela muda. A posição não aparece para o cliente.",
            "Na fila sem translado, quem aceita vai para o final, e a próxima oportunidade usa essa nova ordem. O guia do TOP 3 que não clica para aceitar acumula uma vez. Na terceira vez sem clique, vai para o final da fila. Aceitar não entra nessa conta.",
          ],
        },
        {
          heading: "3. Oportunidade",
          paragraphs: [
            "Sem translado, a excursão com quórum fechado é enviada aos 3 primeiros da fila, o TOP 3. O privativo sem translado não usa esse clique: os guias livres entram numa lista e o cliente escolhe. Com translado na excursão, não há fila nem prioridade: todos os guias com veículo cadastrado recebem a proposta ao mesmo tempo e o primeiro que aceitar fica com a vaga. No privativo com translado, a lista de escolha só inclui guias com veículo. Os carros além do primeiro seguem o aviso geral de quem tem veículo.",
            "Diego Navi Marques Carvalho é o guia especial e não entra na fila. Enquanto essa prioridade estiver ativa, toda venda confirmada sem translado chega primeiro para ele, pelo prazo de 4 horas e 20 minutos contado só das 6h às 9h e das 16h às 22h, para aceitar ou recusar. Com translado, ele só recebe a proposta se tiver veículo cadastrado, junto com os outros guias. Na prioridade sem translado, a saída entra na agenda dele enquanto o prazo corre. Se ele recusar, não responder, já estiver ocupado nesse dia, ou se essa prioridade estiver desligada, a venda segue para o TOP 3. Santa Bárbara, Capivara, Candaru e Guardião não passam por ele: vão para a fila Kalunga.",
            "O envio da oportunidade é pelo WhatsApp. O GUIA e o cliente também recebem o aviso por e-mail. A mensagem traz os dados da excursão ou do passeio exclusivo, o pagamento que aquele GUIA recebe, o número de pessoas, se é com o veículo do GUIA, e os dados do comprador: nome, telefone e e-mail.",
            "O aceite é o clique no link enviado no WhatsApp e o mesmo pedido aparece na Agenda. O tempo para aceitar é de 4 horas e 20 minutos e só corre das 6h às 9h e das 16h às 22h. Fora desses horários a contagem para. O primeiro clique válido ocupa a vaga e o link expira. Quem mais recebeu a oportunidade é avisado, por WhatsApp e por e-mail, de que ela foi aceita por outro guia.",
            "Se nenhum dos 3 aceitar nesse prazo, a vez passa aos próximos da fila, com o mesmo prazo de 4 horas e 20 minutos. O primeiro que aceitar entra.",
            "Faltando 12 horas para o início, se a saída ainda estiver em formação ou aguardando guia ou veículo, ela é cancelada. O Pix é devolvido. No cartão, nada é cobrado e a reserva é liberada. A saída também é cancelada, com o mesmo estorno, quando a fila acaba sem aceite ou quando a CONTRATADA cancela.",
            "O passeio fica associado ao GUIA quando ele aceita. Com transporte, a confirmação também exige o veículo. A cobrança de cada reserva no cartão ocorre em seguida, uma a uma. Se ninguém aceitar e a fila acabar, o passeio é cancelado porque não há guias disponíveis. No Pix o cliente é estornado. No cartão, nada é cobrado.",
          ],
        },
        {
          heading: "4. Mais de um guia e troca",
          paragraphs: [
            "No passeio com transporte, cada carro exige um GUIA. Cinco clientes exigem 2 guias. Todos os guias com veículo recebem a proposta ao mesmo tempo. O primeiro aceite ocupa uma vaga. Se ainda faltar outro carro, a proposta continua aberta para os demais até todas as vagas serem preenchidas. Quando a última vaga fecha, os outros são avisados de que a proposta não está mais disponível. Quem já aceitou permanece.",
            "Enquanto faltar guia, os inscritos veem \"Aguardando confirmação operacional\" e não podem cancelar. No cartão, nada é cobrado nessa espera.",
            "Se nenhum guia aceitar, o passeio é cancelado porque não há guias disponíveis. O cliente e os guias que receberam a oportunidade são avisados por WhatsApp e por e-mail. No Pix há estorno. No cartão, nada foi cobrado.",
            "Um administrador pode destacar um GUIA a qualquer momento. Isso não vale como aceite. O GUIA recebe no WhatsApp a mensagem \"Clique aqui para confirmar\" e só entra quando clica no link. Em seguida recebe a confirmação da guiagem. A cobrança não sai enquanto faltar guia necessário ou quórum.",
            "Se o GUIA do passeio for trocado, ele recebe o aviso, com ou sem motivo. O motivo fica só com ele. O cliente é avisado por WhatsApp e por e-mail, sem o motivo, com os dados do novo guia. A troca não cancela, não devolve e não reduz o preço.",
          ],
        },
        {
          heading: "5. Confirmação e cobrança do cliente",
          paragraphs: [
            "Não há sinal. O cartão do cliente fica apenas salvo até a confirmação.",
            "A cobrança de 100% no cartão só ocorre quando o passeio está associado ao GUIA e, se houver translado, quando o veículo está garantido. Sem o aceite do guia, o cartão não passa. Cada carro leva até 4 clientes e 1 guia.",
            "Na Excursão, a confirmação ainda exige quórum. Cada reserva é cobrada na sua vez. Não há um teste único de todos os cartões do grupo. Se um cartão for recusado, nada é cobrado daquela reserva, o guia continua na saída e o cliente é avisado para trocar o cartão.",
          ],
        },
        {
          heading: "6. Cartão recusado",
          paragraphs: [
            "Se o cartão de uma reserva for recusado, nada é cobrado daquela reserva. O cliente é avisado para trocar o cartão, sem prazo fixo.",
            "A recusa não desfaz a confirmação. O GUIA continua associado à saída e não volta ao final da fila. O cliente não cancela por causa dessa recusa.",
          ],
        },
        {
          heading: "7. Veículo",
          paragraphs: [
            "Com translado, o carro é do GUIA e sai da cidade de hospedagem do cliente. Cada carro leva até 4 clientes e 1 guia. O guia não ocupa vaga de cliente. Cinco clientes exigem 2 carros e 2 guias. Só recebe essa proposta quem tem veículo, modelo e ano no perfil.",
            "Sem translado, o veículo é do cliente. O carro de passeio tem 5 lugares. Um lugar é do GUIA. Cabem no máximo 4 clientes por carro.",
            "Se na saída não houver vaga para o GUIA, a plataforma pode cancelar o passeio por inviabilidade operacional.",
          ],
        },
        {
          heading: "8. Depois da confirmação",
          paragraphs: [
            "Depois da cobrança, o cliente não cancela. O cancelamento manual do passeio é apenas do administrador.",
            "Quando o GUIA aceita, a agenda daquele dia bloqueia na hora. Ele não recebe outra proposta nesse dia enquanto o passeio espera outro guia ou o cartão. Se o passeio for cancelado, a agenda abre de novo.",
            "O GUIA pode soltar a guiagem pela agenda. A vaga volta à fila. O cliente só é notificado na hora da troca, por WhatsApp e por e-mail, com os dados do novo guia, sem o motivo da saída.",
            "Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado porque não há guias disponíveis. No Pix o cliente recebe o estorno. No cartão, a cobrança só existe se um guia já tinha aceitado. O GUIA é avisado por WhatsApp e por e-mail. Nenhum GUIA recebe por esse passeio.",
            "No cancelamento por mau tempo, o cliente recebe o estorno, nenhum GUIA recebe, e o GUIA do passeio é notificado por WhatsApp e por e-mail.",
          ],
        },
        {
          heading: "9. Idioma",
          paragraphs: [
            "Guia em português não gera acréscimo para o cliente.",
            "Se o cliente escolhe outro idioma, o acréscimo daquele passeio — percentual ou valor fixo, na cópia da tarifa do atrativo e da cidade — incide uma vez sobre o total da compra, depois dos descontos de idade. Não incide por pessoa.",
            "A oportunidade usa a fila dos guias desse idioma, na ordem do ranking. O guia especial recebe essa venda antes da fila, como qualquer outra, pelo prazo de 4 horas e 20 minutos contado só das 6h às 9h e das 16h às 22h, se o dia dele estiver livre.",
          ],
        },
      ],
    },
    en: {
      cancel: [
        {
          heading: "1. Acceptance of the booking and the charge",
          paragraphs: [
            "Version of 12 November 2026.",
            "By completing the purchase, the Client states that they have read, understood and fully accepted this Cancellation Policy and the Terms of Service of Guia Chapada Veadeiros.",
            "The Client books tour(s) with local guides, by the day. Guia Chapada Veadeiros connects the Client and the LOCAL GUIDE, who provides the tour.",
          ],
        },
        {
          heading: "1.1 When the card is charged",
          paragraphs: [
            "On a credit card, domestic or international, the card network only confirms at purchase that the card exists and can be charged later.",
            "The automatic charge is authorized only when the tour is confirmed, under section 2.6.",
            "On Pix, the amount is paid at booking and refunded in the cases set out in this Policy.",
          ],
        },
        {
          heading: "1.2 When the tour is confirmed",
          paragraphs: [
            "A tour is confirmed if, and only if, on a shared tour, with or without transport, the minimum group is closed and every required guide has accepted. With transport, each car needs its own guide.",
            "On a private tour, with or without transport, the tour is confirmed when the guide has accepted and, if there is transport, the vehicle is secured.",
            "In both cases the tour is confirmed. Each booking is then charged on its card. From confirmation on, the Client does not cancel, even if that booking's card has not been charged yet. A refund decided by the Company follows section 5. This is a service booked in advance, in which the provider, the guide, sets that date aside for the group.",
          ],
        },
        {
          heading: "1.3 Transport",
          paragraphs: [
            "With transport, each car takes up to 4 guests and 1 guide.",
          ],
        },
        {
          heading: "2. Shared tours",
          paragraphs: [
            "The rules in this section apply to a shared tour.",
          ],
        },
        {
          heading: "2.1 Forming and the minimum group",
          paragraphs: [
            "The minimum group is 3 to 4 people per departure, unless the tour is set to another number. It may vary by tour, route and guide, always with prior notice on the platform.",
            "When someone books a shared tour before the minimum group is met, the platform opens a departure with the status Forming, on that day, leaving from that city, with or without transport. Other people may join by buying on the site while there are seats. The departure stays forming while the minimum group is still open.",
          ],
        },
        {
          heading: "2.2 Waiting for operational confirmation",
          paragraphs: [
            "When the minimum group is reached, the seat is offered to the guides and the status becomes Waiting for operational confirmation: the minimum group is met, and a guide is still missing or, on a tour with transport, a vehicle.",
            "The guide has 4 hours and 20 minutes to accept or decline. That time runs only from 6:00 to 9:00 and from 16:00 to 22:00. Outside those hours the countdown pauses.",
            "On a shared tour without transport, the offer goes to the first 3 guides in the queue at the same time, and the first to accept is assigned. If none accept, the turn passes to the next 3.",
            "On a shared tour with transport, each car needs its own guide and vehicle, and every guide with a registered vehicle receives the offer together. While one is missing, the status continues and nobody is charged.",
            "The Client is told by WhatsApp and by email when the departure enters this status.",
            "On a card nothing is charged. On Pix, the amount already paid stays until the departure is confirmed or cancelled. In this status the Client cannot cancel.",
            "The wait ends at whichever comes first: a guide accepts; the queue ends with no acceptance; or 12 hours remain before the start and the departure is still not confirmed.",
            "If the queue ends with no acceptance, the tour is cancelled because no guides are available. The Client is told by WhatsApp and by email. On Pix the amount is refunded. On a card nothing is charged.",
            "When 12 hours remain before the start, if the departure is still forming or still waiting for operational confirmation, it is cancelled. Pix is refunded. The card hold that was never charged is released and nothing is charged.",
          ],
        },
        {
          heading: "2.3 Cancellation by the Client while the tour is forming",
          paragraphs: [
            "While the departure is Forming, the Client may cancel at any time.",
            "On a card there is no charge and no refund, because the tour has not been charged. On Pix, the refund is 100% of that tour.",
            "On a booking with more than one day, the Client cancels only the tours that are still forming. A day that is already confirmed stays in place and is not refunded.",
            "The Company may also close a forming departure at any time, for an operational reason or because the tour cannot be run. On Pix the amount is refunded. On a card nothing is charged.",
          ],
        },
        {
          heading: "2.4 No tour switch",
          paragraphs: [
            "There is no tour switch. The Client takes the tour they booked or cancels while the departure is still forming. There is no offer to move to another tour on the same day.",
          ],
        },
        {
          heading: "2.5 Automatic cancellation 12 hours before",
          paragraphs: [
            "When 12 hours remain before the start, if the shared tour is still forming, without the minimum group, or still waiting for operational confirmation, without a guide or a vehicle, the platform cancels the departure.",
            "On Pix, the refund is 100%. On a card, nothing was charged and the card hold is released.",
            "A tour set for 8:00 on Saturday is cancelled at 20:00 on Friday if, at that time, the minimum group has not closed or the operational confirmation is not finished.",
            "Once the departure is confirmed, the card is charged 100% and the Client does not cancel and does not receive a refund. A shared tour is confirmed when the minimum group is met and a guide is assigned and, if there is transport, a vehicle. A private tour is confirmed when a guide is assigned and, if there is transport, a vehicle.",
          ],
        },
        {
          heading: "2.6 Confirmation and the charge",
          paragraphs: [
            "A shared tour is confirmed when the minimum group is closed and every required guide has accepted. A full group without a guide does not charge the card. Once the guide accepts, the departure is confirmed: the seat is final, the guide's day is blocked, and the Client does not cancel, even if the card has not been charged yet.",
            "Each booking is charged in its turn, at 100%, on the saved card. There is no single test of every card in the group before someone is charged.",
            "If one booking's card is declined, nothing is charged on that booking and the Client is asked to replace the card, with no fixed deadline. The decline does not undo confirmation: the guide stays assigned to the departure and does not return to the end of the queue.",
            "From the charge on, the Client does not cancel and there is no refund, under section 4.",
          ],
        },
        {
          heading: "3. Private tours",
          paragraphs: [
            "A private tour is exclusive to the Client's group. It is not a shared departure and it does not depend on other bookings. There is no tour switch. When 12 hours remain before the start, if the guide or the vehicle is still not set, the departure is cancelled: Pix is refunded and the card hold that was never charged is released.",
            "The card stays only saved, with no charge, until a guide is set.",
            "Guides who are free on the date are called in waves of up to 5. The list closes when 3 guides agree to be chosen. If fewer than 3 guides are free, the list closes with whoever accepted. If nobody accepts, the tour is cancelled because no guides are available. The Client receives the link by WhatsApp and by email and has 6 hours to choose, counted on the same clock as section 2.2: it runs only from 6:00 to 9:00 and from 16:00 to 22:00. If the time runs out, the highest guide among those who accepted is assigned. While the list is open, the Client does not cancel and the card is not charged.",
            "Without transport, the vehicle is the Client's and confirmation happens when the guide is set. With transport, the list includes only guides with a vehicle, and confirmation also requires the vehicle: one car and one guide for every group of up to 4 guests. The Client chooses the guide of the first car. Further cars follow section 6.2.",
            "Once the guide is set and, with transport, the vehicle is secured, the Company tests the saved card. If it passes, the tour is assigned to that guide and the card is charged 100%. From then on there is no cancellation and no refund.",
            "If the card is declined, nothing is charged and the Client is asked to replace the card, with no fixed deadline. The decline does not undo confirmation. When the new card passes, the 100% charge happens automatically.",
          ],
        },
        {
          heading: "4. Confirmed tour: no refund",
          paragraphs: [
            "For a shared tour and a private tour, after confirmation and the charge there is no refund for a change of mind or a change of plans, delay, no-show or a missed transfer, illness, a personal or professional reason, or any other obstacle that is not the Company's.",
            "A guest who does not show up remains charged for the full amount. The platform fee is still deducted and the guide is paid for that seat. The absence does not count as a guided tour.",
          ],
        },
        {
          heading: "4.1 Check-in and guide contact",
          paragraphs: [
            "When the tour is confirmed and the Client can no longer cancel, the Company sends the guide's identification: photo, name and WhatsApp.",
            "On the day of the tour, the guide confirms check-in by reading the QR code, and confirmation is immediate. The Client receives the welcome message with the guide's photo, name and WhatsApp, and the link to review the tour at the end.",
          ],
        },
        {
          heading: "5. Cancellation by the Company",
          paragraphs: [
            "A confirmed tour is cancelled only by a platform administrator. The Client does not cancel a confirmed tour. The guide does not cancel the tour either: if the guide releases the assignment from the schedule, the seat returns to the queue under section 5.1.",
            "The Company may cancel the tour, including after confirmation, because of the guide's health or a serious impediment, force majeure or an unforeseeable event, because the tour cannot be run or because of a risk to the participants' safety, including severe weather, closure of the attraction and an order from a competent authority, lack of a vehicle for a private tour, or lack of an available guide.",
            "In these cases the Client receives a full refund of what was paid. On a card, if the charge has not happened yet, nothing is charged. No guide is paid for that tour, and the guide is told of the cancellation by WhatsApp and by email.",
          ],
        },
        {
          heading: "5.1 Guide replacement",
          paragraphs: [
            "After a guide has confirmed, the Client does not choose another. The guide may release the assignment from the schedule and, in that case, the seat returns to the queue. When the guide accepts, that day is blocked. If the tour is cancelled, the day opens again.",
            "The Client is told at that moment, by WhatsApp and by email, with the new guide's details: name, phone, email, photo, rating and description, without the reason for the change. A change of guide does not cancel the tour, does not refund it and does not reduce the price.",
            "If 2 hours remain before the tour and there is still no substitute, the tour is cancelled because no guides are available. On Pix the Client receives the refund. On a card, a charge that already happened is refunded. If the guide had not accepted yet, nothing was charged. No guide is paid for that tour.",
          ],
        },
        {
          heading: "6. The guide's seat",
          paragraphs: [
            "The rules for a seat without transport and with transport are in sections 6.1 and 6.2.",
          ],
        },
        {
          heading: "6.1 Without transport",
          paragraphs: [
            "The Client hires only the guide. Travel is in the group's own vehicle. A touring car has 5 seats: one is the guide's and at most 4 guests fit. With 5 or more people, the group brings the cars needed so that each car has at most 4 guests and a seat for the guide.",
            "If at departure there is no seat for the guide, the Company may cancel the tour because it cannot be operated, and the Client receives a full refund of what was paid.",
          ],
        },
        {
          heading: "6.2 With transport",
          paragraphs: [
            "The Client books the tour with the guide and the transfer from the city where the group is staying. The car is the guide's. On a shared tour, and on private-tour cars beyond the first, there is no queue: every guide with a vehicle on the profile, including model and year, receives the offer at the same time. The guide of the first car on a private tour is the one chosen under section 3.",
            "The first to accept gets the seat, and the others are told it is no longer available. Each car takes up to 4 guests and 1 guide. The count is one guide and one car for every group of up to 4 guests: 5 guests require 2 cars and 2 guides. The price of a private tour with transport follows the number of cars.",
          ],
        },
        {
          heading: "7. A guide in another language",
          paragraphs: [
            "A guide in Portuguese has no surcharge. If the Client chooses another language, the surcharge in reais set on that tour's rate is added.",
            "The surcharge is charged once on the booking total, after age discounts, and not per person. The amount is the same for any booking and does not change with the departure city. The Pix discount is not part of this calculation.",
          ],
        },
        {
          heading: "8. Weather",
          paragraphs: [
            "Tours take place outdoors and are subject to the weather typical of Chapada dos Veadeiros.",
            "The Client states that they understand that rain, drizzle, cloudy weather, temperature changes, higher river flow, mud on the trails and other natural conditions are part of ecotourism and are not a reason for cancellation or a refund.",
          ],
        },
        {
          heading: "8.1 Cancellation before departure",
          paragraphs: [
            "Cancellation for bad weather may happen only before the group leaves the departure city, by an administrator's decision, when there is a risk to the participants' safety or the activity cannot be carried out. The full refund in section 5 applies.",
            "After the group leaves the departure city, the service has started and the tour is not cancelled because the weather changes on the way or during the activity.",
          ],
        },
        {
          heading: "8.2 Delay and changes during the tour",
          paragraphs: [
            "Whenever the weather is expected to improve, the Company may delay departure by up to 2 hours. That delay is not a cancellation and does not create a refund. If conditions remain unsafe, the Company may cancel the tour under section 5.",
            "To protect safety, the Company may change the route, change the order of visits, cancel or replace an attraction, shorten a stop, interrupt an activity or end the tour early and return to the departure city. These measures are preventive. They are not a cancellation, a failure of the service or a breach of contract, and they do not create a refund, a price reduction or compensation.",
          ],
        },
        {
          heading: "9. Applicable law",
          paragraphs: [
            "This Policy was written under Brazilian law, in particular the Consumer Protection Code, and it preserves the Client's legal rights when the service fails or cannot be performed for a reason that is solely the Company's.",
          ],
        },
      ],
      security: [
        {
          heading: "1. Risks of the activity",
          paragraphs: [
            "Guia Chapada Veadeiros uses procedures to reduce the risks of ecotourism. The Client states that they understand that an activity in a natural setting has risks that cannot be fully removed.",
            "The Client may be exposed to uneven trails, slippery rocks, rivers, waterfalls, canyons, wildlife, insects, native vegetation, weather changes, sun exposure and other conditions of the natural setting. These conditions are part of ecotourism and are not a failure of the service.",
          ],
        },
        {
          heading: "2. The participant's responsibility",
          paragraphs: [
            "Each participant is responsible for their own safety. They must act with care, stay with the group, follow the guide's instructions, keep to the schedule, use safety equipment when it is required, respect closed areas and signs, and report any risk or feeling of illness at once.",
            "The guide orients, leads and supports the group. The guide is not responsible for a participant's individual decisions. The Client assumes the risks of recklessness, negligence, lack of skill, ignoring instructions, or conduct that puts themselves or others at risk.",
          ],
        },
        {
          heading: "3. Health",
          paragraphs: [
            "The Client states that they have the physical and psychological condition for the activity and, before the tour, informs any medical condition that may create a risk. Omitting that information is the Client's responsibility.",
          ],
        },
        {
          heading: "4. Alcohol, drugs and conduct",
          paragraphs: [
            "Participation under the effect of alcohol, illegal drugs or any substance that impairs physical or mental capacity is forbidden.",
            "The Company may refuse boarding or remove from the tour, with no refund, anyone who ignores the guide, puts themselves or others at risk, uses alcohol or drugs during the activity, is undisciplined, causes environmental damage, or behaves in an aggressive way or in a way that does not fit the activity.",
          ],
        },
        {
          heading: "5. Vehicle",
          paragraphs: [
            "With transport, the car is the guide's. Each car takes up to 4 guests and 1 guide, and the guide rides in that car.",
            "Without transport, travel is in the group's vehicle. A touring car has 5 seats: one is the guide's and at most 4 guests fit. The Client guarantees a seat for the guide. Without that seat, the Company may cancel the tour under the Cancellation Policy.",
          ],
        },
        {
          heading: "6. Personal belongings",
          paragraphs: [
            "Each participant is responsible for their own belongings. The Company is not responsible for loss, theft, robbery, breakage, wetting or damage to a phone, camera, drone, document, money, jewelry, electronic equipment or any personal item.",
          ],
        },
        {
          heading: "7. Wildlife and plants",
          paragraphs: [
            "It is forbidden to feed, capture, chase, touch or provoke wildlife, and to remove a plant, a rock or any element of the natural setting. The Client follows environmental law and the rules of the protected areas visited.",
          ],
        },
        {
          heading: "8. Emergencies",
          paragraphs: [
            "In an accident or a sudden illness, the guide gives the first aid that matches the guide's training and calls the public emergency service when needed. The Client understands that the response time in a natural area may be longer than in a city.",
          ],
        },
        {
          heading: "9. The guide's decisions",
          paragraphs: [
            "To protect the group's safety, the guide may change the route, the times and the order of visits, cancel or replace an attraction, shorten a stop, interrupt an activity, return early or end the tour. The participant follows those decisions at once.",
            "These measures are preventive. The effect on the price and on cancellation is in the Cancellation Policy.",
          ],
        },
        {
          heading: "10. Acknowledgement",
          paragraphs: [
            "By booking, the Client states that they have read this Policy, understand the risks of ecotourism and authorize the guide to take the measures needed for the group's safety.",
          ],
        },
      ],
    },
    es: {
      cancel: [
        {
          heading: "1. Aceptación de la contratación y el cobro",
          paragraphs: [
            "Versión del 12 de noviembre de 2026.",
            "Al concluir la compra, el contratante declara haber leído, comprendido y aceptado íntegramente esta Política de cancelación y los Términos de prestación de servicios de Guia Chapada Veadeiros.",
            "El contratante contrata paseo(s) con guías locales, por día. Guia Chapada Veadeiros conecta al contratante con el GUÍA LOCAL, que presta el paseo.",
          ],
        },
        {
          heading: "1.1 Cuándo se cobra la tarjeta",
          paragraphs: [
            "En la tarjeta de crédito, nacional o internacional, la operadora solo confirma en la compra que la tarjeta existe y acepta un cobro futuro.",
            "El cobro automático del valor solo se autoriza cuando el paseo está confirmado, en la forma de la sección 2.6.",
            "En el Pix, el valor se paga en la reserva y se reembolsa en los casos previstos en esta Política.",
          ],
        },
        {
          heading: "1.2 Cuándo el paseo está confirmado",
          paragraphs: [
            "Un paseo está confirmado si, y solo si, en la excursión, con o sin traslado, el quórum está cerrado y todos los guías necesarios aceptaron. Con traslado, cada auto exige su propio guía.",
            "En el paseo privado, con o sin traslado, el paseo está confirmado cuando el guía aceptó y, si hay traslado, el vehículo está asegurado.",
            "En esas dos situaciones el paseo está confirmado. El cobro de cada reserva en la tarjeta se hace enseguida. A partir de la confirmación el contratante no cancela, aunque la tarjeta de esa reserva todavía no haya sido cobrada. El reembolso por decisión de la contratada sigue la sección 5. Se trata de un servicio con reserva anticipada, en el cual el prestador, que es el guía, dedica esa fecha al grupo.",
          ],
        },
        {
          heading: "1.3 Traslado",
          paragraphs: [
            "Con traslado, cada auto lleva hasta 4 clientes y 1 guía.",
          ],
        },
        {
          heading: "2. Paseos en excursión",
          paragraphs: [
            "Las reglas de esta sección valen para la modalidad excursión.",
          ],
        },
        {
          heading: "2.1 Formación y quórum",
          paragraphs: [
            "El quórum es de 3 a 4 personas por salida, salvo cuando el paseo tenga otro número configurado. Puede variar por paseo, recorrido y guía, siempre con aviso previo en la plataforma.",
            "Cuando alguien compra una excursión sin quórum, la plataforma abre una salida con el estado En formación, ese día, saliendo de la ciudad, con o sin traslado. Otras personas pueden entrar comprando en el sitio mientras haya plazas. La salida permanece en formación mientras falte quórum.",
          ],
        },
        {
          heading: "2.2 Esperando confirmación operativa",
          paragraphs: [
            "Cuando se alcanza el quórum, la plaza se ofrece a los guías y el estado pasa a ser Esperando confirmación operativa: quórum alcanzado, falta guía o, en el paseo con traslado, vehículo.",
            "El guía tiene 4 horas y 20 minutos para aceptar o rechazar. Ese tiempo solo corre de 6:00 a 9:00 y de 16:00 a 22:00. Fuera de esos horarios la cuenta se detiene.",
            "En la excursión sin traslado, la propuesta va a los 3 primeros de la fila al mismo tiempo, y entra el primero que acepte. Si ninguno acepta, la vez pasa a los 3 siguientes.",
            "En la excursión con traslado, cada auto exige su propio guía y vehículo, y todos los guías con vehículo registrado reciben la propuesta juntos. Mientras falte uno, el estado continúa y nadie es cobrado.",
            "El contratante es avisado por WhatsApp y por correo electrónico cuando la salida entra en ese estado.",
            "En la tarjeta nada se cobra. En el Pix, el valor ya pagado permanece hasta la confirmación o la cancelación de la salida. En ese estado el contratante no puede cancelar.",
            "La espera termina en lo que ocurra primero: un guía acepta; la fila se acaba sin aceptación; o faltan 12 horas para el inicio y la salida todavía no está confirmada.",
            "Si la fila se acaba sin aceptación, el paseo se cancela porque no hay guías disponibles. El contratante es avisado por WhatsApp y por correo electrónico. En el Pix el valor se reembolsa. En la tarjeta nada se cobra.",
            "Faltando 12 horas para el inicio, si la salida todavía está en formación o en Esperando confirmación operativa, se cancela. El Pix se devuelve. La reserva de la tarjeta que no fue cobrada se libera y nada se cobra.",
          ],
        },
        {
          heading: "2.3 Cancelación por el contratante durante la formación",
          paragraphs: [
            "Mientras la salida está En formación, el contratante puede cancelar en cualquier momento.",
            "En la tarjeta no hay cobro ni reembolso, porque el paseo todavía no fue cobrado. En el Pix, la devolución es del 100% del valor de ese paseo.",
            "En una reserva con más de un día, el contratante cancela solo los paseos que todavía están en formación. El día ya confirmado permanece y no se reembolsa.",
            "La contratada también puede cerrar la formación en cualquier momento, por un motivo operativo o porque el paseo no puede realizarse. En el Pix el valor se reembolsa. En la tarjeta nada se cobra.",
          ],
        },
        {
          heading: "2.4 Sin cambio de paseo",
          paragraphs: [
            "No hay cambio de paseo. El contratante hace el paseo contratado o cancela mientras la salida está en formación. No existe oferta para pasar a otro paseo del mismo día.",
          ],
        },
        {
          heading: "2.5 Cancelación automática 12 horas antes",
          paragraphs: [
            "Faltando 12 horas para el inicio, si la excursión todavía está en formación, sin quórum, o en Esperando confirmación operativa, sin guía o sin vehículo, la plataforma cancela la salida.",
            "En el Pix, la devolución es del 100%. En la tarjeta, nada fue cobrado y la reserva de la tarjeta se libera.",
            "Un paseo marcado para las 8:00 del sábado se cancela a las 20:00 del viernes si, a esa hora, el quórum no cerró o la confirmación operativa no se completó.",
            "Cuando la salida se confirma, el cobro del 100% se hace en la tarjeta y el contratante no cancela y no recibe devolución. La confirmación de la excursión exige quórum y guía asignado y, si hay traslado, vehículo. La del paseo privado exige el guía asignado y, si hay traslado, vehículo.",
          ],
        },
        {
          heading: "2.6 Confirmación y cobro",
          paragraphs: [
            "La excursión queda confirmada cuando el quórum está cerrado y todos los guías necesarios aceptaron. Quórum sin guía no cobra la tarjeta. Con la aceptación del guía, la salida está confirmada: la plaza queda definitiva, la agenda del guía se bloquea y el contratante no cancela, aunque la tarjeta todavía no haya sido cobrada.",
            "Cada reserva se cobra en su turno, al 100%, en la tarjeta guardada. No hay una prueba única de todas las tarjetas del grupo antes de cobrar a alguien.",
            "Si la tarjeta de una reserva es rechazada, nada se cobra de esa reserva y se avisa al contratante para que cambie la tarjeta, sin plazo fijo. El rechazo no deshace la confirmación: el guía sigue asociado a la salida y no vuelve al final de la fila.",
            "A partir del cobro el contratante no cancela y no hay devolución, en la forma de la sección 4.",
          ],
        },
        {
          heading: "3. Paseos privados",
          paragraphs: [
            "El paseo privado es exclusivo para el grupo del contratante. No es una excursión compartida y no depende de otras inscripciones. No hay cambio de paseo. Faltando 12 horas para el inicio, si el guía o el vehículo todavía no está definido, la salida se cancela: el Pix se devuelve y la reserva de la tarjeta que no fue cobrada se libera.",
            "La tarjeta queda solo guardada, sin cobro, hasta que un guía quede definido.",
            "Los guías libres en la fecha son llamados en tandas de hasta 5. La lista se cierra cuando 3 guías aceptan participar. Si no hay 3 guías libres, la lista se cierra con quien aceptó. Si nadie acepta, el paseo se cancela porque no hay guías disponibles. El contratante recibe el enlace por WhatsApp y por correo electrónico y tiene 6 horas para elegir, contadas en el mismo reloj de la sección 2.2: solo corren de 6:00 a 9:00 y de 16:00 a 22:00. Si el plazo termina, entra el guía mejor colocado entre los que aceptaron. Mientras la lista está abierta, el contratante no cancela y la tarjeta no se cobra.",
            "Sin traslado, el vehículo es del contratante y la confirmación ocurre cuando el guía queda definido. Con traslado, la lista solo incluye guías con vehículo, y la confirmación también exige el vehículo: un auto y un guía por cada grupo de hasta 4 clientes. El contratante elige al guía del primer auto. Los autos siguientes siguen la sección 6.2.",
            "Con el guía definido y, en el traslado, el vehículo asegurado, la contratada prueba la tarjeta guardada. Si pasa, el paseo queda asociado a ese guía y la tarjeta se cobra al 100%. A partir de ahí no hay cancelación ni devolución.",
            "Si la tarjeta es rechazada, nada se cobra y se avisa al contratante para que cambie la tarjeta, sin plazo fijo. El rechazo no deshace la confirmación. Cuando la nueva tarjeta pasa, el cobro del 100% ocurre automáticamente.",
          ],
        },
        {
          heading: "4. Paseo confirmado: sin restitución",
          paragraphs: [
            "Para la excursión y el paseo privado, después de la confirmación y del cobro no hay restitución por desistimiento o cambio de planes, retraso, inasistencia o pérdida del transporte, enfermedad, motivo personal o profesional, o cualquier otro impedimento que no sea de la contratada.",
            "Quien no se presenta sigue cobrado por el valor integral. La parte de la plataforma sigue descontándose y el guía recibe el pago de esa plaza. La ausencia no entra en el conteo de guiado.",
          ],
        },
        {
          heading: "4.1 Check-in y contacto del guía",
          paragraphs: [
            "Cuando el paseo está confirmado y el contratante ya no puede cancelar, la contratada envía la identificación del guía: foto, nombre y WhatsApp.",
            "El día del paseo, el guía confirma el check-in con la lectura del QR, y la confirmación es inmediata. El contratante recibe el mensaje de bienvenida con la foto, el nombre y el WhatsApp del guía, y el enlace para evaluar el paseo al final.",
          ],
        },
        {
          heading: "5. Cancelación por la contratada",
          paragraphs: [
            "La cancelación del paseo confirmado la hace solo un administrador de la plataforma. El contratante no cancela el paseo confirmado. El guía tampoco cancela el paseo: si suelta la guiatura en la agenda, la plaza vuelve a la fila, en la forma de la sección 5.1.",
            "La contratada puede cancelar el paseo, incluso después de la confirmación, por un problema de salud o un impedimento grave del guía, fuerza mayor o caso fortuito, inviabilidad de la realización o riesgo para la seguridad de los participantes, incluidas las condiciones climáticas severas, la interdicción del atractivo y la determinación de una autoridad competente, falta de vehículo para realizar el paseo privado, o falta de guía disponible.",
            "En esas hipótesis el contratante recibe el reembolso integral de lo que fue pagado. En la tarjeta, si el cobro todavía no ocurrió, nada se cobra. Ningún guía recibe por ese paseo, y el guía es avisado de la cancelación por WhatsApp y por correo electrónico.",
          ],
        },
        {
          heading: "5.1 Sustitución del guía",
          paragraphs: [
            "Después de que un guía confirmó, el contratante no elige otro. El guía puede soltar la guiatura por la agenda y, en ese caso, la plaza vuelve a la fila. Cuando acepta, la agenda de ese día se bloquea. Si el paseo se cancela, la agenda se abre de nuevo.",
            "El contratante es avisado en el momento, por WhatsApp y por correo electrónico, con los datos del nuevo guía: nombre, teléfono, correo, foto, nota y descripción, sin el motivo de la salida. El cambio de guía no cancela, no devuelve y no reduce el precio.",
            "Si faltan 2 horas para el paseo y todavía no hay sustituto, el paseo se cancela porque no hay guías disponibles. En el Pix el contratante recibe el reembolso. En la tarjeta, el cobro que ya haya ocurrido se reembolsa. Si el guía todavía no había aceptado, nada fue cobrado. Ningún guía recibe por ese paseo.",
          ],
        },
        {
          heading: "6. Plaza del guía",
          paragraphs: [
            "Las reglas de plaza sin traslado y con traslado están en las secciones 6.1 y 6.2.",
          ],
        },
        {
          heading: "6.1 Sin traslado",
          paragraphs: [
            "El contratante contrata solo al guía. El desplazamiento es en el vehículo del propio grupo. El auto de paseo tiene 5 lugares: uno es del guía y caben como máximo 4 clientes. Con 5 o más personas, el grupo lleva los autos necesarios para que cada auto tenga como máximo 4 clientes y lugar para el guía.",
            "Si en la salida no hay plaza para el guía, la contratada puede cancelar el paseo por inviabilidad operativa, y el contratante recibe el reembolso integral de lo que fue pagado.",
          ],
        },
        {
          heading: "6.2 Con traslado",
          paragraphs: [
            "El contratante contrata el paseo con el guía y el transporte desde la ciudad de hospedaje. El auto es del guía. En la excursión, y en los autos del paseo privado además del primero, no hay fila: todos los guías con vehículo registrado en el perfil, con modelo y año, reciben la propuesta al mismo tiempo. El guía del primer auto del paseo privado es el elegido en la sección 3.",
            "El primero que acepta se queda con la plaza, y los demás son avisados de que ya no está disponible. Cada auto lleva hasta 4 clientes y 1 guía. La cuenta es un guía y un auto por cada grupo de hasta 4 clientes: 5 clientes exigen 2 autos y 2 guías. El precio del paseo privado con traslado acompaña el número de autos.",
          ],
        },
        {
          heading: "7. Guía en otro idioma",
          paragraphs: [
            "El guía en portugués no tiene recargo. Si el contratante elige otro idioma, entra el recargo en reales definido en la tarifa de ese paseo.",
            "El recargo se cobra una vez sobre el total de la compra, después de los descuentos de edad, y no por persona. El valor es el mismo para cualquier compra y no cambia según la ciudad de salida. El descuento del Pix no entra en esa cuenta.",
          ],
        },
        {
          heading: "8. Condiciones climáticas",
          paragraphs: [
            "Los paseos se realizan en un ambiente natural y están sujetos a las condiciones climáticas típicas de la Chapada dos Veadeiros.",
            "El contratante declara estar al tanto de que la lluvia, la llovizna, el tiempo nublado, los cambios de temperatura, el aumento del caudal de los ríos, el barro en los senderos y los demás fenómenos naturales forman parte de la actividad de ecoturismo y no constituyen motivo de cancelación o reembolso.",
          ],
        },
        {
          heading: "8.1 Cancelación antes de la salida",
          paragraphs: [
            "La cancelación por mal tiempo solo puede ocurrir antes de la salida de la ciudad de embarque, por decisión del administrador, cuando haya riesgo para la seguridad de los participantes o inviabilidad técnica de la actividad. Se aplica el reembolso integral de la sección 5.",
            "Después de la salida de la ciudad de embarque, la prestación del servicio está iniciada y el paseo no se cancela por un cambio del tiempo en el camino o durante la actividad.",
          ],
        },
        {
          heading: "8.2 Aplazamiento y cambios durante el paseo",
          paragraphs: [
            "Siempre que haya previsión de mejora de las condiciones climáticas, la contratada puede aplazar el horario de salida hasta 2 horas, sin que eso caracterice cancelación ni genere reembolso. Si persisten condiciones inseguras, la contratada puede cancelar el paseo, aplicándose la sección 5.",
            "Para preservar la seguridad, la contratada puede alterar el recorrido, el orden de visita, cancelar o sustituir un atractivo, reducir el tiempo de permanencia, interrumpir una actividad o terminar el paseo antes del horario, regresando a la ciudad de embarque. Esas medidas son preventivas y no caracterizan cancelación, falla en la prestación del servicio o incumplimiento contractual, ni generan reembolso, reducción o indemnización.",
          ],
        },
        {
          heading: "9. Legislación aplicable",
          paragraphs: [
            "Esta Política fue elaborada de conformidad con la legislación brasileña, en especial el Código de Defensa del Consumidor, preservando los derechos legales del contratante en las hipótesis de falla en la prestación del servicio o imposibilidad de su ejecución por responsabilidad exclusiva de la contratada.",
          ],
        },
      ],
      security: [
        {
          heading: "1. Riesgos de la actividad",
          paragraphs: [
            "Guia Chapada Veadeiros adopta procedimientos para reducir los riesgos del ecoturismo. El contratante declara estar al tanto de que la actividad en un ambiente natural tiene riesgos que no pueden eliminarse por completo.",
            "El contratante podrá estar expuesto a senderos irregulares, piedras resbaladizas, ríos, cascadas, cañones, animales silvestres, insectos, vegetación nativa, cambios climáticos, exposición al sol y demás condiciones del ambiente natural. Esas condiciones forman parte del ecoturismo y no caracterizan una falla en la prestación del servicio.",
          ],
        },
        {
          heading: "2. Responsabilidad del participante",
          paragraphs: [
            "Cada participante es responsable de su propia seguridad. Debe actuar con prudencia, permanecer junto al grupo, seguir las orientaciones del guía, respetar los horarios, usar el equipo de seguridad cuando se exija, respetar áreas cerradas y señalizaciones, y comunicar de inmediato cualquier riesgo o malestar.",
            "El guía orienta, conduce y apoya al grupo. No responde por las decisiones individuales del participante. El contratante asume los riesgos de imprudencia, negligencia, impericia, incumplimiento de las orientaciones o conducta que ponga en riesgo a sí mismo o a terceros.",
          ],
        },
        {
          heading: "3. Salud",
          paragraphs: [
            "El contratante declara tener condiciones físicas y psicológicas compatibles con la actividad e informa, antes del paseo, cualquier condición médica que pueda representar un riesgo. La omisión de esa información es responsabilidad del contratante.",
          ],
        },
        {
          heading: "4. Alcohol, drogas y conducta",
          paragraphs: [
            "Está prohibida la participación bajo efecto de alcohol, drogas ilícitas o cualquier sustancia que comprometa la capacidad física o mental.",
            "La contratada puede impedir el embarque o excluir del paseo, sin reembolso, a quien incumpla una orientación del guía, ponga en riesgo a sí mismo o a terceros, consuma alcohol o drogas durante la actividad, practique indisciplina, cause daño ambiental o actúe de forma agresiva o incompatible con la actividad.",
          ],
        },
        {
          heading: "5. Vehículo",
          paragraphs: [
            "Con traslado, el auto es del guía. Cada auto lleva hasta 4 clientes y 1 guía, y el guía va en ese auto.",
            "Sin traslado, el desplazamiento es en el vehículo del grupo. El auto de paseo tiene 5 lugares: uno es del guía y caben como máximo 4 clientes. El contratante garantiza lugar para el guía. Sin esa plaza, la contratada puede cancelar el paseo, en la forma de la Política de cancelación.",
          ],
        },
        {
          heading: "6. Objetos personales",
          paragraphs: [
            "Cada participante es responsable de sus pertenencias. La contratada no responde por pérdida, hurto, robo, rotura, mojadura o daño a celular, cámara, dron, documento, dinero, joya, equipo electrónico o cualquier objeto personal.",
          ],
        },
        {
          heading: "7. Fauna y flora",
          paragraphs: [
            "Está prohibido alimentar, capturar, perseguir, tocar o provocar un animal silvestre, y retirar planta, piedra o cualquier elemento del ambiente natural. El contratante cumple la legislación ambiental y las normas de las unidades de conservación visitadas.",
          ],
        },
        {
          heading: "8. Emergencias",
          paragraphs: [
            "En un accidente o un mal súbito, el guía presta los primeros auxilios compatibles con su entrenamiento y llama al servicio público de emergencia cuando es necesario. El contratante reconoce que el tiempo de respuesta en un área natural puede ser mayor que en la ciudad.",
          ],
        },
        {
          heading: "9. Decisiones del guía",
          paragraphs: [
            "Para preservar la seguridad del grupo, el guía puede alterar el recorrido, los horarios y el orden de visita, cancelar o sustituir un atractivo, reducir el tiempo de permanencia, interrumpir una actividad, volver antes o terminar el paseo. El participante cumple esas decisiones en el momento.",
            "Esas medidas son preventivas. El efecto sobre el precio y sobre la cancelación está en la Política de cancelación.",
          ],
        },
        {
          heading: "10. Conocimiento",
          paragraphs: [
            "Al contratar, el contratante declara que leyó esta Política, comprende los riesgos del ecoturismo y autoriza al guía a adoptar las medidas necesarias para la seguridad del grupo.",
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
    if (type === "guide") return ui.policyGuide;
    return "";
  }

  global.GcvExcCartPolicies = {
    uiStrings: uiStrings,
    docTitle: docTitle,
    renderPolicyHtml: renderPolicyHtml,
    policyLinkLabel: policyLinkLabel,
  };
})(typeof window !== "undefined" ? window : globalThis);
