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
      policyCancel: "Política Guia Chapada Veadeiros",
      policySecurity: "Política Guia Chapada Veadeiros",
      policyGuide: "Termos do Guia",
      modalClose: "Fechar",
      agreeRequired:
        "Para pagar com Pix, leia e aceite a Política Guia Chapada Veadeiros.",
    },
    en: {
      agreePrefix: "I have read and agree to the",
      policyCancel: "Guia Chapada Veadeiros Policy",
      policySecurity: "Guia Chapada Veadeiros Policy",
      policyGuide: "Guide Terms",
      modalClose: "Close",
      agreeRequired:
        "To pay with Pix, please read and accept the Guia Chapada Veadeiros Policy.",
    },
    es: {
      agreePrefix: "He leído y acepto la",
      policyCancel: "Política Guia Chapada Veadeiros",
      policySecurity: "Política Guia Chapada Veadeiros",
      policyGuide: "Términos del Guía",
      modalClose: "Cerrar",
      agreeRequired:
        "Para pagar con Pix, lea y acepte la Política Guia Chapada Veadeiros.",
    },
  };

  var TITLES = {
    cancel: {
      pt: "Política Guia Chapada Veadeiros",
      en: "Guia Chapada Veadeiros Policy",
      es: "Política Guia Chapada Veadeiros",
    },
    security: {
      pt: "Política Guia Chapada Veadeiros",
      en: "Guia Chapada Veadeiros Policy",
      es: "Política Guia Chapada Veadeiros",
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
            "No cartão de crédito o cartão fica apenas salvo e é verificado nessa hora: a operadora confirma que o cartão existe e aceita cobrança futura. Não há sinal e não há cobrança do passeio nessa hora. Essa verificação não reserva o valor do passeio.",
            "O CONTRATANTE autoriza a cobrança automática de 100% somente na confirmação. A confirmação exige guia associado e, se houver translado, veículo. Na Excursão, a cobrança ainda exige que o cartão de todos os inscritos necessários ao quórum seja aceito no mesmo teste. Enquanto um desses cartões não passar, ninguém é cobrado.",
            "A contratação refere-se à prestação do serviço pela Guia Chapada Veadeiros, não constituindo a contratação de um guia específico, salvo quando expressamente contratado como serviço privativo personalizado.",
          ],
        },
        {
          heading: '2. Passeios "Em Formação"',
          paragraphs: [
            "A compra na modalidade Excursão abre uma saída em formação naquele dia, naquela cidade e naquele translado. Os inscritos iniciais são as pessoas dessa compra. Outras pessoas podem entrar nessa mesma saída enquanto ela estiver em formação. O quórum é 4, salvo quando o passeio tiver outro número configurado.",
            'A saída permanece "Em Formação" enquanto faltar quórum, enquanto nenhum guia tiver aceito ou, no passeio com translado, enquanto não houver veículo. Cada carro leva até 4 clientes e 1 guia. Cinco clientes exigem 2 carros e 2 guias.',
            "No cartão, nada é cobrado durante a formação. Enquanto nenhum guia foi chamado, o CONTRATANTE pode cancelar a qualquer momento, inclusive nas últimas 48 horas. Não há cobrança nem estorno, porque o passeio ainda não foi cobrado. A partir do momento em que o primeiro guia é chamado, o aviso passa a ser \"Aguardando confirmação do guia\" e o cancelamento deixa de ser oferecido. Esse aviso e o cancelamento fechado permanecem enquanto a fila segue para o próximo guia. Só terminam quando todos os guias necessários aceitaram, ou quando o passeio é cancelado automaticamente às 23h59 da véspera. Com translado, cada carro exige o próprio guia: 5 clientes exigem 2 guias. Enquanto faltar um, o aviso continua e ninguém cancela. A cobrança só sai quando os guias necessários aceitaram e os cartões dos inscritos passam no mesmo teste.",
            "No Pix já pago, o cancelamento durante a formação devolve 100% do valor pago.",
            "A CONTRATADA poderá cancelar o passeio a qualquer momento por motivos operacionais ou por inviabilidade de sua realização.",
            "Caso o quórum mínimo não seja atingido até às 23h59 do dia anterior à data prevista para o passeio, este será cancelado automaticamente, não sendo a CONTRATADA obrigada a realizar a atividade.",
            "Nessa hipótese, o CONTRATANTE poderá optar pelo reembolso integral (100%) dos valores pagos ou pela utilização do valor pago como crédito para reagendamento de outro passeio disponível, realizando-se o pagamento da diferença ou a restituição do saldo, conforme o valor do novo passeio escolhido.",
          ],
        },
        {
          heading: "3. Passeios Confirmados",
          paragraphs: [
            'A Excursão só fica "Confirmada" quando, ao mesmo tempo, o quórum de pessoas foi atingido, um guia aceitou, o veículo está garantido se houver translado, e o cartão de todos os inscritos necessários ao quórum foi aceito no mesmo teste.',
            "Antes de cobrar qualquer participante, a CONTRATADA testa o valor no cartão de todos. A cobrança de 100% só ocorre se todos passarem nesse teste. Quem já tem cartão válido não é cobrado sozinho.",
            'Se um cartão não passar, ninguém é cobrado. O passeio fica em espera. O aviso é: "Aguardando X pagamento(s) para confirmar a saída, o quórum já foi atingido", em que X é a quantidade de cartões que ainda não passaram. Quem teve o cartão recusado é avisado para trocá-lo.',
            "Nessa espera o CONTRATANTE pode cancelar ou aguardar. Não há cobrança. Não há prazo fixo para a troca do cartão. A saída não confirma enquanto faltar o pagamento de alguém necessário ao quórum. A CONTRATADA não confirma o passeio retirando esse inscrito se, sem ele, o quórum deixar de ser atingido.",
            'Se alguém cancelar nessa espera, a saída volta ao status "Em Formação" e os inscritos recebem o aviso: "Passeio voltando ao status de formação devido a um cancelamento de última hora". O guia que já tinha aceito deixa de estar associado, volta para a fila como prioridade 1 e é notificado da situação. Quando a saída estiver pronta para confirmar de novo, ele é o primeiro a ser chamado. Nada foi cobrado.',
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
            "No Privativo o cartão fica apenas salvo. Não há sinal. O passeio não está confirmado enquanto não houver um guia associado.",
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
          heading: "4. Cancelamento pela CONTRATADA",
          paragraphs: [
            "O cancelamento manual do passeio é feito apenas por um administrador da plataforma. O cliente não cancela o passeio confirmado. O guia não cancela o passeio: se ele se retira, vale a troca pelo ranking.",
            "A CONTRATADA pode cancelar o passeio, inclusive depois da confirmação, e devolver o dinheiro, por causa de saúde ou problema grave do guia, por força maior, ou quando a realização se tornar inviável ou representar risco à segurança dos participantes.",
            "Entram nessa cláusula: condições climáticas severas; problema de saúde ou impedimento grave do guia; interdição do atrativo; determinação de autoridade competente; falta de veículo para realizar o Privativo; caso fortuito; força maior; situações que coloquem em risco a integridade física dos participantes, do guia ou da equipe.",
            "Nessas hipóteses o CONTRATANTE recebe o estorno integral do que foi pago. Nenhum guia recebe por esse passeio. O guia do passeio é avisado do cancelamento.",
          ],
        },
        {
          heading: "4.1 Substituição do Guia",
          paragraphs: [
            "O CONTRATANTE não escolhe outro guia depois que um guia confirmou. O guia só se retira por problema de saúde, impedimento grave ou força maior.",
            "Quando o guia aceita, a agenda daquele dia bloqueia na hora. Ele não recebe outra proposta nesse dia enquanto o passeio espera outro guia ou o cartão. Se o passeio for cancelado, a agenda abre de novo.",
            "Quando o guia se retira, ele vai para o último lugar da fila em que estava. O próximo do ranking assume, na mesma rotina de troca. O cliente só recebe a notificação na hora da troca, com foto, nome, nota e descrição do novo guia, sem o motivo. Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado e o cliente recebe o estorno. O guia que saiu e os demais envolvidos são avisados. Nenhum guia recebe por esse passeio cancelado.",
            "No Privativo, o cliente vê os guias do idioma da compra que aceitaram participar da lista, na ordem do ranking. Em cada guia aparecem foto, nome, nota e descrição. O lugar na fila não aparece para o cliente. Só o guia vê a própria posição e é avisado quando ela muda. Quando o guia escolhido pelo cliente aceita o passeio, a associação está feita e a cobrança de 100% ocorre. Depois disso o CONTRATANTE não escolhe outro guia. Se esse guia se retirar, vale a regra acima: último lugar na fila, o próximo assume, e o cliente só é avisado na hora da troca.",
            "No Privativo, o guia escolhido tem 4 horas para aceitar ou recusar. O relógio para entre 22h e 8h. Se não responder nesse prazo, ou se recusar, perde 4 posições na fila em que foi chamado. Com translado, essa fila é Meu veículo. Sem translado, é Guiagem. Se não houver 4 pessoas atrás, vai para o último lugar. A CONTRATADA chama o próximo do mesmo ranking e o cliente é avisado.",
            'Enquanto esse prazo corre, o CONTRATANTE vê a foto, o nome, a nota e a descrição do guia escolhido, e o aviso: "Aguardando aceite do guia". Pode cancelar. Não há cobrança. O guia escolhido é avisado do cancelamento e a posição dele na fila não muda.',
            "No Em grupo com translado, a vaga é oferecida aos primeiros do ranking Meu veículo que tenham veículo cadastrado no perfil, um guia por carro, ao mesmo tempo. A proposta mostra, em destaque, \"Este passeio é com o seu veículo\", e os mesmos campos da guiagem: data, horário, passeio, pagamento em reais, número de pessoas e se é excursão ou não. O guia aceita ou recusa. O pagamento dessa proposta é o valor que aquele guia recebe. Se forem dois carros, cada proposta mostra o valor daquele guia, não a soma dos dois. O cliente vê o preço bruto do passeio, sem uma linha separada com a taxa do guia. O prazo é de 4 horas. O relógio para entre 22h e 8h. Se recusar ou o prazo acabar, perde 4 posições na fila em que foi chamado. Proposta com carro desce no ranking Meu veículo. Proposta de guiagem desce no ranking Guiagem. A outra fila não muda. Se não houver 4 pessoas atrás, vai para o último lugar dessa fila. A vaga passa para o próximo, e quem já aceitou permanece. Sem translado, a vaga segue o ranking Guiagem e não exige veículo. A proposta de guiagem mostra a data, o horário, o passeio, o pagamento que aquele guia recebe, o número de pessoas e se é excursão ou não. O guia aceita ou recusa. A troca não cancela, não devolve e não reduz o preço.",
            "Enquanto nenhum dos guias necessários aceitou, os inscritos veem o aviso: \"Aguardando confirmação do guia\". Não podem cancelar. Nada é cobrado nessa espera. Quando um dos dois já aceitou, ou o administrador alocou só um, o cliente vê dois lugares: o cartão de quem já está no passeio, com foto, nome, nota e descrição, e o outro lugar com \"Aguardando\". O cancelamento continua fechado e nada é cobrado. Isso só termina quando todos os guias necessários aceitaram, ou quando o passeio é cancelado automaticamente às 23h59 da véspera. Com translado, cada carro exige o próprio guia. Cinco clientes exigem 2 guias.",
            "Se até às 23h59 do dia anterior não tiverem aceitado todos os guias necessários, o passeio é cancelado automaticamente. No cartão, nada foi cobrado, então não há estorno. No Pix já pago, a devolução é de 100%. O CONTRATANTE é avisado. O guia que já tinha aceito é avisado e volta para a fila Meu veículo como prioridade 1.",
            "Um administrador da plataforma pode alocar qualquer guia a um passeio a qualquer momento, mesmo que o CONTRATANTE ainda não tenha escolhido guia. Essa alocação vale como o sim daquele guia. Se ainda faltar outro guia necessário, ele permanece no passeio, ninguém cancela e nada é cobrado, até o segundo aceitar ou ser alocado. O CONTRATANTE vê dois lugares: o cartão de quem já está no passeio, com foto, nome, nota e descrição, e o outro lugar com \"Aguardando\". A cobrança de 100% só ocorre quando todos os guias necessários estão no passeio. Com translado, a cobrança continua exigindo o veículo. Na Excursão, o teste conjunto dos cartões continua valendo: se um cartão não passar, ninguém é cobrado e a saída fica na espera já descrita.",
            "O CONTRATANTE vê a foto, o nome, a nota e a descrição do guia alocado e é avisado da troca, sem o motivo. O top 3 do ranking não muda: esses guias são avisados e as posições permanecem as mesmas. Se já havia um guia no passeio, ele recebe um aviso automático da troca, com ou sem motivo. O motivo fica só nesse aviso do guia. A troca não cancela, não devolve e não reduz o preço.",
            "Se a saída ainda estiver em espera de pagamento e um inscrito cancelar, isso não é troca de guia: a saída volta a Em Formação e o guia que tinha aceito retorna à fila como prioridade 1, com aviso da situação.",
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
            "Se o CONTRATANTE escolher guia em outro idioma, o acréscimo daquele passeio pode ser um percentual ou um valor fixo. O número fica na cópia da tarifa do atrativo e da cidade, e não no catálogo geral.",
            "O acréscimo incide uma vez sobre o total da compra, depois dos descontos de idade, e não por pessoa. Por exemplo: 2 adultos a R$ 90 e 2 crianças com 50% somam R$ 270. Um acréscimo de 100% leva esse total a R$ 540. Um acréscimo fixo de R$ 40 leva esse total a R$ 310.",
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
            "No cartão de crédito, o CONTRATANTE autoriza a verificação do cartão ao salvá-lo e a cobrança automática de 100% do valor somente quando o passeio confirmar. Na Excursão, autoriza que essa cobrança ocorra junto com a dos demais inscritos, depois que todos os cartões necessários ao quórum forem aceitos no mesmo teste. Compromete-se a manter o cartão válido e a substituí-lo se for recusado. Enquanto um cartão necessário não passar, o passeio permanece em espera e ninguém é cobrado. Nessa espera o CONTRATANTE pode cancelar; se cancelar, a Excursão volta a Em Formação.",
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
          heading: "2. Lista do Privativo",
          paragraphs: [
            "Para aparecer entre os guias oferecidos no Privativo, o GUIA precisa responder que tem interesse em participar da lista. Sem esse aceite, não entra no ranking mostrado ao cliente.",
            "Entram pela ordem do ranking, entre os guias do idioma escolhido na compra.",
            "O cliente vê até 3 guias, com foto, nome, nota e descrição. A posição na fila não é mostrada ao cliente.",
            "O GUIA vê a própria posição e é avisado quando ela muda. Se um guia que está entre os 3 publicar um passeio próprio naquele período, sai dessa lista, entra o próximo e os três são avisados das novas posições.",
          ],
        },
        {
          heading: "3. Resposta no Privativo",
          paragraphs: [
            'Quando o cliente escolhe o GUIA, ele tem 4 horas para aceitar ou recusar. O relógio para entre 22h e 8h. Nesse período o cliente vê o aviso "Aguardando aceite do guia" e pode cancelar. Não há cobrança. Se o cliente cancelar, o GUIA é avisado e a posição dele na fila não muda.',
            "Sem resposta nesse prazo, ou em caso de recusa, o GUIA perde 4 posições na fila em que foi chamado. Com translado, essa fila é Meu veículo. Sem translado, é Guiagem. Se não houver 4 pessoas atrás, vai para o último lugar. A plataforma chama o próximo do mesmo ranking e avisa o cliente.",
            "O passeio só fica associado ao GUIA, e o cliente só é cobrado, quando o GUIA aceita. Com translado, a confirmação também exige o veículo.",
          ],
        },
        {
          heading: "4. Resposta na Excursão",
          paragraphs: [
            "Na Excursão com translado, a vaga é oferecida aos primeiros do ranking Meu veículo que tenham veículo no perfil, um GUIA por carro, ao mesmo tempo. A proposta mostra, em destaque, \"Este passeio é com o seu veículo\", e os mesmos campos da guiagem: data, horário, passeio, pagamento em reais, número de pessoas e se é excursão ou não. O GUIA aceita ou recusa. O pagamento dessa proposta é o valor que aquele GUIA recebe. Se forem dois carros, cada proposta mostra o valor daquele GUIA, não a soma dos dois. O cliente vê o preço bruto do passeio, sem uma linha separada com a taxa do guia. O prazo é de 4 horas. O relógio para entre 22h e 8h. Se recusar ou o prazo acabar, perde 4 posições na fila em que foi chamado. Proposta com carro desce no ranking Meu veículo. Proposta de guiagem desce no ranking Guiagem. A outra fila não muda. Se não houver 4 pessoas atrás, vai para o último lugar dessa fila. A vaga passa para o próximo, e quem já aceitou permanece.",
            "Sem translado, a vaga segue o ranking Guiagem. Não exige veículo. A proposta mostra: Guiagem, data, horário, passeio, o pagamento que aquele GUIA recebe, número de pessoas e se é excursão ou não. O GUIA aceita ou recusa.",
            "Todo GUIA começa com a marcação Sem veículo. Sem modelo e ano cadastrados, não recebe proposta com carro. O GUIA vê dois rankings: Guiagem e Meu veículo.",
            "Enquanto nenhum dos guias necessários aceitou, os inscritos veem o aviso \"Aguardando confirmação do guia\" e não podem cancelar. Nada é cobrado nessa espera. Quando um dos dois já aceitou, o cliente vê dois lugares: o cartão de quem já está no passeio, com foto, nome, nota e descrição, e o outro lugar com \"Aguardando\". O cancelamento continua fechado. Isso só termina quando todos os guias necessários aceitaram, ou quando o passeio é cancelado automaticamente às 23h59 da véspera.",
            "Se até às 23h59 da véspera não tiverem aceitado todos os guias necessários, o passeio é cancelado automaticamente e o cliente é avisado. No cartão, nada foi cobrado. O GUIA que já tinha aceito é avisado e volta para a fila Meu veículo como prioridade 1.",
            "Um administrador da plataforma pode alocar qualquer guia a um passeio a qualquer momento, mesmo que o cliente ainda não tenha escolhido guia. Essa alocação vale como o sim daquele GUIA. Se ainda faltar outro guia necessário, ele permanece no passeio e a cobrança não sai até o segundo aceitar ou ser alocado. O cliente vê o cartão de quem já está no passeio e o outro lugar com \"Aguardando\". Não pode cancelar.",
            "O cliente vê a foto, o nome, a nota e a descrição do guia alocado e é avisado da troca. O top 3 do ranking não muda: esses guias são avisados e as posições permanecem as mesmas.",
            "Se já havia um GUIA no passeio, ele recebe um aviso automático da troca. O aviso pode ir com ou sem motivo escrito. O motivo fica só com o GUIA que saiu. O cliente é avisado da troca, sem o motivo. A posição na fila não muda por causa dessa troca. A troca não cancela, não devolve e não reduz o preço.",
          ],
        },
        {
          heading: "5. Confirmação e cobrança do cliente",
          paragraphs: [
            "Não há sinal. O cartão do cliente fica apenas salvo até a confirmação.",
            "A cobrança de 100% ocorre quando o passeio está associado ao GUIA e, se houver translado, quando o veículo está garantido. Cada carro leva até 4 clientes e 1 guia.",
            "Na Excursão, a confirmação ainda exige quórum e que o cartão de todos os inscritos necessários ao quórum passe no mesmo teste. Enquanto um cartão não passar, ninguém é cobrado.",
          ],
        },
        {
          heading: "6. Espera de pagamento",
          paragraphs: [
            'Se o quórum de pessoas já foi atingido e ainda falta pagamento, a saída fica em espera. O aviso aos inscritos é: "Aguardando X pagamento(s) para confirmar a saída, o quórum já foi atingido".',
            'Se um inscrito cancelar nessa espera, a saída volta a "Em Formação". Os inscritos recebem o aviso: "Passeio voltando ao status de formação devido a um cancelamento de última hora".',
            "O GUIA que já tinha aceito deixa de estar associado, volta para a fila como prioridade 1 e é notificado da situação. Quando a saída estiver pronta para confirmar de novo, ele é o primeiro a ser chamado. Nada foi cobrado.",
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
            "O GUIA só se retira por problema de saúde, impedimento grave ou força maior. Ele vai para o último lugar da fila em que estava. O próximo do ranking assume, na mesma rotina de troca. O cliente só é notificado na hora da troca.",
            "Se faltarem 2 horas para o passeio e ainda não houver substituto, o passeio é cancelado e o cliente recebe o estorno. O GUIA é avisado. Nenhum GUIA recebe por esse passeio.",
            "No cancelamento por mau tempo, o cliente recebe o estorno, nenhum GUIA recebe, e o GUIA do passeio é notificado.",
          ],
        },
        {
          heading: "9. Idioma",
          paragraphs: [
            "Guia em português não gera acréscimo para o cliente.",
            "Se o cliente escolhe outro idioma, o acréscimo daquele passeio — percentual ou valor fixo, na cópia da tarifa do atrativo e da cidade — incide uma vez sobre o total da compra, depois dos descontos de idade. Não incide por pessoa.",
            "A lista do Privativo usa os guias desse idioma, na ordem do ranking.",
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
