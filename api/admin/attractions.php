<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/cms_schema.php';
require_once __DIR__ . '/../helpers/excursion_attractions.php';
require_once __DIR__ . '/../helpers/related_tours.php';
require_once __DIR__ . '/../helpers/experiencias.php';
require_once __DIR__ . '/../helpers/tarifarios.php';
require_once __DIR__ . '/../helpers/pagina_atrativo.php';

header('Content-Type: application/json; charset=utf-8');
$admin = require_admin();
gcv_cms_ensure_schema();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function gcv_attraction_gallery(int $attractionId): array
{
    $stmt = db()->prepare('SELECT * FROM gcv_attraction_media WHERE attraction_id = ? ORDER BY sort_order ASC, id ASC');
    $stmt->execute([$attractionId]);
    return $stmt->fetchAll();
}

function gcv_save_attraction_gallery(int $attractionId, array $gallery): void
{
    db()->prepare('DELETE FROM gcv_attraction_media WHERE attraction_id = ?')->execute([$attractionId]);
    $ins = db()->prepare(
        'INSERT INTO gcv_attraction_media (attraction_id, media_id, url, alt_text, sort_order) VALUES (?,?,?,?,?)'
    );
    $i = 0;
    foreach ($gallery as $item) {
        if (!is_array($item)) continue;
        $url = trim((string)($item['url'] ?? ''));
        if ($url === '') continue;
        $ins->execute([
            $attractionId,
            isset($item['media_id']) && $item['media_id'] !== '' ? (int)$item['media_id'] : null,
            $url,
            ($item['alt_text'] ?? null) ?: null,
            isset($item['sort_order']) ? (int)$item['sort_order'] : $i,
        ]);
        $i++;
    }
}

function gcv_attraction_save_duration(int $id, array $body): void
{
    if (!array_key_exists('duration_minutes', $body)) {
        return;
    }
    $raw = $body['duration_minutes'];
    $minutes = ($raw === '' || $raw === null) ? null : max(0, (int)$raw);
    db()->prepare('UPDATE gcv_attractions SET duration_minutes = ? WHERE id = ?')->execute([$minutes, $id]);
    gcv_related_refresh_durations(db(), $id);
}

/** @param array<string,mixed> $row */
function gcv_attraction_anexar_experiencia(array $row): array
{
    $exp = [];
    $raw = $row['experiencia_json'] ?? '';
    if (is_string($raw) && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            $exp = $decoded;
        }
    }
    $row['experiencia'] = $exp;
    return $row;
}

/** Resumo da ficha para a tabela de Experiências. @param array<string,mixed> $exp */
function gcv_attraction_experiencia_lista(array $exp): array
{
    $tags = [];
    if (is_array($exp['tags'] ?? null)) {
        foreach ($exp['tags'] as $tag) {
            $tag = trim((string)$tag);
            if ($tag === '') {
                continue;
            }
            $tags[] = $tag;
            if (count($tags) >= 20) {
                break;
            }
        }
    }
    return [
        'tipo' => (string)($exp['tipo'] ?? ''),
        'subcategoria' => (string)($exp['subcategoria'] ?? ''),
        'cidade' => (string)($exp['cidade'] ?? ''),
        'tags' => $tags,
        'embarques' => is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [],
    ];
}

/** @param array<string,mixed> $row @param array<string,mixed>|null $tarifa */
function gcv_attraction_saidas_lista(array $row, ?array $tarifa): array
{
    $exp = is_array($row['experiencia'] ?? null) ? $row['experiencia'] : [];
    $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : [];
    $out = [];
    if ($embarques) {
        foreach ($embarques as $key => $item) {
            if (!is_array($item)) {
                continue;
            }
            $guia = strtoupper(trim((string)($item['guia'] ?? '')));
            $trans = strtoupper(trim((string)($item['trans'] ?? '')));
            $nome = trim((string)($item['nome'] ?? ''));
            if ($nome === '' && isset(GCV_TARIFARIO_CIDADES[$key])) {
                $nome = GCV_TARIFARIO_CIDADES[$key];
            }
            if ($nome === '') {
                $nome = (string)$key;
            }
            $codigos = array_values(array_filter([$guia, $trans], static fn ($v) => $v !== ''));
            $out[] = ['nome' => $nome, 'codigo' => implode(' · ', $codigos), 'detalhe' => ''];
        }
        if ($out) {
            return $out;
        }
    }
    $guia = strtoupper(trim((string)($row['tarifa_guia'] ?? '')));
    $trans = strtoupper(trim((string)($row['tarifa_translado'] ?? '')));
    $codigo = implode(' · ', array_values(array_filter([$guia, $trans], static fn ($v) => $v !== '')));
    $cidades = is_array($tarifa['cidades'] ?? null) ? $tarifa['cidades'] : [];
    foreach (GCV_TARIFARIO_CIDADES as $key => $nome) {
        $preco = $cidades[$key] ?? null;
        if (!is_array($preco)) {
            continue;
        }
        $exc = (int)round(((int)($preco['excursao_pessoa_cents'] ?? 0)) / 100);
        $pri = (int)round(((int)($preco['exclusivo_pessoa_cents'] ?? 0)) / 100);
        $exc5 = (int)round(((int)($preco['excursao_pessoa_5_cents'] ?? 0)) / 100);
        if ($exc < 1 && $pri < 1) {
            continue;
        }
        $partes = [$exc, $pri];
        if ($exc5 > 0) {
            $partes[] = $exc5;
        }
        $out[] = ['nome' => $nome, 'codigo' => $codigo, 'detalhe' => '(' . implode('/', $partes) . ')'];
    }
    return $out;
}

function gcv_attraction_save_ficha(int $id, array $body): void
{
    if (array_key_exists('experiencia', $body)) {
        $exp = is_array($body['experiencia']) ? $body['experiencia'] : [];
        $json = json_encode($exp, JSON_UNESCAPED_UNICODE);
        db()->prepare('UPDATE gcv_attractions SET experiencia_json = ? WHERE id = ?')->execute([$json !== false ? $json : null, $id]);
    }
    if (array_key_exists('cidade_nome', $body)) {
        $nome = trim((string)$body['cidade_nome']);
        $cid = null;
        if ($nome !== '') {
            try {
                $st = db()->prepare('SELECT id FROM gcv_cities WHERE name = ? LIMIT 1');
                $st->execute([$nome]);
                $found = $st->fetchColumn();
                if ($found) {
                    $cid = (int)$found;
                }
            } catch (Throwable $e) {
                error_log('cidade experiencia: ' . $e->getMessage());
            }
        }
        if ($nome === '' || $cid) {
            db()->prepare('UPDATE gcv_attractions SET city_id = ? WHERE id = ?')->execute([$cid, $id]);
        }
    }
    try {
        require_once __DIR__ . '/../helpers/tarifarios.php';
        gcv_tarifarios_ensure(db());
        if (array_key_exists('tarifa_guia', $body) || array_key_exists('tarifa_translado', $body)) {
            $guia = trim((string)($body['tarifa_guia'] ?? ''));
            $trans = trim((string)($body['tarifa_translado'] ?? ''));
            db()->prepare('UPDATE gcv_attractions SET tarifa_guia = ?, tarifa_translado = ? WHERE id = ?')->execute([
                $guia !== '' ? $guia : null,
                $trans !== '' ? $trans : null,
                $id,
            ]);
        }
        if (isset($body['duracao']) && is_array($body['duracao'])) {
            gcv_duracao_save(db(), 'atrativo', $id, $body['duracao']);
        }
        if (isset($body['experiencia']['embarques']) && is_array($body['experiencia']['embarques'])) {
            $chaves = [];
            foreach ($body['experiencia']['embarques'] as $key => $row) {
                if (!is_array($row)) {
                    continue;
                }
                $chaves[] = (string)$key;
            }
            gcv_saidas_save(db(), 'atrativo', $id, $chaves);
        }
    } catch (Throwable $e) {
        error_log('ficha atrativo: ' . $e->getMessage());
    }
}

function gcv_attraction_from_body(array $body, ?array $existing = null): array
{
    $title = trim((string)($body['title_pt'] ?? ($existing['title_pt'] ?? '')));
    $slug = trim((string)($body['slug'] ?? ''));
    if ($slug === '') $slug = gcv_cms_slugify($title);
    $status = (string)($body['status'] ?? ($existing['status'] ?? 'draft'));
    if (!in_array($status, ['draft', 'published', 'archived'], true)) $status = 'draft';
    $diff = (string)($body['difficulty'] ?? ($existing['difficulty'] ?? ''));
    if (!in_array($diff, ['easy', 'medium', 'hard', ''], true)) $diff = '';
    return [
        'slug' => $slug,
        'status' => $status,
        'title_pt' => $title,
        'title_en' => ($body['title_en'] ?? null),
        'title_es' => ($body['title_es'] ?? null),
        'excerpt_pt' => ($body['excerpt_pt'] ?? null),
        'excerpt_en' => ($body['excerpt_en'] ?? null),
        'excerpt_es' => ($body['excerpt_es'] ?? null),
        'content_pt' => ($body['content_pt'] ?? null),
        'content_en' => ($body['content_en'] ?? null),
        'content_es' => ($body['content_es'] ?? null),
        'seo_title_pt' => ($body['seo_title_pt'] ?? null),
        'seo_title_en' => ($body['seo_title_en'] ?? null),
        'seo_title_es' => ($body['seo_title_es'] ?? null),
        'seo_desc_pt' => ($body['seo_desc_pt'] ?? null),
        'seo_desc_en' => ($body['seo_desc_en'] ?? null),
        'seo_desc_es' => ($body['seo_desc_es'] ?? null),
        'distance_km' => isset($body['distance_km']) && $body['distance_km'] !== '' ? (float)$body['distance_km'] : null,
        'trail_distance_km' => isset($body['trail_distance_km']) && $body['trail_distance_km'] !== '' ? (float)$body['trail_distance_km'] : null,
        'difficulty' => $diff,
        'entry_price_cents' => isset($body['entry_price_cents']) && $body['entry_price_cents'] !== '' ? (int)$body['entry_price_cents'] : null,
        'entry_price_label' => ($body['entry_price_label'] ?? null) ?: null,
        'parking_info' => ($body['parking_info'] ?? null) ?: null,
        'recommended_period' => ($body['recommended_period'] ?? null) ?: null,
        'city_id' => array_key_exists('city_id', $body)
            ? (($body['city_id'] !== '' && $body['city_id'] !== null) ? (int)$body['city_id'] : null)
            : (isset($existing['city_id']) && $existing['city_id'] !== '' && $existing['city_id'] !== null ? (int)$existing['city_id'] : null),
        'cover_media_id' => isset($body['cover_media_id']) && $body['cover_media_id'] !== '' ? (int)$body['cover_media_id'] : null,
        'cover_url' => ($body['cover_url'] ?? null) ?: null,
        'sidebar_html_pt' => ($body['sidebar_html_pt'] ?? null),
        'sidebar_html_en' => ($body['sidebar_html_en'] ?? null),
        'sidebar_html_es' => ($body['sidebar_html_es'] ?? null),
        'published_at' => $status === 'published'
            ? (($body['published_at'] ?? null) ?: ($existing['published_at'] ?? date('Y-m-d H:i:s')))
            : null,
    ];
}

/** Ativada só com tarifa (Guia + Translado), duração e os campos da ficha. Rascunho e Desativada passam. */
function gcv_attraction_erro_ativar(array $body): ?string
{
    if ((string)($body['status'] ?? '') !== 'published') {
        return null;
    }
    $faltas = [];
    if (trim((string)($body['title_pt'] ?? '')) === '') {
        $faltas[] = 'Nome da experiência';
    }
    $conteudo = trim(strip_tags((string)($body['content_pt'] ?? '')));
    if ($conteudo === '') {
        $faltas[] = 'Descrição';
    }
    $exp = is_array($body['experiencia'] ?? null) ? $body['experiencia'] : [];
    $cidade = trim((string)($body['cidade_nome'] ?? ($exp['cidade'] ?? '')));
    if ($cidade === '') {
        $faltas[] = 'Cidade da experiência';
    }
    $embarques = is_array($exp['embarques'] ?? null) ? $exp['embarques'] : null;
    if ($embarques !== null) {
        $comSaida = 0;
        foreach ($embarques as $key => $row) {
            if (!is_array($row)) {
                continue;
            }
            $comSaida++;
            $nome = trim((string)($row['nome'] ?? $key));
            if ($nome === '') {
                $nome = (string)$key;
            }
            if (trim((string)($row['guia'] ?? '')) === '') {
                $faltas[] = 'Tarifa Guia em ' . $nome;
            }
            if ((int)($row['minutos'] ?? 0) < 1) {
                $faltas[] = 'Duração em ' . $nome;
            }
        }
        if ($comSaida === 0) {
            $faltas[] = 'Pelo menos uma cidade de saída';
        }
    } else {
        if (trim((string)($body['tarifa_guia'] ?? '')) === '') {
            $faltas[] = 'Tarifa Guia';
        }
        if ((int)($body['duration_minutes'] ?? 0) < 1) {
            $faltas[] = 'Duração do passeio';
        }
    }
    if (!$faltas) {
        return null;
    }
    return 'Para ativar, preencha: ' . implode(', ', $faltas) . '.';
}

if ($method === 'GET') {
    try {
        $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
        if ($id > 0) {
            $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if (!$row) {
                http_response_code(404);
                echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
                exit;
            }
            $row['gallery'] = gcv_attraction_gallery($id);
            $row['page'] = gcv_attraction_public_html_path((string)($row['slug'] ?? ''));
            $row['related_tours'] = gcv_related_tours_for_attraction(db(), $id);
            $row = gcv_attraction_anexar_experiencia($row);
            $row = gcv_pagina_atrativo_completar($row);
            echo json_encode(['ok' => true, 'data' => $row]);
            exit;
        }
        $pdo = db();
        $fields = [];
        foreach ($pdo->query('SHOW COLUMNS FROM gcv_attractions')->fetchAll() as $col) {
            $fields[(string)($col['Field'] ?? '')] = true;
        }
        $select = 'a.id, a.slug, a.status, a.title_pt, a.cover_url, a.difficulty, a.duration_minutes, a.tarifario_id, a.entry_price_cents, a.entry_price_label, a.city_id, a.updated_at';
        foreach (['tarifa_guia', 'tarifa_translado', 'experiencia_json'] as $col) {
            if (!empty($fields[$col])) {
                $select .= ', a.' . $col;
            }
        }
        $rows = $pdo->query(
            'SELECT ' . $select . ', c.name AS city_name
             FROM gcv_attractions a
             LEFT JOIN gcv_cities c ON c.id = a.city_id
             ORDER BY a.title_pt ASC'
        )->fetchAll();
        $tarifas = [];
        $ids = [];
        foreach ($rows as $row) {
            $tid = (int)($row['tarifario_id'] ?? 0);
            if ($tid > 0) {
                $ids[$tid] = $tid;
            }
        }
        if ($ids) {
            try {
                $in = implode(',', array_map('intval', $ids));
                $trows = $pdo->query('SELECT id, nome, quorum, precos_json FROM gcv_tarifario WHERE id IN (' . $in . ')')->fetchAll();
                foreach ($trows as $trow) {
                    $tarifas[(int)$trow['id']] = gcv_tarifario_public($trow);
                }
            } catch (Throwable $e) {
                error_log('attractions lista tarifas: ' . $e->getMessage());
            }
        }
        foreach ($rows as &$row) {
            $row['page'] = gcv_attraction_public_html_path((string)($row['slug'] ?? ''));
            $full = [];
            $raw = $row['experiencia_json'] ?? '';
            if (is_string($raw) && $raw !== '') {
                $decoded = json_decode($raw, true);
                if (is_array($decoded)) {
                    $full = $decoded;
                }
            }
            $row['experiencia'] = gcv_attraction_experiencia_lista($full);
            $row['max_participantes'] = gcv_experiencia_max_participantes($full);
            $tid = (int)($row['tarifario_id'] ?? 0);
            $row['saidas_lista'] = gcv_attraction_saidas_lista($row, $tarifas[$tid] ?? null);
            unset($row['experiencia_json'], $row['experiencia']['embarques']);
        }
        unset($row);
        $rows = gcv_sort_attractions_catalog($rows);
        echo json_encode(['ok' => true, 'data' => ['attractions' => $rows]]);
        exit;
    } catch (Throwable $e) {
        error_log('attractions.php GET: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'Tabela CMS ausente. Rode /api/_migrate_cms_once.php', 'detail' => $e->getMessage()]);
        exit;
    }
}

$body = gcv_cms_json_body();

if ($method === 'POST') {
    try {
        gcv_cms_ensure_schema();
        $row = gcv_attraction_from_body($body);
        if ($row['title_pt'] === '') {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'Título (PT) obrigatório']);
            exit;
        }
        $erroAtivar = gcv_attraction_erro_ativar(array_merge($body, ['status' => $row['status']]));
        if ($erroAtivar !== null) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => $erroAtivar]);
            exit;
        }
        $stmt = db()->prepare(
            'INSERT INTO gcv_attractions (
              slug, status, title_pt, title_en, title_es, excerpt_pt, excerpt_en, excerpt_es,
              content_pt, content_en, content_es, seo_title_pt, seo_title_en, seo_title_es,
              seo_desc_pt, seo_desc_en, seo_desc_es, distance_km, trail_distance_km, difficulty,
              entry_price_cents, entry_price_label, parking_info, recommended_period, city_id,
              cover_media_id, cover_url, sidebar_html_pt, sidebar_html_en, sidebar_html_es,
              published_at, created_by, updated_by
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        );
        $stmt->execute([
            $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
            $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
            $row['content_pt'], $row['content_en'], $row['content_es'],
            $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
            $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
            $row['distance_km'], $row['trail_distance_km'], $row['difficulty'],
            $row['entry_price_cents'], $row['entry_price_label'], $row['parking_info'], $row['recommended_period'], $row['city_id'],
            $row['cover_media_id'], $row['cover_url'], $row['sidebar_html_pt'], $row['sidebar_html_en'], $row['sidebar_html_es'],
            $row['published_at'], (int)$admin['id'], (int)$admin['id'],
        ]);
        $id = (int)db()->lastInsertId();
        gcv_attraction_save_duration($id, $body);
        gcv_attraction_save_ficha($id, $body);
        if (!empty($body['gallery']) && is_array($body['gallery'])) {
            gcv_save_attraction_gallery($id, $body['gallery']);
        }
        gcv_experiencia_apos_atrativo(db(), $id);
        $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
        $stmt->execute([$id]);
        $out = $stmt->fetch();
        $out['gallery'] = gcv_attraction_gallery($id);
        $out = gcv_attraction_anexar_experiencia($out);
        echo json_encode(['ok' => true, 'data' => $out]);
        exit;
    } catch (Throwable $e) {
        error_log('attractions.php POST: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Falha ao salvar atrativo. Abra /api/admin/setup-cms.php (logado) e tente de novo.',
            'detail' => $e->getMessage(),
        ]);
        exit;
    }
}

if ($method === 'PUT') {
    try {
        gcv_cms_ensure_schema();
        $id = (int)($body['id'] ?? 0);
        if ($id <= 0) {
            http_response_code(400);
            echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
            exit;
        }
        $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
        $stmt->execute([$id]);
        $existing = $stmt->fetch();
        if (!$existing) {
            http_response_code(404);
            echo json_encode(['ok' => false, 'error' => 'Atrativo não encontrado']);
            exit;
        }
        $row = gcv_attraction_from_body($body, $existing);
        $jaPublicada = (string)($existing['status'] ?? '') === 'published';
        $exigirAtivacao = !empty($body['exigir_ativacao']) || (!$jaPublicada && (string)($row['status'] ?? '') === 'published');
        if ($exigirAtivacao) {
            $erroAtivar = gcv_attraction_erro_ativar(array_merge($body, ['status' => $row['status']]));
            if ($erroAtivar !== null) {
                http_response_code(400);
                echo json_encode(['ok' => false, 'error' => $erroAtivar]);
                exit;
            }
        }
        $stmt = db()->prepare(
            'UPDATE gcv_attractions SET
              slug=?, status=?, title_pt=?, title_en=?, title_es=?, excerpt_pt=?, excerpt_en=?, excerpt_es=?,
              content_pt=?, content_en=?, content_es=?, seo_title_pt=?, seo_title_en=?, seo_title_es=?,
              seo_desc_pt=?, seo_desc_en=?, seo_desc_es=?, distance_km=?, trail_distance_km=?, difficulty=?,
              entry_price_cents=?, entry_price_label=?, parking_info=?, recommended_period=?, city_id=?,
              cover_media_id=?, cover_url=?, sidebar_html_pt=?, sidebar_html_en=?, sidebar_html_es=?,
              published_at=?, updated_by=?
             WHERE id=?'
        );
        $stmt->execute([
            $row['slug'], $row['status'], $row['title_pt'], $row['title_en'], $row['title_es'],
            $row['excerpt_pt'], $row['excerpt_en'], $row['excerpt_es'],
            $row['content_pt'], $row['content_en'], $row['content_es'],
            $row['seo_title_pt'], $row['seo_title_en'], $row['seo_title_es'],
            $row['seo_desc_pt'], $row['seo_desc_en'], $row['seo_desc_es'],
            $row['distance_km'], $row['trail_distance_km'], $row['difficulty'],
            $row['entry_price_cents'], $row['entry_price_label'], $row['parking_info'], $row['recommended_period'], $row['city_id'],
            $row['cover_media_id'], $row['cover_url'], $row['sidebar_html_pt'], $row['sidebar_html_en'], $row['sidebar_html_es'],
            $row['published_at'], (int)$admin['id'], $id,
        ]);
        if (array_key_exists('gallery', $body) && is_array($body['gallery'])) {
            gcv_save_attraction_gallery($id, $body['gallery']);
        }
        gcv_attraction_save_duration($id, $body);
        gcv_attraction_save_ficha($id, $body);
        gcv_experiencia_apos_atrativo(db(), $id);
        $expPagina = is_array($body['experiencia'] ?? null) ? $body['experiencia'] : [];
        gcv_pagina_atrativo_gravar((string)($row['slug'] ?? ''), [
            'pt' => [
                'bodyHtml' => (string)($row['content_pt'] ?? ''),
                'sidebarHtml' => (string)($row['sidebar_html_pt'] ?? ''),
                'title' => (string)($row['title_pt'] ?? ''),
                'subtitle' => (string)($expPagina['subtitulo_pt'] ?? ''),
            ],
            'en' => [
                'subtitle' => (string)($expPagina['subtitulo_en'] ?? ''),
            ],
            'es' => [
                'subtitle' => (string)($expPagina['subtitulo_es'] ?? ''),
            ],
        ]);
        $stmt = db()->prepare('SELECT * FROM gcv_attractions WHERE id = ?');
        $stmt->execute([$id]);
        $out = $stmt->fetch();
        $out['gallery'] = gcv_attraction_gallery($id);
        $out['page'] = gcv_attraction_public_html_path((string)($out['slug'] ?? ''));
        $out['related_tours'] = gcv_related_tours_for_attraction(db(), $id);
        $out = gcv_attraction_anexar_experiencia($out);
        $out = gcv_pagina_atrativo_completar($out);
        echo json_encode(['ok' => true, 'data' => $out]);
        exit;
    } catch (Throwable $e) {
        error_log('attractions.php PUT: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'ok' => false,
            'error' => 'Falha ao atualizar atrativo: ' . $e->getMessage(),
            'detail' => $e->getMessage(),
        ]);
        exit;
    }
}
if ($method === 'DELETE') {
    $id = (int)($body['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'id obrigatório']);
        exit;
    }
    db()->prepare('UPDATE gcv_attractions SET status="archived", updated_by=? WHERE id=?')->execute([(int)$admin['id'], $id]);
    gcv_experiencia_apos_atrativo(db(), $id);
    echo json_encode(['ok' => true]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'Método não permitido']);
