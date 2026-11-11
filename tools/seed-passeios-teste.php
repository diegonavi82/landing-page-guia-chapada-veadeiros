<?php
declare(strict_types=1);

/**
 * Cria ou atualiza os 4 passeios de teste e os tarifários em centavos.
 * Roda no PHP local, contra o banco de api/config.local.php. Não publicar este arquivo.
 */

$root = dirname(__DIR__);
require_once $root . '/api/helpers/db.php';
require_once $root . '/api/helpers/tarifarios.php';

$precos = [
    'excursao_pessoa_5_cents' => 4,
    'excursao_pessoa_cents' => 8,
    'exclusivo_pessoa_5_cents' => 10,
    'exclusivo_pessoa_cents' => 12,
    'excursao_transporte_cents' => 22,
    'exclusivo_transporte_cents' => 24,
];
$cidades = [];
foreach (array_keys(GCV_TARIFARIO_CIDADES) as $key) {
    $cidades[$key] = $precos;
}

$passeios = [
    [
        'slug' => 'teste-nave-pela-terra',
        'cover' => '/assets/img/teste/nave-pela-terra.jpg',
        'pt' => 'Teste — Viagem de nave pela Terra',
        'en' => 'Test — Earth cruise by spaceship',
        'es' => 'Prueba — Viaje en nave por la Tierra',
        'sub_pt' => 'Passeio de teste, em centavos. Não é um passeio da Chapada.',
        'sub_en' => 'Test tour, priced in cents. This is not a Chapada tour.',
        'sub_es' => 'Paseo de prueba, en centavos. No es un paseo de la Chapada.',
    ],
    [
        'slug' => 'teste-taxi-ovni',
        'cover' => '/assets/img/teste/taxi-ovni.jpg',
        'pt' => 'Teste — Táxi OVNI',
        'en' => 'Test — UFO taxi',
        'es' => 'Prueba — Taxi OVNI',
        'sub_pt' => 'Passeio de teste, em centavos. Não é um passeio da Chapada.',
        'sub_en' => 'Test tour, priced in cents. This is not a Chapada tour.',
        'sub_es' => 'Paseo de prueba, en centavos. No es un paseo de la Chapada.',
    ],
    [
        'slug' => 'teste-floresta-avatar',
        'cover' => '/assets/img/teste/floresta-avatar.jpg',
        'pt' => 'Teste — Floresta avatar',
        'en' => 'Test — Avatar forest',
        'es' => 'Prueba — Bosque avatar',
        'sub_pt' => 'Passeio de teste, em centavos. Não é um passeio da Chapada.',
        'sub_en' => 'Test tour, priced in cents. This is not a Chapada tour.',
        'sub_es' => 'Paseo de prueba, en centavos. No es un paseo de la Chapada.',
    ],
    [
        'slug' => 'teste-floresta-cartoon',
        'cover' => '/assets/img/teste/floresta-cartoon.jpg',
        'pt' => 'Teste — Floresta cartoon',
        'en' => 'Test — Cartoon forest',
        'es' => 'Prueba — Bosque de dibujos',
        'sub_pt' => 'Passeio de teste, em centavos. Não é um passeio da Chapada.',
        'sub_en' => 'Test tour, priced in cents. This is not a Chapada tour.',
        'sub_es' => 'Paseo de prueba, en centavos. No es un paseo de la Chapada.',
    ],
];

$pdo = db();
$city = $pdo->query(
    "SELECT id, name FROM gcv_cities
     WHERE status = 'active' AND (name LIKE 'Alto Paraíso%' OR name LIKE 'Alto Paraiso%')
     ORDER BY is_base DESC, id ASC
     LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);
if (!$city) {
    fwrite(STDERR, "Cidade Alto Paraíso não encontrada.\n");
    exit(1);
}

$embarques = [
    'alto-paraiso' => ['Centro'],
    'sao-jorge' => ['Centro'],
    'cavalcante' => ['Centro'],
];

foreach ($passeios as $item) {
    $body = [
        'nome' => $item['pt'],
        'quorum' => 2,
        'bilingue_tipo' => 'fixo',
        'bilingue_valor' => 32,
        'cidades' => $cidades,
    ];
    $achou = $pdo->prepare('SELECT id FROM gcv_tarifario WHERE nome = ? LIMIT 1');
    $achou->execute([$item['pt']]);
    $tarifaId = (int)$achou->fetchColumn();
    $tarifaId = gcv_tarifario_save($pdo, $tarifaId > 0 ? $tarifaId : null, $body);

    $exp = json_encode([
        'peso' => 1,
        'subtitulo_pt' => $item['sub_pt'],
        'subtitulo_en' => $item['sub_en'],
        'subtitulo_es' => $item['sub_es'],
        'embarques' => $embarques,
        'logistica' => ['max' => 4],
    ], JSON_UNESCAPED_UNICODE);

    $existe = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ? LIMIT 1');
    $existe->execute([$item['slug']]);
    $attrId = (int)$existe->fetchColumn();
    $campos = [
        'status' => 'published',
        'title_pt' => $item['pt'],
        'title_en' => $item['en'],
        'title_es' => $item['es'],
        'excerpt_pt' => $item['sub_pt'],
        'excerpt_en' => $item['sub_en'],
        'excerpt_es' => $item['sub_es'],
        'difficulty' => 'easy',
        'city_id' => (int)$city['id'],
        'cover_url' => $item['cover'],
        'duration_minutes' => 240,
        'tem_passeio' => 1,
        'categorias' => json_encode(['aventura']),
        'tarifario_id' => $tarifaId,
        'tarifa_guia' => '',
        'tarifa_translado' => '',
        'experiencia_json' => $exp,
        'published_at' => date('Y-m-d H:i:s'),
    ];
    if ($attrId > 0) {
        $sets = [];
        $vals = [];
        foreach ($campos as $col => $val) {
            $sets[] = $col . ' = ?';
            $vals[] = $val;
        }
        $vals[] = $attrId;
        $pdo->prepare('UPDATE gcv_attractions SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
    } else {
        $cols = array_merge(['slug'], array_keys($campos));
        $vals = array_merge([$item['slug']], array_values($campos));
        $place = implode(',', array_fill(0, count($cols), '?'));
        $pdo->prepare(
            'INSERT INTO gcv_attractions (' . implode(',', $cols) . ') VALUES (' . $place . ')'
        )->execute($vals);
        $attrId = (int)$pdo->lastInsertId();
    }
    echo $item['slug'] . ' atrativo=' . $attrId . ' tarifario=' . $tarifaId . PHP_EOL;
}

echo "cidade=" . $city['name'] . ' id=' . $city['id'] . PHP_EOL;
echo "ok\n";
