<?php
declare(strict_types=1);

/**
 * Seed do guia Diego Navi — DESATIVADO durante recadastro do zero (set/2026).
 * Foto e descrição ficam em api/data/_tmp_diego_navi/profile.json
 */
const GCV_SEED_DIEGO_NAVI_ENABLED = false;

/**
 * Upsert do guia Diego Navi (perfil completo para aparecer em Excursões).
 *
 * @return array{created:bool,updated:bool,skipped?:bool,reason?:string,user_id:int,email:string,name:string}
 */
function gcv_seed_diego_navi_guide(): array
{
    if (!GCV_SEED_DIEGO_NAVI_ENABLED) {
        return [
            'created' => false,
            'updated' => false,
            'skipped' => true,
            'reason' => 'Seed desativado: recadastro do zero com diegonavi82@gmail.com. Foto/bio em api/data/_tmp_diego_navi/.',
            'user_id' => 0,
            'email' => 'diegonavi82@gmail.com',
            'name' => 'Diego Navi',
            'languages' => [],
            'pix_key' => '',
            'roles' => [],
        ];
    }

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
    $phone = '21996039027';
    $cpf = '09837259779';
    $pixKey = '09837259779';
    $birth = '1982-12-19';
    $languages = ['pt', 'en', 'es'];

    $bioPt = implode("\n\n", [
        'Diego Navi Marques Carvalho é analista de sistemas formado pela PUC-Rio, brasileiro naturalizado italiano e pai de um pré-adolescente. Nasceu e cresceu no Rio de Janeiro. Em 2016, deixou a rotina dos escritórios para viver na Chapada dos Veadeiros, e foi ali que o turismo de natureza passou a ocupar o centro do seu trabalho.',
        'Em 2017, concluiu a formação de Condutor Local de Visitantes de Ecoturismo da Chapada dos Veadeiros. No mesmo ano, juntou a experiência em tecnologia ao conhecimento do território e fundou a Guia Chapada Veadeiros. A agência orienta o planejamento da viagem, reúne informação confiável sobre os atrativos e conecta visitantes a condutores locais experientes, num turismo seguro, responsável e de qualidade, que valoriza a natureza, a cultura e a comunidade da região.',
        'Fluente em português, inglês e espanhol, já conduziu dezenas de grupos do Brasil e de outros países, com segurança e profissionalismo. Frequenta a Chapada desde 2009 e conhece a região em todas as épocas do ano. Das cachoeiras mais procuradas aos recantos menos visitados, domina trilhas, logística, clima e o ritmo de cada destino, e monta roteiros sob medida.',
        'Diego trata cada viagem como uma experiência própria. O trabalho dele é compartilhar a essência da Chapada e fazer com que a natureza, a cultura e as comunidades locais apareçam na visita de forma autêntica e segura.',
    ]);
    $bioEn = implode("\n\n", [
        'Diego Navi Marques Carvalho is a systems analyst with a degree from PUC-Rio, a Brazilian who became an Italian citizen, and the father of a pre-teen. He was born and raised in Rio de Janeiro. In 2016 he left office life to live in Chapada dos Veadeiros, and nature tourism became the center of his work.',
        'In 2017 he qualified as a Local Ecotourism Visitor Guide in Chapada dos Veadeiros. That same year he brought his technology background together with his knowledge of the region and founded Guia Chapada Veadeiros. The agency helps visitors plan their trips, gathers reliable information about the attractions, and connects travelers with experienced local guides, in tourism that is safe, responsible, and carefully done, and that values the nature, culture, and community of the region.',
        'Fluent in Portuguese, English, and Spanish, he has led dozens of groups from Brazil and other countries with safety and professionalism. He has been coming to the Chapada since 2009 and knows the region in every season. From the best-known waterfalls to the quieter corners, he handles trails, logistics, weather, and the pace of each place, and he builds itineraries to fit the group.',
        'Diego treats every trip as its own experience. His work is to share the essence of the Chapada so that its nature, culture, and local communities are part of a visit that feels authentic and safe.',
    ]);
    $bioEs = implode("\n\n", [
        'Diego Navi Marques Carvalho es analista de sistemas formado en la PUC-Rio, brasileño nacionalizado italiano y padre de un preadolescente. Nació y creció en Río de Janeiro. En 2016 dejó la rutina de oficina para vivir en la Chapada dos Veadeiros, y el turismo de naturaleza pasó a ocupar el centro de su trabajo.',
        'En 2017 concluyó la formación como Conductor Local de Visitantes de Ecoturismo de la Chapada dos Veadeiros. Ese mismo año unió su experiencia en tecnología al conocimiento del territorio y fundó Guia Chapada Veadeiros. La agencia orienta la planificación del viaje, reúne información confiable sobre los atractivos y conecta a los visitantes con conductores locales experimentados, en un turismo seguro, responsable y de calidad, que valora la naturaleza, la cultura y la comunidad de la región.',
        'Habla con fluidez portugués, inglés y español, y ya ha conducido decenas de grupos de Brasil y de otros países, con seguridad y profesionalismo. Frecuenta la Chapada desde 2009 y conoce la región en todas las épocas del año. Desde las cascadas más buscadas hasta los rincones menos visitados, domina senderos, logística, clima y el ritmo de cada destino, y arma itinerarios a medida.',
        'Diego trata cada viaje como una experiencia propia. Su trabajo es compartir la esencia de la Chapada y hacer que la naturaleza, la cultura y las comunidades locales aparezcan en la visita de forma auténtica y segura.',
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
