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
            "O CONTRATANTE contrata um passeio por data. A data que já tiver um passeio no carrinho fica bloqueada para outro passeio.",
            "No cartão de crédito o cartão fica apenas salvo e é verificado nessa hora: a operadora confirma que o cartão existe e aceita cobrança futura. Não há sinal e não há cobrança do passeio nessa hora. Essa verificação não reserva o valor do passeio.",
            "O CONTRATANTE autoriza a cobrança automática de 100% somente na confirmação. A confirmação exige guia associado e, se houver translado, veículo. Na Excursão, a cobrança ainda exige que o cartão de todos os inscritos necessários ao quórum seja aceito no mesmo teste. Enquanto um desses cartões não passar, ninguém é cobrado.",
            "A contratação refere-se à prestação do serviço pela Guia Chapada Veadeiros. O CONTRATANTE não contrata um guia específico. No passeio exclusivo e na excursão, com transporte ou sem transporte, entra o primeiro guia do TOP 3 que aceitar pelo link.",
          ],
        },
        {
          heading: '2. Passeios "Em Formação"',
          paragraphs: [
            "A compra na modalidade Excursão abre uma saída em formação naquele dia, naquela cidade e naquele translado. Os inscritos iniciais são as pessoas dessa compra. Outras pessoas podem entrar nessa mesma saída enquanto ela estiver em formação. O quórum é 4, salvo quando o passeio tiver outro número configurado.",
            'A saída permanece "Em Formação" enquanto faltar quórum, enquanto nenhum guia tiver aceito ou, no passeio com translado, enquanto não houver veículo. Cada carro leva até 4 clientes e 1 guia. Cinco clientes exigem 2 carros e 2 guias.',
            "No cartão, nada é cobrado durante a formação e nada é cobrado antes de um guia aceitar. Enquanto nenhum guia foi chamado, o CONTRATANTE pode cancelar a qualquer momento, inclusive nas últimas 48 horas. Não há cobrança nem estorno, porque o passeio ainda não foi cobrado. Quando o quórum é atingido, a oportunidade vai ao TOP 3 da fila, por WhatsApp e por e-mail, e o aviso passa a ser \"Aguardando confirmação do guia\". O cancelamento pelo CONTRATANTE deixa de ser oferecido enquanto essa chamada corre. O primeiro guia que aceitar pelo link entra. Se ninguém aceitar, o passeio é cancelado porque não há guias disponíveis: no Pix o valor é estornado; no cartão nada chega a ser cobrado. Com translado, cada carro exige o próprio guia: 5 clientes exigem 2 guias. Enquanto faltar um, o aviso continua e ninguém cancela. A cobrança só sai quando os guias necessários aceitaram e os cartões dos inscritos passam no mesmo teste.",
            "No Pix já pago, o cancelamento durante a formação devolve 100% do valor pago.",
            "A CONTRATADA poderá cancelar o passeio a qualquer momento por motivos operacionais ou por inviabilidade de sua realização.",
            "Caso o número mínimo de inscrições não seja atingido até às 23h59 do dia anterior à data prevista para o passeio, este será cancelado automaticamente, não sendo a CONTRATADA obrigada a realizar a atividade.",
            "Nessa hipótese, devolvemos 100%. No cartão, nada foi cobrado. No Pix já pago, a devolução é integral.",
          ],
        },
        {
          heading: "3. Passeios Confirmados",
          paragraphs: [
            'A Excursão fica confirmada quando atinge o número mínimo de inscrições. O aviso ao CONTRATANTE é: "Excursão confirmada com esse número de inscrições". A partir daí o CONTRATANTE não cancela e não há devolução. O botão de cancelamento não é oferecido.',
            "Antes de cobrar qualquer participante, a CONTRATADA testa o valor no cartão de todos. A cobrança de 100% só ocorre se todos passarem nesse teste. Quem já tem cartão válido não é cobrado sozinho.",
            'Se um cartão não passar, ninguém é cobrado. O passeio fica em espera. O aviso é: "Aguardando X pagamento(s) para confirmar a saída, o quórum já foi atingido", em que X é a quantidade de cartões que ainda não passaram. Quem teve o cartão recusado é avisado para trocá-lo.',
            "Nessa espera o CONTRATANTE pode cancelar ou aguardar. Não há cobrança. Não há prazo fixo para a troca do cartão. A saída não confirma enquanto faltar o pagamento de alguém necessário ao quórum. A CONTRATADA não confirma o passeio retirando esse inscrito se, sem ele, o quórum deixar de ser atingido.",
            'Se alguém cancelar nessa espera, a saída volta ao status "Em Formação" e os inscritos recebem o aviso: "Passeio voltando ao status de formação devido a um cancelamento de última hora". O guia que já tinha aceito deixa de estar associado, permanece no final da fila e é notificado por WhatsApp e por e-mail. Nada foi cobrado.',
            "Quando o cartão for trocado e o teste de todos passar junto, a cobrança de 100% ocorre automaticamente em cada cartão salvo. A vaga fica definitiva e a agenda do guia fica bloqueada.",
            "Depois da confirmação e da cobrança, a Excursão não pode ser cancelada pelo CONTRATANTE e não há devolução. O botão de cancelamento não é oferecido.",
            "Não há restituição por desistência, alteração de planos, atraso, não comparecimento, perda de transporte, doença, motivos pessoais ou profissionais, ou qualquer outro impedimento que não seja da CONTRATADA.",
            "Quem não comparece continua cobrado pelo valor integral. A parte da plataforma continua sendo descontada e o guia recebe o pagamento normal daquela vaga. A ausência não entra na contagem de guiagem.",
          ],
        },
        {
          heading: "3.1 Substituição do Participante",
          paragraphs: [
            "No passeio Em grupo confirmado, o CONTRATANTE pode passar a vaga para outra pessoa que já tenha conta, informando o CPF dela e confirmando. Isso não é devolução e não vale para o Privativo.",
            "A pessoa indicada assume a reserva pelo valor já pago. Sem um substituto com conta, a vaga permanece com o CONTRATANTE e não há restituição.",
          ],
        },
        {
          heading: "3.2 Privativo",
          paragraphs: [
            "O Privativo é exclusivo para o grupo do CONTRATANTE. Não é uma excursão compartilhada e não depende de outras inscrições.",
            "No Privativo o cartão fica apenas salvo. Não há sinal. O passeio não está confirmado enquanto não houver um guia associado.",
            "A venda confirmada do passeio exclusivo, com transporte ou sem transporte, é enviada ao TOP 3 da fila. O cliente não escolhe o guia: entra quem aceitar primeiro pelo link.",
            "Com translado, a confirmação exige também o veículo: um carro e um guia a cada grupo de até 4 clientes. Sem translado, o veículo é o do CONTRATANTE e a confirmação ocorre quando o guia aceita.",
            "Enquanto o guia não aceitou, o CONTRATANTE pode cancelar a qualquer momento, inclusive nas últimas 48 horas em que a convocação dos guias já está em curso. Não há cobrança nem estorno.",
            "Quando o guia aceita e, no translado, o veículo está garantido, a CONTRATADA testa o cartão salvo. Se passar, o passeio é associado a esse guia e o cartão é cobrado em 100%, de forma automática. A partir desse momento não há cancelamento nem devolução.",
            "Se o cartão for recusado nessa hora, o passeio não confirma e nada é cobrado. O CONTRATANTE é avisado para trocar o cartão. Não há prazo fixo. Quando o novo cartão passar no teste, a cobrança de 100% ocorre automaticamente.",
          ],
        },
        {
          heading: "3.3 Troca de passeio",
          paragraphs: [
            "Enquanto o Em grupo estiver em formação e ainda não houver guia definido, o CONTRATANTE pode trocar uma vez, no mesmo dia, para uma saída já confirmada ou que fique confirmada com a entrada dele.",
            "A troca não vale para o Privativo e não vale depois da confirmação.",
          ],
        },
        {
          heading: "3.4 Check-in e contato do guia",
          paragraphs: [
            "Quando a Excursão está confirmada e o cancelamento pelo CONTRATANTE já não é possível, a CONTRATADA envia a identificação do guia: foto, nome e WhatsApp.",
            "No dia do passeio, o guia confirma o check-in pela leitura do QR. A confirmação é imediata, sem um botão extra de aceite. O CONTRATANTE recebe a mensagem de boas-vindas com a foto, o nome e o WhatsApp do guia, e o link para avaliar o passeio ao final.",
          ],
        },
        {
          heading: "4. Cancelamento pela CONTRATADA",
          paragraphs: [
            "O cancelamento manual do passeio é feito apenas por um administrador da plataforma. O cliente não cancela o passeio confirmado. O guia não cancela o passeio: se ele se retira, vale a troca pelo ranking.",
            "A CONTRATADA pode cancelar o passeio, inclusive depois da confirmação, e devolver o dinheiro, por causa de saúde ou problema grave do guia, por força maior, ou quando a realização se tornar inviável ou representar risco à segurança dos participantes.",
            "Entram nessa cláusula: condições climáticas severas; problema de saúde ou impedimento grave do guia; interdição do atrativo; determinação de autoridade competente; falta de veículo para realizar o Privativo; caso fortuito; força maior; situações que coloquem em risco a integridade física dos participantes, do guia ou da equipe.",
            "Nessas hipóteses o CONTRATANTE recebe o estorno integral do que foi pago. Nenhum guia recebe por esse passeio. O guia do passeio é avisado do cancelamento por WhatsApp e por e-mail.",
            "Passeio sem guia é cancelado. O motivo informado ao CONTRATANTE é que não há guias disponíveis. O aviso vai por WhatsApp e por e-mail. No Pix, o dinheiro é estornado. No cartão, a cobrança só passa quando um guia aceita; sem aceite, nada é cobrado e não há o que estornar.",
          ],
        },
        {
          heading: "4.1 Substituição do Guia",
          paragraphs: [
            "O CONTRATANTE não escolhe outro guia depois que um guia confirmou. O guia só se retira por problema de saúde, impedimento grave ou força maior.",
            "Quando o guia aceita, a agenda daquele dia bloqueia na hora. Ele não recebe outra proposta nesse dia enquanto o passeio espera outro guia ou o cartão. Se o passeio for cancelado, a agenda abre de novo.",
            "Quando o guia se retira, ele vai para o final da fila. A vaga é oferecida de novo pela mesma regra de oportunidade. O cliente só é avisado na hora da troca, por WhatsApp e por e-mail, com os dados do novo guia: nome, telefone, e-mail, foto, nota e descrição, sem o motivo. Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado porque não há guias disponíveis. No Pix o cliente recebe o estorno. No cartão, se o guia ainda não tinha aceitado, nada foi cobrado. O guia que saiu e quem recebeu a oportunidade são avisados. Nenhum guia recebe por esse passeio cancelado.",
            "Toda venda confirmada de passeio exclusivo ou de excursão, com transporte ou sem transporte, é enviada aos 3 primeiros guias da fila, o TOP 3, entre os guias do idioma da compra. Na excursão, isso ocorre quando o quórum é atingido. A exclusividade do TOP 3 dura 2 horas. O envio da oportunidade é pelo WhatsApp. O cliente e o guia recebem o mesmo aviso por WhatsApp e por e-mail.",
            "Enquanto a prioridade do guia especial estiver ativa, guiagem em que o guia recebe mais de R$ 500, ou guiagem em outro idioma, é oferecida primeiro a Diego Navi Marques Carvalho. Ele tem 24 horas para aceitar ou recusar, e a saída entra na agenda dele nesse prazo. Se ele recusar, não responder, já estiver ocupado nesse dia, ou se essa prioridade estiver desligada, a venda segue para o TOP 3.",
            "O guia confirma clicando no link de aceite que vai na mensagem de WhatsApp. O mesmo link segue no e-mail. A mensagem ao guia traz os dados da excursão ou do passeio exclusivo e os dados do comprador: nome, telefone e e-mail. O tempo para aceitar é de 4 horas e 20 minutos. O primeiro que aceitar ocupa a vaga e o link expira na hora. O sistema avisa, por WhatsApp e por e-mail, todos os guias que receberam aquela oportunidade de que ela foi aceita por outro guia. O cliente recebe, por WhatsApp e por e-mail, os dados do guia: nome, telefone e e-mail, além de foto, nota e descrição.",
            "Se nenhum dos 3 guias do TOP 3 aceitar nas 2 horas, todos os outros guias da lista são notificados ao mesmo tempo, com o mesmo prazo de 4 horas e 20 minutos e com o mesmo link de aceite. O primeiro que aceitar entra e o link expira.",
            "Se faltarem menos de 24 horas para o início do passeio, todos os guias da lista são notificados ao mesmo tempo e aquele que aceitar primeiro entra. O link expira nesse aceite.",
            "A fila sempre anda. Quem aceitou vai para o final da fila, e a próxima oportunidade usa essa nova ordem. O guia do TOP 3 que não clicar para aceitar acumula essa oportunidade. Na terceira vez sem clique, vai para o final da fila. Se ele aceitar, essa oportunidade não entra na contagem.",
            "Enquanto nenhum guia aceitou, os inscritos veem o aviso \"Aguardando confirmação do guia\". Não podem cancelar. No cartão, nada é cobrado nessa espera. Quando um guia aceita e o passeio com translado ainda exige outro, o cliente vê o guia que já entrou e o outro lugar com \"Aguardando\". Cada vaga segue a mesma regra: o primeiro aceite ocupa a vaga, o link daquela oportunidade expira, e a vaga que ainda faltar gera nova oportunidade para o TOP 3 da fila, que já andou.",
            "Se nenhum guia aceitar, o passeio é cancelado porque não há guias disponíveis. O cliente é avisado por WhatsApp e por e-mail. No Pix, o dinheiro é estornado. No cartão, nada é cobrado.",
            "Com transporte, a lista é a dos guias com veículo, modelo e ano no perfil. Sem transporte, a lista é a de guiagem e não exige veículo. A proposta informa se o passeio é com o veículo do guia, a data, o horário, o passeio, o pagamento que aquele guia recebe, o número de pessoas e se é excursão ou passeio exclusivo.",
            "Um administrador pode alocar um guia a qualquer momento. Essa alocação vale como o aceite. O link da oportunidade aberta expira e os guias que a receberam são avisados de que ela foi aceita por outro guia. Quem foi alocado vai para o final da fila. A cobrança no cartão só ocorre quando os guias necessários estão no passeio. Na Excursão, o teste conjunto dos cartões continua valendo.",
            "Se já havia um guia no passeio e ele é trocado, esse guia recebe o aviso da troca, com ou sem motivo. O motivo fica só com ele. O cliente é avisado da troca, sem o motivo, por WhatsApp e por e-mail, com os dados do novo guia. A troca não cancela, não devolve e não reduz o preço.",
            "Se a saída ainda estiver em espera de pagamento e um inscrito cancelar, isso não é troca de guia: a saída volta a Em Formação. O guia que tinha aceito deixa de estar associado, permanece no final da fila e é notificado por WhatsApp e por e-mail.",
          ],
        },
        {
          heading: "4.2 Vaga do guia sem translado",
          paragraphs: [
            "Sem translado, o CONTRATANTE contrata apenas o guia. O deslocamento é no veículo do próprio grupo.",
            "O carro de passeio tem 5 lugares. Um lugar é do guia. Cabem no máximo 4 clientes por carro.",
            "Cinco clientes em um único carro de 5 lugares deixam o guia sem vaga. Essa formação é um erro. O CONTRATANTE garante, ao confirmar, que haverá lugar para o guia. Com 5 ou mais pessoas, o grupo leva os carros necessários para que cada carro tenha no máximo 4 clientes.",
            "Se na saída não houver vaga para o guia, a CONTRATADA pode cancelar o passeio por inviabilidade operacional. O CONTRATANTE pode optar pelo reembolso integral (100%) dos valores pagos ou pelo crédito para outro passeio disponível.",
          ],
        },
        {
          heading: "4.3 Carros e guias com translado",
          paragraphs: [
            "Com translado, o CONTRATANTE contrata o passeio com o guia e o transporte a partir da cidade de hospedagem. O carro é do guia. Só entra nessa fila o guia que marcou veículo no perfil, com modelo e ano. Todo guia começa com a marcação Sem veículo.",
            "Cada carro leva até 4 clientes e 1 guia. O guia vai nesse carro.",
            "Cinco clientes exigem 2 carros e 2 guias. Oito clientes exigem 2 carros e 2 guias. Nove clientes exigem 3 carros e 3 guias. A conta é uma vaga de guia e um carro para cada grupo de até 4 clientes.",
            "O preço do Privativo com translado acompanha o número de carros: cada carro corresponde a uma diária de guia, no mínimo do quórum daquele passeio.",
          ],
        },
        {
          heading: "4.4 Guia em outro idioma",
          paragraphs: [
            "Guia em português não tem acréscimo.",
            "Se o CONTRATANTE escolher guia em outro idioma, entra o acréscimo em reais definido na tarifa daquele passeio. O valor é o mesmo para qualquer compra e não muda conforme a cidade de saída.",
            "O acréscimo incide uma vez sobre o total da compra, depois dos descontos de idade, e não por pessoa. Por exemplo: 2 adultos a R$ 90 e 2 crianças com 50% somam R$ 270. Um acréscimo de R$ 40 leva esse total a R$ 310.",
            "O desconto do Pix não entra nessa conta.",
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
            "O cancelamento do passeio por mau tempo somente pode ocorrer antes da saída da cidade de embarque, por decisão do administrador, quando houver risco à segurança dos participantes ou inviabilidade técnica da atividade.",
            "Nesse cancelamento o cliente recebe o estorno integral. Nenhum guia recebe. O guia do passeio é notificado do cancelamento por mau tempo.",
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
            "No cartão de crédito, o CONTRATANTE autoriza a verificação do cartão ao salvá-lo e a cobrança automática de 100% do valor somente quando o passeio confirmar. Na Excursão, a confirmação para o cliente é o número mínimo de inscrições. Até lá, ele cancela quando quiser. Se a saída não confirmar, devolvemos 100%. A partir desse mínimo, ele não cancela. Autoriza que a cobrança ocorra junto com a dos demais inscritos, depois que todos os cartões necessários ao mínimo forem aceitos no mesmo teste. Compromete-se a manter o cartão válido e a substituí-lo se for recusado. Enquanto um cartão necessário não passar, ninguém é cobrado.",
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
            "A fila do passeio com transporte reúne quem tem veículo, modelo e ano no perfil. A fila sem transporte é a de guiagem. As duas seguem a mesma regra. O GUIA vê a própria posição e é avisado quando ela muda. A posição não aparece para o cliente.",
            "A fila sempre anda. Quem aceita vai para o final, e a próxima oportunidade usa essa nova ordem. O guia do TOP 3 que não clica para aceitar acumula uma vez. Na terceira vez sem clique, vai para o final da fila. Aceitar não entra nessa conta.",
          ],
        },
        {
          heading: "3. Oportunidade",
          paragraphs: [
            "Toda venda confirmada de passeio exclusivo ou de excursão, com transporte ou sem transporte, é enviada aos 3 primeiros da fila do idioma da compra, o TOP 3. Na excursão, isso ocorre quando o quórum é atingido. A exclusividade do TOP 3 dura 2 horas.",
            "Enquanto a prioridade do guia especial estiver ativa, guiagem em que o guia recebe mais de R$ 500, ou guiagem em outro idioma, é oferecida primeiro a Diego Navi Marques Carvalho. Ele tem 24 horas para aceitar ou recusar, e a saída entra na agenda dele nesse prazo. Se ele recusar, não responder, já estiver ocupado nesse dia, ou se essa prioridade estiver desligada, a venda segue para o TOP 3.",
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
            "No passeio com transporte, cada carro exige um GUIA. Cinco clientes exigem 2 guias. Cada vaga gera a própria oportunidade. O primeiro aceite ocupa aquela vaga, o link expira, e a vaga que ainda faltar chama o TOP 3 da fila, que já andou. Quem já aceitou permanece.",
            "Enquanto faltar guia, os inscritos veem \"Aguardando confirmação do guia\" e não podem cancelar. No cartão, nada é cobrado nessa espera.",
            "Se nenhum guia aceitar, o passeio é cancelado porque não há guias disponíveis. O cliente e os guias que receberam a oportunidade são avisados por WhatsApp e por e-mail. No Pix há estorno. No cartão, nada foi cobrado.",
            "Um administrador pode alocar um GUIA a qualquer momento. Essa alocação vale como o aceite, o link aberto expira e os demais são avisados de que a oportunidade foi aceita por outro guia. Quem foi alocado vai para o final da fila. A cobrança não sai enquanto faltar guia necessário.",
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
            "A oportunidade usa a fila dos guias desse idioma, na ordem do ranking. Enquanto a prioridade do guia especial estiver ativa e o dia de Diego Navi Marques Carvalho estiver livre, a guiagem em outro idioma passa primeiro por ele, por 24 horas, antes dessa fila.",
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
