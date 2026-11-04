<?php
declare(strict_types=1);

/**
 * Anfitrião: cadastro pendente, aviso no WhatsApp e regras de venda da experiência.
 * O schema nasce aqui (CREATE/ALTER). Não há arquivo avulso em api/database/.
 */

function gcv_anfitriao_ensure(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }
    $done = true;
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_anfitrioes (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          nome VARCHAR(160) NOT NULL,
          email VARCHAR(190) NOT NULL,
          telefone VARCHAR(32) NOT NULL DEFAULT '',
          experiencia VARCHAR(190) NOT NULL DEFAULT '',
          attraction_id INT UNSIGNED NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          plano VARCHAR(20) NOT NULL DEFAULT 'sem_custo',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_anfitriao_email (email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS gcv_anfitriao_wa (
          id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          destino VARCHAR(40) NOT NULL,
          texto TEXT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
}

function gcv_anfitriao_avisar(PDO $pdo, string $destino, string $texto): void
{
    gcv_anfitriao_ensure($pdo);
    $pdo->prepare('INSERT INTO gcv_anfitriao_wa (destino, texto) VALUES (?, ?)')->execute([$destino, $texto]);
    try {
        require_once __DIR__ . '/purchase_notify.php';
        $phone = $destino === 'admin' ? gcv_admin_whatsapp_phone() : preg_replace('/\D+/', '', $destino);
        if (is_string($phone) && $phone !== '') {
            gcv_whatsapp_send_text($phone, $texto);
        }
    } catch (Throwable $e) {
        error_log('whatsapp anfitrião: ' . $e->getMessage());
    }
}

/**
 * Recusa a criação do passeio quando o atrativo está fora de venda, pausado na data
 * ou o guia está bloqueado na experiência.
 *
 * @param int[] $attractionIds
 */
function gcv_anfitriao_recusa_passeio(PDO $pdo, array $attractionIds, int $guideId, string $dateIso): ?string
{
    $ids = array_values(array_unique(array_filter(array_map('intval', $attractionIds))));
    if (!$ids) {
        return null;
    }
    try {
        $temCol = $pdo->query("SHOW COLUMNS FROM gcv_attractions LIKE 'tem_passeio'")->fetch();
        $expCol = $pdo->query("SHOW COLUMNS FROM gcv_attractions LIKE 'experiencia_json'")->fetch();
    } catch (Throwable $e) {
        return null;
    }
    $cols = 'id, title_pt' . ($temCol ? ', tem_passeio' : '') . ($expCol ? ', experiencia_json' : '');
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = $pdo->prepare("SELECT $cols FROM gcv_attractions WHERE id IN ($in)");
    $st->execute($ids);
    foreach ($st->fetchAll() ?: [] as $row) {
        $nome = trim((string)($row['title_pt'] ?? 'Este atrativo')) ?: 'Este atrativo';
        $venda = [];
        if (!empty($row['experiencia_json'])) {
            $exp = json_decode((string)$row['experiencia_json'], true);
            if (is_array($exp) && isset($exp['venda']) && is_array($exp['venda'])) {
                $venda = $exp['venda'];
            }
        }
        if (($temCol && isset($row['tem_passeio']) && (int)$row['tem_passeio'] === 0) || !empty($venda['sem_passeio'])) {
            return $nome . ' está fora da venda de passeio.';
        }
        $pausa = isset($venda['pausa']) && is_array($venda['pausa']) ? $venda['pausa'] : [];
        $inicio = (string)($pausa['inicio'] ?? '');
        $fim = (string)($pausa['fim'] ?? '');
        if ($dateIso !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $inicio) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fim) && $dateIso >= $inicio && $dateIso <= $fim) {
            return $nome . ' está pausado para venda de passeio neste período.';
        }
        $bloqueados = isset($venda['guias_bloqueados']) && is_array($venda['guias_bloqueados']) ? $venda['guias_bloqueados'] : [];
        foreach ($bloqueados as $guia) {
            if ($guideId > 0 && is_array($guia) && (int)($guia['id'] ?? 0) === $guideId) {
                return 'Este guia está bloqueado para vender este passeio no site.';
            }
        }
    }
    return null;
}
