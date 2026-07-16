<?php
declare(strict_types=1);

/**
 * Upsert do guia Diego Navi (perfil completo para aparecer em Excursões).
 *
 * @return array{created:bool,updated:bool,user_id:int,email:string,name:string}
 */
function gcv_seed_diego_navi_guide(): array
{
    if (!function_exists('db')) {
        require_once __DIR__ . '/db.php';
    }
    if (!function_exists('gcv_cms_ensure_schema')) {
        require_once __DIR__ . '/cms_schema.php';
    }
    gcv_cms_ensure_schema();
    $pdo = db();

    // Coluna de idiomas (JSON: ["pt","en","es"])
    try {
        $cols = $pdo->query('SHOW COLUMNS FROM gcv_guides')->fetchAll();
        $have = [];
        foreach ($cols as $c) {
            $have[strtolower((string)$c['Field'])] = true;
        }
        if (!isset($have['languages_json'])) {
            $pdo->exec('ALTER TABLE gcv_guides ADD COLUMN languages_json VARCHAR(80) NULL DEFAULT NULL AFTER bio_es');
        }
    } catch (Throwable $e) {
        // ignore
    }

    $email = 'diegonavi82@gmail.com';
    $fullName = 'Diego Navi Marques Carvalho';
    $nickname = 'Diego Navi';
    $photo = '/assets/img/imagens/guia-diego-navi.webp';
    $phone = '62982506891';
    $cpf = '09837259779';
    $pixKey = '09837259779';
    $birth = '1982-12-19';
    $languages = ['pt', 'en', 'es'];

    $bioPt = implode("\n\n", [
        'Diego Navi Marques Carvalho é analista de sistemas formado pela PUC-Rio, brasileiro naturalizado italiano e pai de um pré-adolescente. Nascido e criado no Rio de Janeiro, decidiu trocar a rotina dos escritórios pela natureza da Chapada dos Veadeiros em 2016, onde encontrou sua verdadeira vocação.',
        'Em 2017, concluiu sua formação como Condutor Local de Visitantes de Ecoturismo da Chapada dos Veadeiros. No mesmo ano, uniu sua experiência na área de tecnologia à paixão pelo turismo de natureza para fundar a Guia Chapada Veadeiros, uma agência virtual criada para orientar visitantes no planejamento de suas viagens, oferecer informações confiáveis sobre os atrativos da região, conectar turistas aos mais experientes guias locais e incentivar um turismo seguro, responsável e de alta qualidade, valorizando a natureza, a cultura e a comunidade da Chapada dos Veadeiros.',
        'Fluente em português, inglês e espanhol, já conduziu dezenas de grupos com segurança e profissionalismo, recebendo visitantes do Brasil e de diversos países. Frequentador da Chapada dos Veadeiros desde 2009, conhece profundamente a região em todas as épocas do ano. Das cachoeiras mais famosas aos recantos menos explorados, domina trilhas, atrativos, logística, condições climáticas e particularidades de cada destino, proporcionando roteiros personalizados, seguros e memoráveis.',
        'Com uma visão que une tecnologia, atendimento de excelência e profundo conhecimento da Chapada dos Veadeiros, Diego dedica-se a transformar cada viagem em uma experiência única. Sua missão é ir além de conduzir visitantes: é compartilhar a essência da Chapada, valorizando sua natureza, cultura e as comunidades locais para que cada viajante viva uma experiência autêntica, segura e inesquecível.',
    ]);
    $bioEn = implode("\n\n", [
        'Diego Navi Marques Carvalho is a systems analyst graduated from PUC-Rio, a Brazilian national naturalized as Italian and father of a pre-teen. Born and raised in Rio de Janeiro, he left office life behind for the nature of Chapada dos Veadeiros in 2016, where he found his true calling.',
        'In 2017, he completed his training as a Local Ecotourism Visitor Guide in Chapada dos Veadeiros. That same year, he combined his technology background with his passion for nature tourism to found Guia Chapada Veadeiros.',
        'Fluent in Portuguese, English and Spanish, he has led dozens of groups safely and professionally. A regular visitor to Chapada dos Veadeiros since 2009, he knows the region deeply in every season.',
        'With a vision that combines technology, excellent service and deep knowledge of Chapada dos Veadeiros, Diego is dedicated to turning every trip into a unique experience.',
    ]);
    $bioEs = implode("\n\n", [
        'Diego Navi Marques Carvalho es analista de sistemas graduado por la PUC-Rio, brasileño naturalizado italiano y padre de un preadolescente. Nacido y criado en Río de Janeiro, dejó la rutina de oficina por la naturaleza de la Chapada dos Veadeiros en 2016, donde encontró su verdadera vocación.',
        'En 2017, completó su formación como Conductor Local de Visitantes de Ecoturismo de la Chapada dos Veadeiros y fundó Guia Chapada Veadeiros.',
        'Fluido en portugués, inglés y español, ha guiado decenas de grupos con seguridad y profesionalismo. Frecuentador de la Chapada desde 2009, conoce profundamente la región en todas las épocas del año.',
        'Con una visión que une tecnología, atención de excelencia y profundo conocimiento de la Chapada, Diego se dedica a transformar cada viaje en una experiencia única.',
    ]);

    $cityId = (int)($pdo->query('SELECT id FROM gcv_cities WHERE name LIKE "Alto Para%" LIMIT 1')->fetchColumn() ?: 0);

    $stmt = $pdo->prepare('SELECT id, role, status FROM gcv_users WHERE email = ? LIMIT 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    $created = false;
    $updated = false;

    if ($user) {
        $userId = (int)$user['id'];
        // Conta já existe — atualiza nome/avatar; papéis multi vêm no final
        $pdo->prepare(
            'UPDATE gcv_users SET name=?, status="active", email_verified=1, avatar_url=COALESCE(avatar_url, ?) WHERE id=?'
        )->execute([$nickname, $photo, $userId]);
        $updated = true;
    } else {
        $pdo->prepare(
            'INSERT INTO gcv_users (name, email, password_hash, role, status, email_verified, avatar_url)
             VALUES (?,?,NULL,"guide","active",1,?)'
        )->execute([$nickname, $email, $photo]);
        $userId = (int)$pdo->lastInsertId();
        $created = true;
    }

    $langJson = json_encode($languages, JSON_UNESCAPED_UNICODE);
    $g = $pdo->prepare('SELECT id FROM gcv_guides WHERE user_id = ?');
    $g->execute([$userId]);
    $guideId = $g->fetchColumn();

    if ($guideId) {
        $pdo->prepare(
            'UPDATE gcv_guides SET
              nickname=?, full_name=?, phone=?, phone_ddi="+55", phone_iso="br",
              birth_date=?, base_city_id=?, cpf=?,
              pix_key=?, pix_key_type="cpf", pix_holder_name=?,
              photo_url=?, photo_3x4_url=?, diploma_url=COALESCE(NULLIF(diploma_url,""), ?),
              bio_pt=?, bio_en=?, bio_es=?, languages_json=?,
              profile_complete=1, approved_at=COALESCE(approved_at, NOW())
             WHERE user_id=?'
        )->execute([
            $nickname,
            $fullName,
            $phone,
            $birth,
            $cityId ?: null,
            $cpf,
            $pixKey,
            $fullName,
            $photo,
            $photo,
            $photo,
            $bioPt,
            $bioEn,
            $bioEs,
            $langJson,
            $userId,
        ]);
        $updated = true;
    } else {
        $pdo->prepare(
            'INSERT INTO gcv_guides (
              user_id, nickname, full_name, phone, phone_ddi, phone_iso, birth_date, base_city_id, cpf,
              pix_key, pix_key_type, pix_holder_name, photo_url, photo_3x4_url, diploma_url,
              bio_pt, bio_en, bio_es, languages_json, profile_complete, approved_at
            ) VALUES (?,?,?,?,\'+55\',\'br\',?,?,?,?,\'cpf\',?,?,?,?,?,?,?,?,1,NOW())'
        )->execute([
            $userId,
            $nickname,
            $fullName,
            $phone,
            $birth,
            $cityId ?: null,
            $cpf,
            $pixKey,
            $fullName,
            $photo,
            $photo,
            $photo,
            $bioPt,
            $bioEn,
            $bioEs,
            $langJson,
        ]);
        $created = true;
    }

    // Multi-papel: Diego pode entrar nas 3 portas
    require_once __DIR__ . '/user_roles.php';
    gcv_user_grant_role($userId, 'guide');
    gcv_user_grant_role($userId, 'client');
    gcv_user_grant_role($userId, 'admin');
    gcv_user_sync_primary_role($userId);
    db()->prepare('UPDATE gcv_users SET status="active", email_verified=1 WHERE id=?')->execute([$userId]);

    return [
        'created' => $created,
        'updated' => $updated,
        'user_id' => $userId,
        'email' => $email,
        'name' => $nickname,
        'languages' => $languages,
        'pix_key' => $pixKey,
        'roles' => gcv_user_roles($userId),
    ];
}
