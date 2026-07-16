/**
 * Importa dados estáticos existentes para o MySQL CMS.
 *
 * Uso (na Hostinger / PHP CLI com .env configurado):
 *   php tools/import-cms-seed.php
 *
 * Importa:
 * - artigos da revista (HTML em revista/)
 * - atrativos (cms-generated.json + galleries)
 * - guias (excursoes-guides-profiles.mjs → via JSON gerado abaixo)
 * - cidades base (já no migration)
 *
 * Excursões: rode depois de atrativos/cidades existirem, ou cadastre no admin.
 */
<?php
declare(strict_types=1);

$root = dirname(__DIR__);
require_once $root . '/api/helpers/db.php';
require_once $root . '/api/helpers/cms_schema.php';

gcv_cms_ensure_schema();
$pdo = db();

function slug_from_filename(string $file): string
{
    return basename($file, '.html');
}

function extract_title(string $html): string
{
    if (preg_match('/<h1[^>]*>(.*?)<\/h1>/is', $html, $m)) {
        return trim(strip_tags($m[1]));
    }
    if (preg_match('/<title>(.*?)<\/title>/is', $html, $m)) {
        return trim(preg_replace('/\s*\|.*/', '', strip_tags($m[1])));
    }
    return 'Sem título';
}

echo "=== Import CMS ===\n";

/* ---- Revista ---- */
$revistaDir = $root . '/revista';
$importedArticles = 0;
if (is_dir($revistaDir)) {
    foreach (glob($revistaDir . '/*.html') ?: [] as $file) {
        $slug = slug_from_filename($file);
        if ($slug === 'index' || $slug === 'revista') continue;
        $html = file_get_contents($file) ?: '';
        $title = extract_title($html);
        // tenta pegar main content
        $content = $html;
        if (preg_match('/<article[^>]*>([\s\S]*?)<\/article>/i', $html, $m)) {
            $content = $m[1];
        } elseif (preg_match('/<main[^>]*>([\s\S]*?)<\/main>/i', $html, $m)) {
            $content = $m[1];
        }
        $exists = $pdo->prepare('SELECT id FROM gcv_articles WHERE slug = ?');
        $exists->execute([$slug]);
        if ($exists->fetch()) {
            echo "Artigo já existe: {$slug}\n";
            continue;
        }
        $pdo->prepare(
            'INSERT INTO gcv_articles (slug, status, title_pt, content_pt, published_at, created_at)
             VALUES (?,?,?,?,NOW(),NOW())'
        )->execute([$slug, 'published', $title, $content]);
        $importedArticles++;
        echo "Artigo importado: {$slug}\n";
    }
}
echo "Artigos novos: {$importedArticles}\n";

/* ---- Atrativos ---- */
$cmsJson = $root . '/tools/cms-generated.json';
$galleriesJson = $root . '/tools/attraction-galleries.json';
$galleries = [];
if (is_file($galleriesJson)) {
    $g = json_decode(file_get_contents($galleriesJson), true);
    $galleries = is_array($g) ? $g : [];
}
$importedAttr = 0;
if (is_file($cmsJson)) {
    $cms = json_decode(file_get_contents($cmsJson), true);
    $pages = $cms['locales']['pt']['attractionPages'] ?? [];
    foreach ($pages as $page) {
        $slug = (string)($page['baseSlug'] ?? $page['slug'] ?? '');
        if ($slug === '') continue;
        $exists = $pdo->prepare('SELECT id FROM gcv_attractions WHERE slug = ?');
        $exists->execute([$slug]);
        if ($exists->fetch()) {
            echo "Atrativo já existe: {$slug}\n";
            continue;
        }
        $title = (string)($page['title'] ?? $slug);
        $content = (string)($page['content'] ?? '');
        $cover = (string)($page['featuredImage'] ?? '');
        if ($cover && !str_starts_with($cover, 'http') && !str_starts_with($cover, '/')) {
            $cover = '/' . ltrim($cover, '/');
        }
        // normaliza paths wp-content → assets quando possível
        $cover = str_replace('/wp-content/uploads/', '/assets/img/imagens/', $cover);
        $pdo->prepare(
            'INSERT INTO gcv_attractions (slug, status, title_pt, excerpt_pt, content_pt, cover_url, seo_title_pt, seo_desc_pt, published_at)
             VALUES (?,?,?,?,?,?,?,?,NOW())'
        )->execute([
            $slug,
            'published',
            $title,
            (string)($page['excerpt'] ?? ''),
            $content,
            $cover ?: null,
            (string)($page['seoTitle'] ?? $title),
            (string)($page['seoDescription'] ?? ''),
        ]);
        $id = (int)$pdo->lastInsertId();
        $gal = $galleries[$slug] ?? [];
        if (is_array($gal)) {
            $ins = $pdo->prepare(
                'INSERT INTO gcv_attraction_media (attraction_id, url, alt_text, sort_order) VALUES (?,?,?,?)'
            );
            $i = 0;
            foreach ($gal as $item) {
                $url = is_array($item) ? (string)($item['src'] ?? '') : (string)$item;
                if ($url === '') continue;
                if (!str_starts_with($url, '/') && !str_starts_with($url, 'http')) $url = '/' . $url;
                $ins->execute([$id, $url, is_array($item) ? ($item['alt'] ?? null) : null, $i++]);
            }
        }
        $importedAttr++;
        echo "Atrativo importado: {$slug}\n";
    }
}
echo "Atrativos novos: {$importedAttr}\n";

/* ---- Guias (perfis marketing) ---- */
$guides = [
    [
        'email' => 'diego@guiachapadaveadeiros.com',
        'full_name' => 'Diego Navi Marques Carvalho',
        'nickname' => 'Diego Navi',
        'photo' => '/assets/img/imagens/guia-diego-navi.webp',
        'bio' => 'Guia e fundador da Guia Chapada Veadeiros.',
    ],
    [
        'email' => 'martina@guiachapadaveadeiros.com',
        'full_name' => 'Martina Motlová',
        'nickname' => 'Martina Motlová',
        'photo' => '/assets/img/imagens/guia-martina-motlova.webp',
        'bio' => 'Guia regional CADASTUR.',
    ],
    [
        'email' => 'gyovanna@guiachapadaveadeiros.com',
        'full_name' => 'Gyovanna Torres',
        'nickname' => 'Gyovanna Torres',
        'photo' => '/assets/img/imagens/guia-gyovanna-torres.png',
        'bio' => 'Guia local de ecoturismo.',
    ],
];

$cityId = (int)($pdo->query('SELECT id FROM gcv_cities WHERE name LIKE "Alto Para%" LIMIT 1')->fetchColumn() ?: 0);
$importedGuides = 0;
foreach ($guides as $g) {
    $exists = $pdo->prepare('SELECT id FROM gcv_users WHERE email = ?');
    $exists->execute([$g['email']]);
    if ($exists->fetch()) {
        echo "Guia já existe: {$g['email']}\n";
        continue;
    }
    $pdo->prepare(
        'INSERT INTO gcv_users (name, email, role, status, email_verified) VALUES (?,?, "guide", "active", 1)'
    )->execute([$g['nickname'], $g['email']]);
    $uid = (int)$pdo->lastInsertId();
    $pdo->prepare(
        'INSERT INTO gcv_guides (user_id, nickname, full_name, phone, phone_ddi, phone_iso, birth_date, base_city_id,
          pix_key, pix_key_type, pix_holder_name, photo_url, photo_3x4_url, diploma_url, bio_pt, approved_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())'
    )->execute([
        $uid,
        $g['nickname'],
        $g['full_name'],
        '62982506891',
        '+55',
        'br',
        '1990-01-01',
        $cityId ?: null,
        $g['email'],
        'email',
        $g['full_name'],
        $g['photo'],
        $g['photo'],
        $g['photo'], // placeholder diploma até upload real
        $g['bio'],
    ]);
    $importedGuides++;
    echo "Guia importado: {$g['nickname']}\n";
}
echo "Guias novos: {$importedGuides}\n";

/* ---- Excursões (carrossel) ---- */
$excJson = $root . '/tools/excursoes-carousel-seed.json';
$importedExc = 0;
if (is_file($excJson)) {
    $list = json_decode(file_get_contents($excJson), true);
    if (!is_array($list)) $list = [];

    $cityByShort = [];
    foreach ($pdo->query('SELECT id, name FROM gcv_cities')->fetchAll() as $c) {
        $cityByShort[mb_strtolower((string)$c['name'])] = (int)$c['id'];
        // aliases curtos do carrossel
        if (str_starts_with((string)$c['name'], 'Alto Paraíso')) {
            $cityByShort['alto paraíso'] = (int)$c['id'];
            $cityByShort['alto paraiso'] = (int)$c['id'];
        }
        if (str_starts_with((string)$c['name'], 'São Jorge') || $c['name'] === 'São Jorge') {
            $cityByShort['são jorge'] = (int)$c['id'];
            $cityByShort['sao jorge'] = (int)$c['id'];
        }
    }

    $guideByNick = [];
    foreach ($pdo->query(
        'SELECT g.user_id, g.nickname, u.name FROM gcv_guides g JOIN gcv_users u ON u.id = g.user_id'
    )->fetchAll() as $g) {
        if (!empty($g['nickname'])) $guideByNick[mb_strtolower((string)$g['nickname'])] = (int)$g['user_id'];
        if (!empty($g['name'])) $guideByNick[mb_strtolower((string)$g['name'])] = (int)$g['user_id'];
    }

    foreach ($list as $e) {
        $date = (string)($e['dateISO'] ?? '');
        $hora = (string)($e['hora'] ?? '');
        if ($date === '' || $hora === '') continue;
        if (strlen($hora) === 4) $hora = '0' . $hora; // 8:00 → 08:00
        if (preg_match('/^\d:\d{2}$/', $hora)) $hora = '0' . $hora;
        if (preg_match('/^\d{1,2}:\d{2}$/', $hora)) $hora .= ':00';

        $path = (string)($e['atrativoPath'] ?? '');
        if ($path === '' && !empty($e['destinos'][0]['atrativoPath'])) {
            $path = (string)$e['destinos'][0]['atrativoPath'];
        }
        $slug = basename(str_replace('\\', '/', $path), '.html');
        if ($slug === '') {
            echo "Excursão sem atrativoPath: {$date} {$e['destino']}\n";
            continue;
        }
        $att = $pdo->prepare('SELECT id, cover_url FROM gcv_attractions WHERE slug = ?');
        $att->execute([$slug]);
        $attr = $att->fetch();
        if (!$attr) {
            // tenta match parcial pelo título
            $title = (string)($e['destino'] ?? '');
            $att2 = $pdo->prepare('SELECT id, cover_url FROM gcv_attractions WHERE title_pt LIKE ? LIMIT 1');
            $att2->execute(['%' . explode('+', $title)[0] . '%']);
            $attr = $att2->fetch();
        }
        if (!$attr) {
            echo "Atrativo não encontrado para: {$slug} ({$date})\n";
            continue;
        }

        $embarque = mb_strtolower(trim((string)($e['embarque'] ?? 'Alto Paraíso')));
        $cityId = $cityByShort[$embarque] ?? ($cityByShort['alto paraíso'] ?? 0);
        if (!$cityId) {
            echo "Cidade não encontrada: {$e['embarque']}\n";
            continue;
        }

        $guideId = null;
        $gName = mb_strtolower(trim((string)($e['guiaNome'] ?? '')));
        if ($gName !== '' && isset($guideByNick[$gName])) {
            $guideId = $guideByNick[$gName];
        }

        $cartSlug = (string)($e['cartSlug'] ?? '');
        if ($cartSlug === '') {
            $cartSlug = $slug . '-' . $date . '-' . str_replace(':', '', substr($hora, 0, 5));
        }

        $exists = $pdo->prepare(
            'SELECT id FROM gcv_excursions WHERE date_iso = ? AND departure_time = ? AND attraction_id = ? AND departure_city_id = ?'
        );
        $exists->execute([$date, $hora, (int)$attr['id'], $cityId]);
        if ($exists->fetch()) {
            echo "Excursão já existe: {$date} {$hora} {$slug}\n";
            continue;
        }

        $booked = (int)($e['pessoasInscritas'] ?? 0);
        $max = (int)($e['grupoMaximo'] ?? 10);
        $price = (int)round(((float)($e['valor'] ?? 0)) * 100);
        $cover = (string)($e['cardImg'] ?? $attr['cover_url'] ?? '');
        if ($cover && empty($attr['cover_url'])) {
            $pdo->prepare('UPDATE gcv_attractions SET cover_url = ? WHERE id = ?')->execute([$cover, (int)$attr['id']]);
        }

        $pdo->prepare(
            'INSERT INTO gcv_excursions (
              status, date_iso, departure_time, departure_city_id, attraction_id, guide_user_id,
              price_cents, quorum, max_people, booked_people, include_entry, cart_slug
            ) VALUES ("published",?,?,?,?,?,?,4,?,?,?,?,?)'
        )->execute([
            $date,
            $hora,
            $cityId,
            (int)$attr['id'],
            $guideId,
            $price,
            $max,
            $booked,
            !empty($e['inclEntradas']) ? 1 : 0,
            $cartSlug,
        ]);
        $importedExc++;
        echo "Excursão importada: {$date} {$hora} — {$e['destino']}\n";
    }
}
echo "Excursões novas: {$importedExc}\n";
echo "=== Fim ===\n";
echo "Site: /api/excursions/carousel.php serve as publicadas do MySQL.\n";
