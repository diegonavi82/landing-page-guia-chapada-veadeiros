<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/validator.php';
require_once __DIR__ . '/../helpers/marketplace_schema.php';

header('Content-Type: application/json; charset=utf-8');

$admin = require_admin();
gcv_marketplace_ensure_schema();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = db()->prepare('SELECT id, key_name, value, label, type, updated_at FROM gcv_settings ORDER BY id ASC');
    $stmt->execute();
    json_response(true, ['settings' => $stmt->fetchAll()]);
}

if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $data    = body_json();
    $keyName = sanitize_text($data['key_name'] ?? '', 100);
    $value   = sanitize_text($data['value'] ?? '', 500);

    if (!$keyName) json_response(false, null, 'key_name obrigatório', 422);

    $stmt = db()->prepare('SELECT id, type FROM gcv_settings WHERE key_name = ?');
    $stmt->execute([$keyName]);
    $setting = $stmt->fetch();

    if (!$setting) json_response(false, null, 'Configuração não encontrada', 404);

    // Validar por tipo
    if (in_array($setting['type'], ['percent', 'integer'], true)) {
        if (!is_numeric($value) || (float)$value < 0) {
            json_response(false, null, 'Valor numérico inválido', 422);
        }
        if ($setting['type'] === 'percent' && (float)$value > 100) {
            json_response(false, null, 'Percentual não pode ser maior que 100', 422);
        }
    }

    if (in_array($keyName, ['guide_net_min_reais', 'guide_net_max_reais', 'guide_net_max_dragao_reais', 'guide_net_max_transport_reais'], true)) {
        $n = (int)round((float)$value);
        if ($n < 1 || $n > 10000) {
            json_response(false, null, 'Informe um valor em reais entre 1 e 10000', 422);
        }
        $value = (string)$n;
    }

    if (in_array($keyName, ['transfer_offer_hours', 'transfer_cancel_hours'], true)) {
        $n = (int)round((float)$value);
        if ($n < 0 || $n > 96) {
            json_response(false, null, 'Informe um prazo entre 0 e 96 horas', 422);
        }
        $offer = $keyName === 'transfer_offer_hours' ? $n : (int)setting('transfer_offer_hours', 48);
        $cancel = $keyName === 'transfer_cancel_hours' ? $n : (int)setting('transfer_cancel_hours', 12);
        if ($offer < 2) {
            json_response(false, null, 'A oferta de troca precisa de pelo menos 2 horas de antecedência', 422);
        }
        if ($cancel >= $offer) {
            json_response(false, null, 'Os prazos não podem se cruzar. A troca abre ANTES (mais horas) e o cancelamento automático vem DEPOIS (menos horas). Ex.: troca em 48h, cancela em 12h.', 422);
        }
        $value = (string)$n;
    }

    db()->prepare(
        'UPDATE gcv_settings SET value = ?, updated_by = ? WHERE key_name = ?'
    )->execute([$value, $admin['id'], $keyName]);

    if ($keyName === 'platform_commission_pct') {
        require_once __DIR__ . '/../helpers/marketplace/commission_service.php';
        gcv_commission_sync_global_from_settings((float)$value);
    }

    json_response(true, ['message' => 'Configuração salva']);
}

json_response(false, null, 'Método não permitido', 405);
