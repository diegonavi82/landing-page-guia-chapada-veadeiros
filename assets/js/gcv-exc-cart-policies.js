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
          heading: "1. Aceite da Contratação",
          paragraphs: [
            "Ao concluir a compra, o CONTRATANTE declara ter lido, compreendido e aceitado integralmente esta Política de Cancelamento e os Termos de Prestação de Serviços da Guia Chapada Veadeiros.",
            "O CONTRATANTE contrata um passeio por data, prestado pela Guia Chapada Veadeiros. Não contrata um guia específico: no Privativo e na Excursão, com transporte ou sem transporte, entra o primeiro guia da fila que aceitar pelo link. A data que já tiver um passeio no carrinho fica bloqueada para outro passeio.",
            "No cartão de crédito o cartão fica apenas salvo. A operadora confirma que o cartão existe e aceita cobrança futura. Não há sinal e o limite não fica reservado antes da saída. O CONTRATANTE autoriza a cobrança automática de 100% somente quando o passeio confirmar.",
            "A confirmação da Excursão exige quórum fechado e o aceite de todos os guias necessários. A do Privativo exige o aceite do guia e, se houver translado, o veículo. Com translado, cada carro leva até 4 clientes e 1 guia. Na Excursão o cartão de todos os inscritos necessários ao quórum é testado no mesmo momento: enquanto um não passar, ninguém é cobrado.",
          ],
        },
        {
          heading: "2. Passeios em formação",
          paragraphs: [
            "A compra na modalidade Excursão abre uma saída em formação naquele dia, naquela cidade e naquele translado. Outras pessoas podem entrar nessa mesma saída enquanto ela estiver em formação. O quórum é 4, salvo quando o passeio tiver outro número configurado. A saída permanece em formação enquanto faltar quórum, guia ou, no passeio com translado, veículo.",
            "No cartão, nada é cobrado durante a formação. Enquanto nenhum guia foi chamado, o CONTRATANTE pode cancelar a qualquer momento. Não há cobrança nem estorno, porque o passeio ainda não foi cobrado.",
            "No Pix já pago, o cancelamento durante a formação devolve 100% do valor daquele passeio. Em uma reserva com mais de um dia, o CONTRATANTE cancela só os passeios que ainda estão em formação. O dia já confirmado permanece e não é estornado.",
            "Quando o quórum é atingido, a vaga é oferecida aos guias e o aviso passa a ser \"Aguardando confirmação do guia\". Enquanto essa chamada corre, o cancelamento pelo CONTRATANTE não é oferecido. O primeiro guia que aceitar pelo link entra. Com translado, cada carro exige o próprio guia: enquanto faltar um, o aviso continua e ninguém é cobrado.",
            "Se nenhum guia aceitar, o passeio é cancelado porque não há guias disponíveis. O CONTRATANTE é avisado por WhatsApp e por e-mail. No Pix o valor é estornado. No cartão nada é cobrado.",
            "A CONTRATADA pode encerrar a formação a qualquer momento por motivo operacional ou por inviabilidade da realização. No Pix o valor é estornado. No cartão nada é cobrado.",
          ],
        },
        {
          heading: "2.1 Troca se o grupo não fechar",
          paragraphs: [
            "Entre 48 horas e 12 horas antes da saída, se a Excursão ainda estiver em formação, o CONTRATANTE recebe as opções de passeio já confirmado no mesmo dia e na mesma cidade, desde que haja vaga para o grupo. A troca não vale para o Privativo e não vale para passeio já confirmado.",
            "Se o destino custar mais, a troca só se conclui com o pagamento da diferença no Pix. Se custar menos, a diferença é devolvida. No mesmo valor, a reserva muda de passeio sem cobrança nem estorno.",
            "Se não houver passeio confirmado nesse dia e nessa cidade, a única alternativa é o cancelamento com devolução de 100%.",
            "Se o CONTRATANTE não trocar nem cancelar e a saída continuar em formação, a devolução integral do Pix é automática 12 horas antes do início. No cartão, se ainda faltar quórum ou guia 24 horas antes do início, a reserva é cancelada e nada é cobrado.",
          ],
        },
        {
          heading: "3. Passeios confirmados",
          paragraphs: [
            "A Excursão fica confirmada para cobrança quando o quórum está fechado e todos os guias necessários aceitaram. Quórum sem guia não cobra o cartão. A partir da cobrança o CONTRATANTE não cancela e não há devolução.",
            "Antes de cobrar, a CONTRATADA testa o valor no cartão de todos os inscritos necessários ao quórum. A cobrança de 100% só ocorre se todos passarem. Quem já tem cartão válido não é cobrado sozinho. Se um cartão não passar, ninguém é cobrado, a saída fica em espera e quem teve a recusa é avisado para trocar o cartão. Não há prazo fixo. A CONTRATADA não confirma o passeio retirando esse inscrito se, sem ele, o quórum deixar de ser atingido.",
            "Nessa espera, quem ainda não foi cobrado pode cancelar. Se alguém cancelar, a saída volta a Em Formação. Os inscritos recebem o aviso de que o passeio voltou à formação por um cancelamento de última hora. O guia que já tinha aceito deixa de estar associado, permanece no final da fila e é notificado por WhatsApp e por e-mail. Nada foi cobrado.",
            "Quando todos os cartões passam no mesmo teste, a cobrança de 100% ocorre em cada cartão salvo. A vaga fica definitiva e a agenda do guia fica bloqueada.",
            "Depois da confirmação não há restituição por desistência, alteração de planos, atraso, não comparecimento, perda de transporte, doença, motivo pessoal ou profissional, ou qualquer outro impedimento que não seja da CONTRATADA. Quem não comparece continua cobrado pelo valor integral. A parte da plataforma continua sendo descontada e o guia recebe o pagamento daquela vaga. A ausência não entra na contagem de guiagem.",
          ],
        },
        {
          heading: "3.1 Privativo",
          paragraphs: [
            "O Privativo é exclusivo para o grupo do CONTRATANTE. Não é uma excursão compartilhada, não depende de outras inscrições e não entra na troca da cláusula 2.1.",
            "No Privativo o cartão fica apenas salvo, sem sinal, até um guia aceitar. Com translado, a confirmação também exige o veículo: um carro e um guia a cada grupo de até 4 clientes. Sem translado, o veículo é o do CONTRATANTE e a confirmação ocorre quando o guia aceita.",
            "A venda é enviada à fila de guias. O CONTRATANTE não escolhe o guia: entra quem aceitar primeiro pelo link. Enquanto a chamada corre, o cancelamento pelo CONTRATANTE não é oferecido e o cartão não é cobrado.",
            "Quando o guia aceita e, no translado, o veículo está garantido, a CONTRATADA testa o cartão salvo. Se passar, o passeio fica associado a esse guia e o cartão é cobrado em 100%. A partir daí não há cancelamento nem devolução. Se o cartão for recusado, nada é cobrado e o CONTRATANTE é avisado para trocá-lo, sem prazo fixo. Quando o novo cartão passar, a cobrança de 100% ocorre automaticamente.",
          ],
        },
        {
          heading: "3.2 Check-in e contato do guia",
          paragraphs: [
            "Quando o passeio está confirmado e o cancelamento pelo CONTRATANTE já não é possível, a CONTRATADA envia a identificação do guia: foto, nome e WhatsApp.",
            "No dia do passeio, o guia confirma o check-in pela leitura do QR. A confirmação é imediata. O CONTRATANTE recebe a mensagem de boas-vindas com a foto, o nome e o WhatsApp do guia, e o link para avaliar o passeio ao final.",
          ],
        },
        {
          heading: "4. Cancelamento pela CONTRATADA",
          paragraphs: [
            "O cancelamento do passeio confirmado é feito apenas por um administrador da plataforma. O CONTRATANTE não cancela o passeio confirmado. O guia não cancela o passeio: se ele se retira, a vaga volta à fila, na forma da cláusula 4.1.",
            "A CONTRATADA pode cancelar o passeio, inclusive depois da confirmação, por problema de saúde ou impedimento grave do guia, força maior, caso fortuito, inviabilidade da realização ou risco à segurança dos participantes. Entram nessa cláusula condições climáticas severas, interdição do atrativo, determinação de autoridade competente e falta de veículo para realizar o Privativo.",
            "Nessas hipóteses o CONTRATANTE recebe o estorno integral do que foi pago. No cartão, se a cobrança ainda não ocorreu, nada é cobrado. Nenhum guia recebe por esse passeio. O guia é avisado do cancelamento por WhatsApp e por e-mail. Passeio sem guia disponível segue a mesma regra, com o motivo de que não há guias disponíveis.",
          ],
        },
        {
          heading: "4.1 Substituição do guia",
          paragraphs: [
            "O CONTRATANTE não escolhe outro guia depois que um guia confirmou. O guia só se retira por problema de saúde, impedimento grave ou força maior. Quando ele aceita, a agenda daquele dia bloqueia. Se o passeio for cancelado, a agenda abre de novo.",
            "Na troca, o cliente é avisado na hora, por WhatsApp e por e-mail, com os dados do novo guia: nome, telefone, e-mail, foto, nota e descrição, sem o motivo da saída. A troca não cancela, não devolve e não reduz o preço.",
            "Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado porque não há guias disponíveis. No Pix o CONTRATANTE recebe o estorno. No cartão, a cobrança que já tiver ocorrido é estornada; se o guia ainda não tinha aceitado, nada foi cobrado. Nenhum guia recebe por esse passeio.",
          ],
        },
        {
          heading: "4.2 Vaga do guia sem translado",
          paragraphs: [
            "Sem translado, o CONTRATANTE contrata apenas o guia. O deslocamento é no veículo do próprio grupo. O carro de passeio tem 5 lugares: um é do guia e cabem no máximo 4 clientes. Com 5 ou mais pessoas, o grupo leva os carros necessários para que cada carro tenha no máximo 4 clientes e lugar para o guia.",
            "Se na saída não houver vaga para o guia, a CONTRATADA pode cancelar o passeio por inviabilidade operacional. O CONTRATANTE recebe o reembolso integral do que foi pago.",
          ],
        },
        {
          heading: "4.3 Carros e guias com translado",
          paragraphs: [
            "Com translado, o CONTRATANTE contrata o passeio com o guia e o transporte a partir da cidade de hospedagem. O carro é do guia. Não há fila: todos os guias com veículo cadastrado no perfil, com modelo e ano, recebem a proposta ao mesmo tempo. O primeiro que aceitar fica com a vaga, e os demais são avisados de que ela não está mais disponível. Cada carro leva até 4 clientes e 1 guia. A conta é uma vaga de guia e um carro para cada grupo de até 4 clientes: 5 clientes exigem 2 carros e 2 guias. O preço do Privativo com translado acompanha o número de carros.",
          ],
        },
        {
          heading: "4.4 Guia em outro idioma",
          paragraphs: [
            "Guia em português não tem acréscimo. Se o CONTRATANTE escolher outro idioma, entra o acréscimo em reais definido na tarifa daquele passeio, uma vez sobre o total da compra, depois dos descontos de idade, e não por pessoa. O valor é o mesmo para qualquer compra e não muda conforme a cidade de saída. O desconto do Pix não entra nessa conta.",
          ],
        },
        {
          heading: "5. Condições climáticas",
          paragraphs: [
            "Os passeios são realizados em ambiente natural e estão sujeitos às condições climáticas típicas da Chapada dos Veadeiros.",
            "O CONTRATANTE declara estar ciente de que chuva, garoa, tempo nublado, alterações de temperatura, aumento da vazão dos rios, lama nas trilhas e demais fenômenos naturais fazem parte da atividade de ecoturismo e não constituem motivo para cancelamento ou reembolso.",
          ],
        },
        {
          heading: "5.1 Cancelamento antes da saída",
          paragraphs: [
            "O cancelamento por mau tempo somente pode ocorrer antes da saída da cidade de embarque, por decisão do administrador, quando houver risco à segurança dos participantes ou inviabilidade técnica da atividade. Aplica-se o estorno integral da cláusula 4. Depois da saída da cidade de embarque, a prestação do serviço está iniciada e o passeio não se cancela por mudança do tempo no caminho ou durante a atividade.",
          ],
        },
        {
          heading: "5.2 Adiamento e alterações durante o passeio",
          paragraphs: [
            "Sempre que houver previsão de melhora das condições climáticas, a CONTRATADA pode adiar o horário de saída em até 2 horas, sem que isso caracterize cancelamento ou gere reembolso. Persistindo condições inseguras, a CONTRATADA pode cancelar o passeio, aplicando-se a cláusula 4.",
            "Para preservar a segurança, a CONTRATADA pode alterar o roteiro, a ordem de visitação, cancelar ou substituir um atrativo, reduzir o tempo de permanência, interromper uma atividade ou encerrar o passeio antes do horário, retornando à cidade de embarque. Essas medidas são preventivas e não caracterizam cancelamento, falha na prestação do serviço ou descumprimento contratual, nem geram reembolso, abatimento ou indenização.",
          ],
        },
        {
          heading: "6. Legislação aplicável",
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
            "Sem translado, toda venda confirmada de passeio exclusivo ou de excursão é enviada aos 3 primeiros da fila, o TOP 3. Na excursão, isso ocorre quando o quórum é atingido. Com translado, não há fila nem prioridade: todos os guias com veículo cadastrado recebem a proposta ao mesmo tempo e o primeiro que aceitar fica com a vaga.",
            "Diego Navi Marques Carvalho é o guia especial e não entra na fila. Enquanto essa prioridade estiver ativa, toda venda confirmada sem translado chega primeiro para ele, por 24 horas, para aceitar ou recusar. Com translado, ele só recebe a proposta se tiver veículo cadastrado, junto com os outros guias. Na prioridade sem translado, a saída entra na agenda dele durante as 24 horas. Se ele recusar, não responder, já estiver ocupado nesse dia, ou se essa prioridade estiver desligada, a venda segue para o TOP 3. Santa Bárbara, Capivara, Candaru e Guardião não passam por ele: vão para a fila Kalunga.",
            "O envio da oportunidade é pelo WhatsApp. O GUIA e o cliente também recebem o aviso por e-mail. A mensagem traz os dados da excursão ou do passeio exclusivo, o pagamento que aquele GUIA recebe, o número de pessoas, se é com o veículo do GUIA, e os dados do comprador: nome, telefone e e-mail.",
            "O aceite é o clique no link enviado no WhatsApp. O mesmo link segue no e-mail. O tempo para aceitar é de 4 horas e 20 minutos. O primeiro clique válido ocupa a vaga e o link expira. Quem mais recebeu a oportunidade é avisado, por WhatsApp e por e-mail, de que ela foi aceita por outro guia.",
            "Se nenhum dos 3 aceitar nas 2 horas, todos os outros guias da lista são notificados ao mesmo tempo, com o mesmo prazo de 4 horas e 20 minutos. O primeiro que aceitar entra e o link expira.",
            "Se faltarem menos de 24 horas para o início, todos os guias são notificados ao mesmo tempo e aquele que aceitar primeiro entra.",
            "O passeio só fica associado ao GUIA, e o cartão do cliente só é cobrado, quando o GUIA aceita. Com transporte, a confirmação também exige o veículo. Se ninguém aceitar, o passeio é cancelado porque não há guias disponíveis. No Pix o cliente é estornado. No cartão, nada é cobrado.",
          ],
        },
        {
          heading: "4. Mais de um guia e troca",
          paragraphs: [
            "No passeio com transporte, cada carro exige um GUIA. Cinco clientes exigem 2 guias. Todos os guias com veículo recebem a proposta ao mesmo tempo. O primeiro aceite ocupa uma vaga. Se ainda faltar outro carro, a proposta continua aberta para os demais até todas as vagas serem preenchidas. Quando a última vaga fecha, os outros são avisados de que a proposta não está mais disponível. Quem já aceitou permanece.",
            "Enquanto faltar guia, os inscritos veem \"Aguardando confirmação do guia\" e não podem cancelar. No cartão, nada é cobrado nessa espera.",
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
            "Na Excursão, a confirmação ainda exige quórum e que o cartão de todos os inscritos necessários ao quórum passe no mesmo teste. Enquanto um cartão não passar, ninguém é cobrado.",
          ],
        },
        {
          heading: "6. Espera de pagamento",
          paragraphs: [
            'Se o quórum de pessoas já foi atingido e ainda falta pagamento, a saída fica em espera. O aviso aos inscritos é: "Aguardando X pagamento(s) para confirmar a saída, o quórum já foi atingido".',
            'Se um inscrito cancelar nessa espera, a saída volta a "Em Formação". Os inscritos recebem o aviso: "Passeio voltando ao status de formação devido a um cancelamento de última hora".',
            "O GUIA que já tinha aceito deixa de estar associado, permanece no final da fila e é notificado por WhatsApp e por e-mail. Nada foi cobrado.",
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
            "O GUIA só se retira por problema de saúde, impedimento grave ou força maior. Ele vai para o final da fila. A vaga volta a ser oferecida pela regra da oportunidade. O cliente só é notificado na hora da troca, por WhatsApp e por e-mail, com os dados do novo guia.",
            "Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado porque não há guias disponíveis. No Pix o cliente recebe o estorno. No cartão, a cobrança só existe se um guia já tinha aceitado. O GUIA é avisado por WhatsApp e por e-mail. Nenhum GUIA recebe por esse passeio.",
            "No cancelamento por mau tempo, o cliente recebe o estorno, nenhum GUIA recebe, e o GUIA do passeio é notificado por WhatsApp e por e-mail.",
          ],
        },
        {
          heading: "9. Idioma",
          paragraphs: [
            "Guia em português não gera acréscimo para o cliente.",
            "Se o cliente escolhe outro idioma, o acréscimo daquele passeio — percentual ou valor fixo, na cópia da tarifa do atrativo e da cidade — incide uma vez sobre o total da compra, depois dos descontos de idade. Não incide por pessoa.",
            "A oportunidade usa a fila dos guias desse idioma, na ordem do ranking. O guia especial recebe essa venda antes da fila, como qualquer outra, por 24 horas, se o dia dele estiver livre.",
          ],
        },
      ],
    },
    en: {
      cancel: [
        {
          heading: "1. Acceptance of the booking",
          paragraphs: [
            "By completing the purchase, the Client states that they have read, understood and fully accepted this Cancellation Policy and the Terms of Service of Guia Chapada Veadeiros.",
            "The Client books a tour for a date, provided by Guia Chapada Veadeiros. The Client does not hire a specific guide: on a private tour and on a shared tour, with or without transport, the first guide in the queue who accepts through the link is assigned. A date that already has a tour in the cart is blocked for another tour.",
            "On a credit card, the card is only saved. The card network confirms that the card exists and can be charged later. There is no deposit, and the limit is not held before departure. The Client authorizes the automatic charge of 100% only when the tour is confirmed.",
            "A shared tour is confirmed only when the minimum group is closed and every required guide has accepted. A private tour is confirmed when the guide accepts and, if there is transport, when the vehicle is secured. With transport, each car takes up to 4 guests and 1 guide. On a shared tour, the card of every guest needed for the minimum group is tested at the same time: while one card fails, nobody is charged.",
          ],
        },
        {
          heading: "2. Tours still forming",
          paragraphs: [
            "A shared-tour purchase opens a departure that is still forming, on that day, in that city and with that transport choice. Other people may join the same departure while it is forming. The minimum group is 4, unless the tour is set to another number. The departure stays forming while it still needs guests, a guide or, with transport, a vehicle.",
            "On a card, nothing is charged while the tour is forming. Until a guide has been called, the Client may cancel at any time. There is no charge and no refund, because the tour has not been charged.",
            "On Pix already paid, cancellation while the tour is forming returns 100% of that tour. On a booking with more than one day, the Client cancels only the tours that are still forming. A day that is already confirmed stays in place and is not refunded.",
            "When the minimum group is reached, the seat is offered to the guides and the notice becomes \"Waiting for the guide to confirm\". While that call is open, the Client is not offered cancellation. The first guide who accepts through the link is assigned. With transport, each car needs its own guide: while one is missing, the notice stays and nobody is charged.",
            "If no guide accepts, the tour is cancelled because no guides are available. The Client is told by WhatsApp and by email. On Pix the amount is refunded. On a card nothing is charged.",
            "The Company may close a forming departure at any time for an operational reason or because the tour cannot be run. On Pix the amount is refunded. On a card nothing is charged.",
          ],
        },
        {
          heading: "2.1 Switch if the group does not fill",
          paragraphs: [
            "Between 48 hours and 12 hours before departure, if the shared tour is still forming, the Client receives confirmed tours on the same day and in the same city, as long as there is room for the group. The switch does not apply to a private tour or to a tour that is already confirmed.",
            "If the new tour costs more, the switch is completed only when the difference is paid by Pix. If it costs less, the difference is refunded. If the price is the same, the booking moves with no charge and no refund.",
            "If there is no confirmed tour on that day and in that city, the only option is cancellation with a 100% refund.",
            "If the Client neither switches nor cancels, and the departure is still forming, the full Pix refund is automatic 12 hours before the start. On a card, if the minimum group or a guide is still missing 24 hours before the start, the booking is cancelled and nothing is charged.",
          ],
        },
        {
          heading: "3. Confirmed tours",
          paragraphs: [
            "A shared tour is confirmed for charging when the minimum group is closed and every required guide has accepted. A full group without a guide does not charge the card. From the charge on, the Client cannot cancel and there is no refund.",
            "Before charging, the Company tests the amount on the card of every guest needed for the minimum group. The 100% charge happens only if every card passes. A guest whose card is already valid is not charged alone. If one card fails, nobody is charged, the departure waits, and the guest whose card was declined is asked to replace it. There is no fixed deadline. The Company does not confirm the tour by removing that guest if, without them, the minimum group would no longer be met.",
            "During that wait, a guest who has not been charged may cancel. If someone cancels, the departure returns to forming. The guests are told that the tour went back to forming because of a last-minute cancellation. The guide who had already accepted is unassigned, stays at the end of the queue and is notified by WhatsApp and by email. Nothing was charged.",
            "When every card passes the same test, 100% is charged on each saved card. The seat becomes final and the guide's day is blocked.",
            "After confirmation there is no refund for a change of mind, a change of plans, delay, no-show, a missed transfer, illness, a personal or professional reason, or any other obstacle that is not the Company's. A guest who does not show up remains charged for the full amount. The platform fee is still deducted and the guide is paid for that seat. The absence does not count as a guided tour.",
          ],
        },
        {
          heading: "3.1 Private tour",
          paragraphs: [
            "A private tour is exclusive to the Client's group. It is not a shared departure, it does not depend on other bookings, and it is not part of the switch in clause 2.1.",
            "On a private tour the card is only saved, with no deposit, until a guide accepts. With transport, confirmation also requires the vehicle: one car and one guide for every group of up to 4 guests. Without transport, the vehicle is the Client's, and confirmation happens when the guide accepts.",
            "The sale is sent to the guide queue. The Client does not choose the guide: the first guide who accepts through the link is assigned. While that call is open, the Client is not offered cancellation and the card is not charged.",
            "When the guide accepts and, with transport, the vehicle is secured, the Company tests the saved card. If it passes, the tour is assigned to that guide and the card is charged 100%. From then on there is no cancellation and no refund. If the card is declined, nothing is charged and the Client is asked to replace it, with no fixed deadline. When the new card passes, the 100% charge happens automatically.",
          ],
        },
        {
          heading: "3.2 Check-in and guide contact",
          paragraphs: [
            "When the tour is confirmed and the Client can no longer cancel, the Company sends the guide's identification: photo, name and WhatsApp.",
            "On the day of the tour, the guide confirms check-in by reading the QR code. Confirmation is immediate. The Client receives the welcome message with the guide's photo, name and WhatsApp, and the link to review the tour at the end.",
          ],
        },
        {
          heading: "4. Cancellation by the Company",
          paragraphs: [
            "A confirmed tour is cancelled only by a platform administrator. The Client does not cancel a confirmed tour. The guide does not cancel the tour: if the guide withdraws, the seat returns to the queue under clause 4.1.",
            "The Company may cancel the tour, including after confirmation, because of the guide's health or a serious impediment, force majeure, an unforeseeable event, because the tour cannot be run, or because of a risk to the participants' safety. This clause covers severe weather, closure of the attraction, an order from a competent authority, and the lack of a vehicle for a private tour.",
            "In these cases the Client receives a full refund of what was paid. On a card, if the charge has not happened yet, nothing is charged. No guide is paid for that tour. The guide is told of the cancellation by WhatsApp and by email. A tour with no guide available follows the same rule, with the reason that no guides are available.",
          ],
        },
        {
          heading: "4.1 Guide replacement",
          paragraphs: [
            "The Client does not choose another guide after one guide has confirmed. The guide withdraws only for health, a serious impediment or force majeure. When the guide accepts, that day is blocked on the guide's calendar. If the tour is cancelled, the day opens again.",
            "On a replacement, the Client is told at that moment, by WhatsApp and by email, with the new guide's details: name, phone, email, photo, rating and description, without the reason for the change. The replacement does not cancel the tour, does not refund it and does not reduce the price.",
            "If 2 hours remain before the tour and there is still no substitute, the tour is cancelled because no guides are available. On Pix the Client receives the refund. On a card, a charge that already happened is refunded; if the guide had not accepted yet, nothing was charged. No guide is paid for that tour.",
          ],
        },
        {
          heading: "4.2 Guide seat without transport",
          paragraphs: [
            "Without transport, the Client hires only the guide. Travel is in the group's own vehicle. A touring car has 5 seats: one is the guide's and at most 4 guests fit. With 5 or more people, the group brings the cars needed so that each car has at most 4 guests and a seat for the guide.",
            "If at departure there is no seat for the guide, the Company may cancel the tour because it cannot be operated. The Client receives a full refund of what was paid.",
          ],
        },
        {
          heading: "4.3 Cars and guides with transport",
          paragraphs: [
            "With transport, the Client books the tour with the guide and the transfer from the city where the group is staying. The car is the guide's. There is no queue: every guide with a vehicle on the profile, including model and year, receives the offer at the same time. The first to accept gets the seat, and the others are told it is no longer available. Each car takes up to 4 guests and 1 guide. The count is one guide seat and one car for every group of up to 4 guests: 5 guests require 2 cars and 2 guides. The price of a private tour with transport follows the number of cars.",
          ],
        },
        {
          heading: "4.4 Guide in another language",
          paragraphs: [
            "A guide in Portuguese has no surcharge. If the Client chooses another language, the surcharge in reais set on that tour's rate is added once to the booking total, after age discounts, and not per person. The amount is the same for any booking and does not change with the departure city. The Pix discount is not part of this calculation.",
          ],
        },
        {
          heading: "5. Weather",
          paragraphs: [
            "Tours take place outdoors and are subject to the weather typical of Chapada dos Veadeiros.",
            "The Client states that they understand that rain, drizzle, cloudy weather, temperature changes, higher river flow, mud on the trails and other natural conditions are part of ecotourism and are not a reason for cancellation or a refund.",
          ],
        },
        {
          heading: "5.1 Cancellation before departure",
          paragraphs: [
            "Cancellation for bad weather may happen only before the group leaves the departure city, by an administrator's decision, when there is a risk to the participants' safety or the activity cannot be carried out. The full refund in clause 4 applies. After the group leaves the departure city, the service has started and the tour is not cancelled because the weather changes on the way or during the activity.",
          ],
        },
        {
          heading: "5.2 Delay and changes during the tour",
          paragraphs: [
            "Whenever the weather is expected to improve, the Company may delay departure by up to 2 hours. That delay is not a cancellation and does not create a refund. If conditions remain unsafe, the Company may cancel the tour under clause 4.",
            "To protect safety, the Company may change the route, change the order of visits, cancel or replace an attraction, shorten a stop, interrupt an activity or end the tour early and return to the departure city. These measures are preventive. They are not a cancellation, a failure of the service or a breach of contract, and they do not create a refund, a price reduction or compensation.",
          ],
        },
        {
          heading: "6. Applicable law",
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
          heading: "1. Aceptación de la contratación",
          paragraphs: [
            "Al concluir la compra, el contratante declara haber leído, comprendido y aceptado íntegramente esta Política de cancelación y los Términos de prestación de servicios de Guia Chapada Veadeiros.",
            "El contratante contrata un paseo por fecha, prestado por Guia Chapada Veadeiros. No contrata un guía específico: en el paseo privado y en la excursión, con transporte o sin transporte, entra el primer guía de la fila que acepte por el enlace. La fecha que ya tenga un paseo en el carrito queda bloqueada para otro paseo.",
            "En la tarjeta de crédito la tarjeta solo queda guardada. La operadora confirma que la tarjeta existe y acepta un cobro futuro. No hay seña y el límite no queda reservado antes de la salida. El contratante autoriza el cobro automático del 100% solo cuando el paseo se confirme.",
            "La confirmación de la excursión exige el quórum cerrado y la aceptación de todos los guías necesarios. La del paseo privado exige la aceptación del guía y, si hay traslado, el vehículo. Con traslado, cada auto lleva hasta 4 clientes y 1 guía. En la excursión la tarjeta de todos los inscritos necesarios para el quórum se prueba en el mismo momento: mientras una no pase, nadie es cobrado.",
          ],
        },
        {
          heading: "2. Paseos en formación",
          paragraphs: [
            "La compra en la modalidad excursión abre una salida en formación ese día, en esa ciudad y con ese traslado. Otras personas pueden entrar en la misma salida mientras esté en formación. El quórum es 4, salvo cuando el paseo tenga otro número configurado. La salida permanece en formación mientras falte quórum, guía o, en el paseo con traslado, vehículo.",
            "En la tarjeta, nada se cobra durante la formación. Mientras ningún guía haya sido llamado, el contratante puede cancelar en cualquier momento. No hay cobro ni reembolso, porque el paseo todavía no fue cobrado.",
            "En el Pix ya pagado, la cancelación durante la formación devuelve el 100% del valor de ese paseo. En una reserva con más de un día, el contratante cancela solo los paseos que todavía están en formación. El día ya confirmado permanece y no se reembolsa.",
            "Cuando se alcanza el quórum, la plaza se ofrece a los guías y el aviso pasa a ser \"Esperando la confirmación del guía\". Mientras esa convocatoria está en curso, no se ofrece la cancelación al contratante. Entra el primer guía que acepte por el enlace. Con traslado, cada auto exige su propio guía: mientras falte uno, el aviso continúa y nadie es cobrado.",
            "Si ningún guía acepta, el paseo se cancela porque no hay guías disponibles. El contratante es avisado por WhatsApp y por correo electrónico. En el Pix el valor se reembolsa. En la tarjeta nada se cobra.",
            "La contratada puede cerrar la formación en cualquier momento por un motivo operativo o porque el paseo no puede realizarse. En el Pix el valor se reembolsa. En la tarjeta nada se cobra.",
          ],
        },
        {
          heading: "2.1 Cambio si el grupo no se completa",
          paragraphs: [
            "Entre 48 horas y 12 horas antes de la salida, si la excursión todavía está en formación, el contratante recibe las opciones de paseo ya confirmado el mismo día y en la misma ciudad, siempre que haya plaza para el grupo. El cambio no vale para el paseo privado ni para un paseo ya confirmado.",
            "Si el destino cuesta más, el cambio solo se concluye con el pago de la diferencia por Pix. Si cuesta menos, la diferencia se devuelve. Con el mismo valor, la reserva cambia de paseo sin cobro ni reembolso.",
            "Si no hay un paseo confirmado ese día y en esa ciudad, la única alternativa es la cancelación con devolución del 100%.",
            "Si el contratante no cambia ni cancela y la salida sigue en formación, la devolución integral del Pix es automática 12 horas antes del inicio. En la tarjeta, si todavía falta quórum o guía 24 horas antes del inicio, la reserva se cancela y nada se cobra.",
          ],
        },
        {
          heading: "3. Paseos confirmados",
          paragraphs: [
            "La excursión queda confirmada para el cobro cuando el quórum está cerrado y todos los guías necesarios aceptaron. Quórum sin guía no cobra la tarjeta. A partir del cobro el contratante no cancela y no hay devolución.",
            "Antes de cobrar, la contratada prueba el valor en la tarjeta de todos los inscritos necesarios para el quórum. El cobro del 100% solo ocurre si todas pasan. Quien ya tiene una tarjeta válida no es cobrado solo. Si una tarjeta no pasa, nadie es cobrado, la salida queda en espera y a quien tuvo el rechazo se le pide cambiar la tarjeta. No hay un plazo fijo. La contratada no confirma el paseo quitando a ese inscrito si, sin él, el quórum deja de alcanzarse.",
            "En esa espera, quien todavía no fue cobrado puede cancelar. Si alguien cancela, la salida vuelve a En formación. Los inscritos reciben el aviso de que el paseo volvió a formación por una cancelación de último momento. El guía que ya había aceptado deja de estar asociado, permanece al final de la fila y es notificado por WhatsApp y por correo electrónico. Nada fue cobrado.",
            "Cuando todas las tarjetas pasan la misma prueba, el cobro del 100% ocurre en cada tarjeta guardada. La plaza queda definitiva y la agenda del guía queda bloqueada.",
            "Después de la confirmación no hay restitución por desistimiento, cambio de planes, retraso, inasistencia, pérdida del transporte, enfermedad, motivo personal o profesional, o cualquier otro impedimento que no sea de la contratada. Quien no se presenta sigue cobrado por el valor integral. La parte de la plataforma sigue descontándose y el guía recibe el pago de esa plaza. La ausencia no entra en el conteo de guiado.",
          ],
        },
        {
          heading: "3.1 Paseo privado",
          paragraphs: [
            "El paseo privado es exclusivo para el grupo del contratante. No es una excursión compartida, no depende de otras inscripciones y no entra en el cambio de la cláusula 2.1.",
            "En el privado la tarjeta solo queda guardada, sin seña, hasta que un guía acepte. Con traslado, la confirmación también exige el vehículo: un auto y un guía por cada grupo de hasta 4 clientes. Sin traslado, el vehículo es del contratante y la confirmación ocurre cuando el guía acepta.",
            "La venta se envía a la fila de guías. El contratante no elige al guía: entra quien acepte primero por el enlace. Mientras la convocatoria está en curso, no se ofrece la cancelación al contratante y la tarjeta no se cobra.",
            "Cuando el guía acepta y, en el traslado, el vehículo está asegurado, la contratada prueba la tarjeta guardada. Si pasa, el paseo queda asociado a ese guía y la tarjeta se cobra al 100%. A partir de ahí no hay cancelación ni devolución. Si la tarjeta es rechazada, nada se cobra y se avisa al contratante para que la cambie, sin plazo fijo. Cuando la nueva tarjeta pasa, el cobro del 100% ocurre automáticamente.",
          ],
        },
        {
          heading: "3.2 Check-in y contacto del guía",
          paragraphs: [
            "Cuando el paseo está confirmado y el contratante ya no puede cancelar, la contratada envía la identificación del guía: foto, nombre y WhatsApp.",
            "El día del paseo, el guía confirma el check-in con la lectura del QR. La confirmación es inmediata. El contratante recibe el mensaje de bienvenida con la foto, el nombre y el WhatsApp del guía, y el enlace para evaluar el paseo al final.",
          ],
        },
        {
          heading: "4. Cancelación por la contratada",
          paragraphs: [
            "La cancelación del paseo confirmado la hace solo un administrador de la plataforma. El contratante no cancela el paseo confirmado. El guía no cancela el paseo: si se retira, la plaza vuelve a la fila, en la forma de la cláusula 4.1.",
            "La contratada puede cancelar el paseo, incluso después de la confirmación, por un problema de salud o un impedimento grave del guía, fuerza mayor, caso fortuito, inviabilidad de la realización o riesgo para la seguridad de los participantes. Entran en esta cláusula las condiciones climáticas severas, la interdicción del atractivo, la determinación de una autoridad competente y la falta de vehículo para realizar el paseo privado.",
            "En esas hipótesis el contratante recibe el reembolso integral de lo que fue pagado. En la tarjeta, si el cobro todavía no ocurrió, nada se cobra. Ningún guía recibe por ese paseo. El guía es avisado de la cancelación por WhatsApp y por correo electrónico. Un paseo sin guía disponible sigue la misma regla, con el motivo de que no hay guías disponibles.",
          ],
        },
        {
          heading: "4.1 Sustitución del guía",
          paragraphs: [
            "El contratante no elige otro guía después de que un guía confirmó. El guía solo se retira por un problema de salud, un impedimento grave o fuerza mayor. Cuando acepta, la agenda de ese día se bloquea. Si el paseo se cancela, la agenda se abre de nuevo.",
            "En el cambio, el cliente es avisado en el momento, por WhatsApp y por correo electrónico, con los datos del nuevo guía: nombre, teléfono, correo, foto, nota y descripción, sin el motivo de la salida. El cambio no cancela, no devuelve y no reduce el precio.",
            "Si faltan 2 horas para el paseo y todavía no hay sustituto, el paseo se cancela porque no hay guías disponibles. En el Pix el contratante recibe el reembolso. En la tarjeta, el cobro que ya haya ocurrido se reembolsa; si el guía todavía no había aceptado, nada fue cobrado. Ningún guía recibe por ese paseo.",
          ],
        },
        {
          heading: "4.2 Plaza del guía sin traslado",
          paragraphs: [
            "Sin traslado, el contratante contrata solo al guía. El desplazamiento es en el vehículo del propio grupo. El auto de paseo tiene 5 lugares: uno es del guía y caben como máximo 4 clientes. Con 5 o más personas, el grupo lleva los autos necesarios para que cada auto tenga como máximo 4 clientes y lugar para el guía.",
            "Si en la salida no hay plaza para el guía, la contratada puede cancelar el paseo por inviabilidad operativa. El contratante recibe el reembolso integral de lo que fue pagado.",
          ],
        },
        {
          heading: "4.3 Autos y guías con traslado",
          paragraphs: [
            "Con traslado, el contratante contrata el paseo con el guía y el transporte desde la ciudad de hospedaje. El auto es del guía. No hay fila: todos los guías con vehículo registrado en el perfil, con modelo y año, reciben la propuesta al mismo tiempo. El primero que acepta se queda con la plaza, y los demás son avisados de que ya no está disponible. Cada auto lleva hasta 4 clientes y 1 guía. La cuenta es una plaza de guía y un auto por cada grupo de hasta 4 clientes: 5 clientes exigen 2 autos y 2 guías. El precio del paseo privado con traslado acompaña el número de autos.",
          ],
        },
        {
          heading: "4.4 Guía en otro idioma",
          paragraphs: [
            "El guía en portugués no tiene recargo. Si el contratante elige otro idioma, entra el recargo en reales definido en la tarifa de ese paseo, una vez sobre el total de la compra, después de los descuentos de edad, y no por persona. El valor es el mismo para cualquier compra y no cambia según la ciudad de salida. El descuento del Pix no entra en esa cuenta.",
          ],
        },
        {
          heading: "5. Condiciones climáticas",
          paragraphs: [
            "Los paseos se realizan en un ambiente natural y están sujetos a las condiciones climáticas típicas de la Chapada dos Veadeiros.",
            "El contratante declara estar al tanto de que la lluvia, la llovizna, el tiempo nublado, los cambios de temperatura, el aumento del caudal de los ríos, el barro en los senderos y los demás fenómenos naturales forman parte de la actividad de ecoturismo y no constituyen motivo de cancelación o reembolso.",
          ],
        },
        {
          heading: "5.1 Cancelación antes de la salida",
          paragraphs: [
            "La cancelación por mal tiempo solo puede ocurrir antes de la salida de la ciudad de embarque, por decisión del administrador, cuando haya riesgo para la seguridad de los participantes o inviabilidad técnica de la actividad. Se aplica el reembolso integral de la cláusula 4. Después de la salida de la ciudad de embarque, la prestación del servicio está iniciada y el paseo no se cancela por un cambio del tiempo en el camino o durante la actividad.",
          ],
        },
        {
          heading: "5.2 Aplazamiento y cambios durante el paseo",
          paragraphs: [
            "Siempre que haya previsión de mejora de las condiciones climáticas, la contratada puede aplazar el horario de salida hasta 2 horas, sin que eso caracterice cancelación ni genere reembolso. Si persisten condiciones inseguras, la contratada puede cancelar el paseo, aplicándose la cláusula 4.",
            "Para preservar la seguridad, la contratada puede alterar el recorrido, el orden de visita, cancelar o sustituir un atractivo, reducir el tiempo de permanencia, interrumpir una actividad o terminar el paseo antes del horario, regresando a la ciudad de embarque. Esas medidas son preventivas y no caracterizan cancelación, falla en la prestación del servicio o incumplimiento contractual, ni generan reembolso, reducción o indemnización.",
          ],
        },
        {
          heading: "6. Legislación aplicable",
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
