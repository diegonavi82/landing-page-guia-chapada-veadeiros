<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/cms_schema.php';
require_once __DIR__ . '/excursion_status.php';
require_once __DIR__ . '/excursion_attractions.php';

/**
 * Ranking Fogo/Água.
 * Pessoas do grupo = inscrições pelo site (a pé + transporte) + confirmados por fora.
 * Os pontos de cada atrativo usam esse total. O desempate soma o grupo uma vez só.
 */

function gcv_ranking_regra(): string
{
    return 'Pontos do dia = pessoas de cada atrativo × peso (1 fácil, 2 moderado, 3 difícil). Entram as inscrições pelo site e as pessoas guiadas por fora. No mesmo grupo, com duas ou mais atrações, as pessoas contam em cada peso, mas o total de pessoas soma uma vez só. Esse total é o desempate. Cancelado não entra. A cidade conta o passeio que saiu de lá. O ranking atualiza todo dia às 16h20, depois do pagamento e da conclusão. Passeio que começa às 16h20 ou mais tarde entra no dia seguinte, pela hora de início do check-in.';
}

/** @return array{0:int,1:int} hora e minuto do fechamento, no fuso de Brasília */
function gcv_ranking_corte(): array
{
    $hour = 16;
    $min = 20;
    if (!function_exists('setting') && is_file(__DIR__ . '/settings.php')) {
        require_once __DIR__ . '/settings.php';
    }
    if (function_exists('setting')) {
        $hour = (int)setting('payout_after_hour', '16');
        $min = (int)setting('payout_after_minute', '20');
    }
    if ($hour < 0 || $hour > 23) {
        $hour = 16;
    }
    if ($min < 0 || $min > 59) {
        $min = 20;
    }
    return [$hour, $min];
}

/** Dia em que o passeio entra no ranking. Início às 16h20 ou depois vai para o dia seguinte. */
function gcv_ranking_data_contabil(string $dateIso, string $time): string
{
    $dateIso = substr($dateIso, 0, 10);
    [$hour, $min] = gcv_ranking_corte();
    $corte = sprintf('%02d:%02d', $hour, $min);
    $inicio = substr(trim($time), 0, 5);
    if ($inicio !== '' && $inicio >= $corte) {
        $tz = new DateTimeZone('America/Sao_Paulo');
        $dt = new DateTimeImmutable($dateIso . ' 12:00:00', $tz);
        return $dt->modify('+1 day')->format('Y-m-d');
    }
    return $dateIso;
}

function gcv_ranking_ja_fechou(string $dataContabil): bool
{
    [$hour, $min] = gcv_ranking_corte();
    $tz = new DateTimeZone('America/Sao_Paulo');
    $agora = new DateTimeImmutable('now', $tz);
    $fecha = new DateTimeImmutable($dataContabil . sprintf(' %02d:%02d:00', $hour, $min), $tz);
    return $agora >= $fecha;
}

/** @return array{xango:array{nome:string,periodo:string,guias:array},oxum:array{nome:string,periodo:string,guias:array}} */
function gcv_ranking_temporadas_vazias(): array
{
    return [
        'xango' => ['nome' => 'Ranking Fogo', 'periodo' => 'Seca · 1º de abril a 30 de setembro', 'guias' => []],
        'oxum' => ['nome' => 'Ranking Água', 'periodo' => 'Águas · 1º de outubro a 31 de março', 'guias' => []],
    ];
}

function gcv_ranking_cidade_key(string $nome): string
{
    $n = mb_strtolower(trim($nome));
    $n = str_replace(
        ['á', 'à', 'ã', 'â', 'é', 'ê', 'í', 'ó', 'ô', 'õ', 'ú', 'ç'],
        ['a', 'a', 'a', 'a', 'e', 'e', 'i', 'o', 'o', 'o', 'u', 'c'],
        $n
    );
    if (str_contains($n, 'cavalcante')) {
        return 'cavalcante';
    }
    if (str_contains($n, 'jorge')) {
        return 'sao-jorge';
    }
    if (str_contains($n, 'paraiso')) {
        return 'alto-paraiso';
    }
    return '';
}

function gcv_ranking_uma_casa(float $n): float
{
    return round($n, 1);
}

/** Inscrições pelo site + pessoas confirmadas por fora. */
function gcv_ranking_pessoas(array $e): int
{
    return max(0, (int)($e['booked_people'] ?? 0))
        + max(0, (int)($e['booked_people_transport'] ?? 0))
        + max(0, (int)($e['preconfirmed_people'] ?? 0));
}

function gcv_ranking_peso(array $atra): int
{
    $raw = $atra['experiencia_json'] ?? '';
    if (is_string($raw) && $raw !== '') {
        $exp = json_decode($raw, true);
        if (is_array($exp)) {
            $peso = (int)($exp['peso'] ?? 0);
            if ($peso === 1 || $peso === 2 || $peso === 3) {
                return $peso;
            }
        }
    }
    $diff = (string)($atra['difficulty'] ?? '');
    if ($diff === 'easy') {
        return 1;
    }
    if ($diff === 'hard') {
        return 3;
    }
    return 2;
}

/** @return array{xango:array{primeiro:string,segundo:string,terceiro:string},oxum:array{primeiro:string,segundo:string,terceiro:string}} */
function gcv_ranking_premiacao(array $atra): array
{
    $vazio = ['primeiro' => '', 'segundo' => '', 'terceiro' => ''];
    $out = ['xango' => $vazio, 'oxum' => $vazio];
    $raw = $atra['experiencia_json'] ?? '';
    $exp = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;
    $prem = is_array($exp) && is_array($exp['venda']['premiacao'] ?? null) ? $exp['venda']['premiacao'] : [];
    foreach (['xango', 'oxum'] as $temp) {
        $lado = is_array($prem[$temp] ?? null) ? $prem[$temp] : [];
        $out[$temp] = [
            'primeiro' => trim((string)($lado['primeiro'] ?? '')),
            'segundo' => trim((string)($lado['segundo'] ?? '')),
            'terceiro' => trim((string)($lado['terceiro'] ?? '')),
        ];
    }
    return $out;
}

function gcv_ranking_temporada(string $iso): string
{
    $mes = (int)substr($iso, 5, 2);
    return $mes >= 4 && $mes <= 9 ? 'xango' : 'oxum';
}

/**
 * @return array<string,mixed>
 */
function gcv_ranking_build(): array
{
    $base = array_merge(
        [
            'regra' => gcv_ranking_regra(),
            'cidades' => [
                ['key' => 'chapada', 'nome' => 'Chapada dos Veadeiros'],
                ['key' => 'alto-paraiso', 'nome' => 'Alto Paraíso'],
                ['key' => 'sao-jorge', 'nome' => 'São Jorge'],
                ['key' => 'cavalcante', 'nome' => 'Cavalcante'],
            ],
            'atrativos' => [],
        ],
        gcv_ranking_temporadas_vazias()
    );

    try {
        gcv_cms_ensure_schema();
        if (function_exists('gcv_marketplace_ensure_schema') || is_file(__DIR__ . '/marketplace_schema.php')) {
            require_once __DIR__ . '/marketplace_schema.php';
            gcv_marketplace_ensure_schema();
        }
    } catch (Throwable $e) {
        error_log('ranking schema: ' . $e->getMessage());
    }

    try {
        $rows = db()->query(
            'SELECT e.*, c.name AS departure_city_name
             FROM gcv_excursions e
             LEFT JOIN gcv_cities c ON c.id = e.departure_city_id
             WHERE e.guide_user_id IS NOT NULL AND e.guide_user_id > 0
               AND e.status IN (\'published\', \'soldout\')
               AND e.date_iso <= CURDATE()
             ORDER BY e.date_iso ASC, e.id ASC'
        )->fetchAll(PDO::FETCH_ASSOC) ?: [];
    } catch (Throwable $e) {
        error_log('ranking saidas: ' . $e->getMessage());
        return $base;
    }

    $guiaIds = [];
    $saidas = [];
    foreach ($rows as $row) {
        $life = gcv_resolve_excursion_lifecycle($row);
        if (!in_array($life, ['concluida', 'confirmada'], true)) {
            continue;
        }
        $pessoas = gcv_ranking_pessoas($row);
        if ($pessoas < 1) {
            continue;
        }
        $data = gcv_ranking_data_contabil(
            substr((string)($row['date_iso'] ?? ''), 0, 10),
            (string)($row['departure_time'] ?? '')
        );
        if (!gcv_ranking_ja_fechou($data)) {
            continue;
        }
        $gid = (int)$row['guide_user_id'];
        $guiaIds[$gid] = true;
        $saidas[] = ['row' => $row, 'pessoas' => $pessoas, 'guia' => $gid, 'data' => $data];
    }

    $guias = [];
    if ($guiaIds) {
        $in = implode(',', array_fill(0, count($guiaIds), '?'));
        $st = db()->prepare(
            "SELECT u.id,
                    COALESCE(NULLIF(g.full_name, ''), NULLIF(g.nickname, ''), u.name) AS nome,
                    COALESCE(g.photo_url, g.photo_3x4_url, '') AS foto,
                    COALESCE(c.name, '') AS cidade
             FROM gcv_users u
             LEFT JOIN gcv_guides g ON g.user_id = u.id
             LEFT JOIN gcv_cities c ON c.id = g.base_city_id
             WHERE u.id IN ($in)"
        );
        $st->execute(array_keys($guiaIds));
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $g) {
            $guias[(int)$g['id']] = $g;
        }
    }

    /** @var array<string,array<int,array<string,mixed>>> $porGuia */
    $porGuia = ['xango' => [], 'oxum' => []];
    $vistos = [];
    $pesoCache = [];

    foreach ($saidas as $saida) {
        $row = $saida['row'];
        $pessoas = $saida['pessoas'];
        $gid = $saida['guia'];
        $guia = $guias[$gid] ?? null;
        if (!$guia) {
            continue;
        }
        $data = (string)($saida['data'] ?? substr((string)$row['date_iso'], 0, 10));
        $temp = gcv_ranking_temporada($data);
        $cidadeNome = trim((string)($row['departure_city_name'] ?? ''));
        $cidadeKey = gcv_ranking_cidade_key($cidadeNome);
        if (!isset($porGuia[$temp][$gid])) {
            $baseCidade = trim((string)($guia['cidade'] ?? ''));
            $porGuia[$temp][$gid] = [
                'id' => $gid,
                'nome' => (string)($guia['nome'] ?? 'Guia'),
                'foto' => (string)($guia['foto'] ?? ''),
                'cidade' => $baseCidade,
                'cidade_key' => gcv_ranking_cidade_key($baseCidade),
                'pontos' => 0,
                'pessoas' => 0,
                'dias' => [],
            ];
        }
        $acc = &$porGuia[$temp][$gid];
        if (!isset($acc['dias'][$data])) {
            $acc['dias'][$data] = [
                'data' => $data,
                'grupos' => 0,
                'pessoas' => 0,
                'pontos' => 0,
                'atrativos' => [],
                'saidas' => [],
            ];
        }
        $dia = &$acc['dias'][$data];
        $dia['grupos']++;
        $dia['pessoas'] += $pessoas;
        $acc['pessoas'] += $pessoas;

        $atracoes = gcv_excursion_load_attractions((int)$row['id']);
        if (!$atracoes && !empty($row['attraction_id'])) {
            $atracoes = [['id' => (int)$row['attraction_id'], 'title_pt' => '', 'slug' => '']];
        }
        $itens = [];
        foreach ($atracoes as $atra) {
            $aid = (int)($atra['id'] ?? 0);
            if ($aid > 0 && !isset($pesoCache[$aid])) {
                $q = db()->prepare('SELECT id, title_pt, slug, difficulty, experiencia_json FROM gcv_attractions WHERE id = ?');
                $q->execute([$aid]);
                $pesoCache[$aid] = $q->fetch(PDO::FETCH_ASSOC) ?: [];
            }
            $full = $aid > 0 ? ($pesoCache[$aid] ?? []) : [];
            $slug = (string)($full['slug'] ?? $atra['slug'] ?? '');
            $nome = (string)($full['title_pt'] ?? $atra['title_pt'] ?? $slug);
            $peso = $full ? gcv_ranking_peso($full) : 2;
            $pontos = $pessoas * $peso;
            $dia['pontos'] += $pontos;
            $acc['pontos'] += $pontos;
            $item = [
                'nome' => $nome,
                'slug' => $slug,
                'pessoas' => $pessoas,
                'peso' => $peso,
                'pontos' => $pontos,
            ];
            $dia['atrativos'][] = $item;
            $itens[] = $item;
            if ($slug !== '') {
                $vistos[$slug] = $full ?: ['id' => $aid, 'slug' => $slug, 'title_pt' => $nome];
            }
        }
        $dia['saidas'][] = [
            'pessoas' => $pessoas,
            'cidade' => $cidadeKey,
            'atrativos' => $itens,
        ];
        unset($dia, $acc);
    }

    $fechar = static function (array $mapa): array {
        $lista = [];
        foreach ($mapa as $row) {
            $dias = array_values($row['dias']);
            usort($dias, static function ($a, $b) {
                return strcmp((string)$a['data'], (string)$b['data']);
            });
            $nDias = count($dias);
            $diasOut = [];
            foreach ($dias as $dia) {
                $grupos = max(1, (int)$dia['grupos']);
                $diasOut[] = [
                    'data' => $dia['data'],
                    'grupos' => (int)$dia['grupos'],
                    'pessoas' => (int)$dia['pessoas'],
                    'pontos' => (int)$dia['pontos'],
                    'media_grupo' => gcv_ranking_uma_casa(((int)$dia['pessoas']) / $grupos),
                    'atrativos' => $dia['atrativos'],
                    'saidas' => $dia['saidas'],
                ];
            }
            $lista[] = [
                'id' => $row['id'],
                'nome' => $row['nome'],
                'foto' => $row['foto'],
                'cidade' => $row['cidade'],
                'cidade_key' => $row['cidade_key'],
                'pontos' => (int)$row['pontos'],
                'pessoas' => (int)$row['pessoas'],
                'dias_guiados' => $nDias,
                'media_dia' => $nDias > 0 ? gcv_ranking_uma_casa(((int)$row['pessoas']) / $nDias) : 0,
                'dias' => $diasOut,
            ];
        }
        usort($lista, static function ($a, $b) {
            if ($a['pontos'] !== $b['pontos']) {
                return $b['pontos'] <=> $a['pontos'];
            }
            if ($a['pessoas'] !== $b['pessoas']) {
                return $b['pessoas'] <=> $a['pessoas'];
            }
            return strcasecmp((string)$a['nome'], (string)$b['nome']);
        });
        foreach ($lista as $i => &$guia) {
            $guia['lugar'] = $i + 1;
        }
        unset($guia);
        return $lista;
    };

    $atrativos = [];
    foreach ($vistos as $slug => $full) {
        $atrativos[] = [
            'id' => (int)($full['id'] ?? 0),
            'slug' => $slug,
            'nome' => (string)($full['title_pt'] ?? $slug),
            'peso' => gcv_ranking_peso($full),
            'premiacao' => gcv_ranking_premiacao($full),
        ];
    }
    usort($atrativos, static function ($a, $b) {
        return strcasecmp((string)$a['nome'], (string)$b['nome']);
    });

    $temps = gcv_ranking_temporadas_vazias();
    $temps['xango']['guias'] = $fechar($porGuia['xango']);
    $temps['oxum']['guias'] = $fechar($porGuia['oxum']);

    return array_merge($base, $temps, ['atrativos' => $atrativos]);
}
