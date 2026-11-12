<?php
declare(strict_types=1);

/**
 * Textos de WhatsApp da confirmação operacional.
 * Edite as frases neste arquivo. Os placeholders ficam entre chaves.
 *
 * {titulo} {quando} {codigo} {prazo} {link} {guia} {n}
 */

function gcv_wa_locale(string $loc): string
{
    return in_array($loc, ['pt', 'en', 'es'], true) ? $loc : 'pt';
}

/** @param array<string,string> $vars */
function gcv_wa_fill(string $text, array $vars): string
{
    $replace = [];
    foreach ($vars as $key => $value) {
        $replace['{' . $key . '}'] = $value;
    }
    return strtr($text, $replace);
}

/**
 * @return array<string,array<string,string>>
 */
function gcv_wa_texts(): array
{
    $relogio = 'Esse tempo só corre das 6h às 9h e das 16h às 22h. Fora desses horários, a contagem para.';
    $relogioEn = 'This time runs only from 6:00 to 9:00 and from 16:00 to 22:00. Outside those hours, the countdown pauses.';
    $relogioEs = 'Ese tiempo solo corre de 6:00 a 9:00 y de 16:00 a 22:00. Fuera de esos horarios, la cuenta se detiene.';

    return [
        'pt' => [
            'operacional_excursao' => "⏳ Quórum atingido\n\n"
                . "O grupo fechou. A saída está em Aguardando confirmação operacional.\n\n"
                . "Estamos confirmando o guia e, se o passeio tiver translado, o veículo. "
                . "No cartão, a cobrança só acontece quando essa confirmação terminar. "
                . "Enquanto a saída estiver neste status, o cancelamento não está disponível.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}\n"
                . "Código: {codigo}",
            'operacional_privativo' => "⏳ Aguardando confirmação operacional\n\n"
                . "Seu privativo está reservado. Estamos chamando guias livres na data para montar a lista. "
                . "Quando houver guias que aceitaram participar, você recebe o link para escolher.\n\n"
                . "No cartão, a cobrança só acontece quando o guia estiver definido e, se houver translado, o veículo também. "
                . "Enquanto a saída estiver neste status, o cancelamento não está disponível.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}\n"
                . "Código: {codigo}",
            'escolha_link' => "Escolha o seu guia\n\n"
                . "{n} guias aceitaram participar. Abra o link e escolha quem vai guiar o passeio. "
                . "Você tem até {prazo}. {$relogio} "
                . "Se o prazo acabar sem escolha, entra o guia mais bem colocado da lista.\n\n"
                . "{link}\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}\n"
                . "Código: {codigo}",
            'escolha_auto' => "O prazo para escolher o guia acabou.\n\n"
                . "{guia} assumiu o passeio.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}\n"
                . "Código: {codigo}",
            'guia_aceite' => "Você tem 4h20 para aceitar ou recusar. {$relogio} O prazo acaba em {prazo}.",
            'guia_escolha' => "O cliente vai escolher o guia deste privativo. "
                . "Se você aceitar, seu nome entra na lista. Ainda não é a guiagem: só quem for escolhido assume o passeio.\n\n"
                . "Você tem 4h20 para responder. {$relogio} O prazo acaba em {prazo}.",
            'guia_prioridade' => "Esta venda chegou primeiro para você, o guia especial. "
                . "Aceite ou recuse na Agenda até {prazo}. {$relogio} "
                . "Esse dia fica ocupado enquanto você decide. Se recusar ou o prazo acabar, a venda segue para a fila.",
            'guia_lista_fechou' => "A lista de escolha deste passeio já fechou. Não é preciso responder.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}",
            'guia_nao_escolhido' => "O cliente escolheu outro guia para {titulo} em {quando}. Sua posição na fila não mudou.",
            'assunto_operacional' => 'Aguardando confirmação operacional — {titulo}',
            'assunto_escolha' => 'Escolha o seu guia — {titulo}',
            'assunto_escolha_auto' => 'Guia definido — {titulo}',
        ],
        'en' => [
            'operacional_excursao' => "⏳ Minimum group reached\n\n"
                . "The group is full. This departure is now Waiting for operational confirmation.\n\n"
                . "We are confirming the guide and, if the tour includes transport, the vehicle. "
                . "On card, the charge happens only when that confirmation is complete. "
                . "While the departure is in this status, cancellation is not available.\n\n"
                . "Tour: {titulo}\n"
                . "When: {quando}\n"
                . "Code: {codigo}",
            'operacional_privativo' => "⏳ Waiting for operational confirmation\n\n"
                . "Your private tour is reserved. We are calling guides who are free on this date to build the list. "
                . "When guides have agreed to be chosen, you receive the link to pick one.\n\n"
                . "On card, the charge happens only when the guide is set and, if there is transport, the vehicle too. "
                . "While the departure is in this status, cancellation is not available.\n\n"
                . "Tour: {titulo}\n"
                . "When: {quando}\n"
                . "Code: {codigo}",
            'escolha_link' => "Choose your guide\n\n"
                . "{n} guides agreed to be chosen. Open the link and pick who will guide the tour. "
                . "You have until {prazo}. {$relogioEn} "
                . "If the time runs out with no choice, the highest guide on the list is assigned.\n\n"
                . "{link}\n\n"
                . "Tour: {titulo}\n"
                . "When: {quando}\n"
                . "Code: {codigo}",
            'escolha_auto' => "The time to choose a guide has ended.\n\n"
                . "{guia} is assigned to your tour.\n\n"
                . "Tour: {titulo}\n"
                . "When: {quando}\n"
                . "Code: {codigo}",
            'guia_aceite' => "Você tem 4h20 para aceitar ou recusar. {$relogio} O prazo acaba em {prazo}.",
            'guia_escolha' => "O cliente vai escolher o guia deste privativo. "
                . "Se você aceitar, seu nome entra na lista. Ainda não é a guiagem: só quem for escolhido assume o passeio.\n\n"
                . "Você tem 4h20 para responder. {$relogio} O prazo acaba em {prazo}.",
            'guia_prioridade' => "Esta venda chegou primeiro para você, o guia especial. "
                . "Aceite ou recuse na Agenda até {prazo}. {$relogio} "
                . "Esse dia fica ocupado enquanto você decide. Se recusar ou o prazo acabar, a venda segue para a fila.",
            'guia_lista_fechou' => "A lista de escolha deste passeio já fechou. Não é preciso responder.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}",
            'guia_nao_escolhido' => "O cliente escolheu outro guia para {titulo} em {quando}. Sua posição na fila não mudou.",
            'assunto_operacional' => 'Waiting for operational confirmation — {titulo}',
            'assunto_escolha' => 'Choose your guide — {titulo}',
            'assunto_escolha_auto' => 'Guide assigned — {titulo}',
        ],
        'es' => [
            'operacional_excursao' => "⏳ Quórum alcanzado\n\n"
                . "El grupo se cerró. La salida está en Esperando confirmación operativa.\n\n"
                . "Estamos confirmando el guía y, si el paseo tiene traslado, el vehículo. "
                . "En la tarjeta, el cobro solo ocurre cuando esa confirmación termina. "
                . "Mientras la salida esté en este estado, la cancelación no está disponible.\n\n"
                . "Destino: {titulo}\n"
                . "Fecha: {quando}\n"
                . "Código: {codigo}",
            'operacional_privativo' => "⏳ Esperando confirmación operativa\n\n"
                . "Tu paseo privado está reservado. Estamos llamando a guías libres en la fecha para armar la lista. "
                . "Cuando haya guías que aceptaron participar, recibes el enlace para elegir.\n\n"
                . "En la tarjeta, el cobro solo ocurre cuando el guía esté definido y, si hay traslado, el vehículo también. "
                . "Mientras la salida esté en este estado, la cancelación no está disponible.\n\n"
                . "Destino: {titulo}\n"
                . "Fecha: {quando}\n"
                . "Código: {codigo}",
            'escolha_link' => "Elige a tu guía\n\n"
                . "{n} guías aceptaron participar. Abre el enlace y elige quién va a guiar el paseo. "
                . "Tienes hasta {prazo}. {$relogioEs} "
                . "Si el plazo termina sin elección, entra el guía mejor colocado de la lista.\n\n"
                . "{link}\n\n"
                . "Destino: {titulo}\n"
                . "Fecha: {quando}\n"
                . "Código: {codigo}",
            'escolha_auto' => "El plazo para elegir al guía terminó.\n\n"
                . "{guia} quedó con el paseo.\n\n"
                . "Destino: {titulo}\n"
                . "Fecha: {quando}\n"
                . "Código: {codigo}",
            'guia_aceite' => "Você tem 4h20 para aceitar ou recusar. {$relogio} O prazo acaba em {prazo}.",
            'guia_escolha' => "O cliente vai escolher o guia deste privativo. "
                . "Se você aceitar, seu nome entra na lista. Ainda não é a guiagem: só quem for escolhido assume o passeio.\n\n"
                . "Você tem 4h20 para responder. {$relogio} O prazo acaba em {prazo}.",
            'guia_prioridade' => "Esta venda chegou primeiro para você, o guia especial. "
                . "Aceite ou recuse na Agenda até {prazo}. {$relogio} "
                . "Esse dia fica ocupado enquanto você decide. Se recusar ou o prazo acabar, a venda segue para a fila.",
            'guia_lista_fechou' => "A lista de escolha deste passeio já fechou. Não é preciso responder.\n\n"
                . "Destino: {titulo}\n"
                . "Data: {quando}",
            'guia_nao_escolhido' => "O cliente escolheu outro guia para {titulo} em {quando}. Sua posição na fila não mudou.",
            'assunto_operacional' => 'Esperando confirmación operativa — {titulo}',
            'assunto_escolha' => 'Elige a tu guía — {titulo}',
            'assunto_escolha_auto' => 'Guía definido — {titulo}',
        ],
    ];
}

/** @param array<string,string> $vars */
function gcv_wa_text(string $key, string $loc, array $vars = []): string
{
    $loc = gcv_wa_locale($loc);
    $all = gcv_wa_texts();
    $text = (string)($all[$loc][$key] ?? $all['pt'][$key] ?? '');
    return trim(gcv_wa_fill($text, $vars));
}
