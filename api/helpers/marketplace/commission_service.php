<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';
require_once __DIR__ . '/../settings.php';

/**
 * Comissão da plataforma: sempre a % definida em Configurações
 * (gcv_settings.platform_commission_pct).
 *
 * @return array{rule_id:?int,pct:float,scope_type:string,label:?string}
 */
function gcv_commission_resolve(
    ?int $excursionId = null,
    ?int $guideUserId = null,
    ?string $categoryKey = null,
    ?int $cityId = null
): array {
    unset($excursionId, $guideUserId, $categoryKey, $cityId);
    gcv_marketplace_ensure_schema();
    $pct = (float)setting('platform_commission_pct', '10');
    if ($pct < 0 || $pct > 100) {
        $pct = 10.0;
    }
    return [
        'rule_id' => null,
        'pct' => $pct,
        'scope_type' => 'settings',
        'label' => 'Configurações',
    ];
}

/**
 * @return list<array<string,mixed>>
 */
function gcv_commission_list_rules(bool $includeInactive = false): array
{
    gcv_marketplace_ensure_schema();
    $sql = 'SELECT * FROM gcv_commission_rules WHERE deleted_at IS NULL';
    if (!$includeInactive) {
        $sql .= ' AND is_active = 1';
    }
    $sql .= ' ORDER BY
      FIELD(scope_type, \'excursion\',\'guide\',\'category\',\'city\',\'global\'),
      id DESC';
    return db()->query($sql)->fetchAll(PDO::FETCH_ASSOC) ?: [];
}

/**
 * @param array{scope_type:string,scope_id:?int,commission_pct:float,label?:?string,is_active?:bool} $data
 */
function gcv_commission_upsert_rule(array $data, int $adminId): array
{
    gcv_marketplace_ensure_schema();
    $scope = strtolower(trim((string)($data['scope_type'] ?? '')));
    $allowed = ['global', 'guide', 'category', 'city', 'excursion'];
    if (!in_array($scope, $allowed, true)) {
        throw new InvalidArgumentException('scope_type inválido');
    }
    $pct = (float)($data['commission_pct'] ?? 0);
    if ($pct < 0 || $pct > 100) {
        throw new InvalidArgumentException('commission_pct deve estar entre 0 e 100');
    }
    $scopeId = $scope === 'global' ? null : (isset($data['scope_id']) ? (int)$data['scope_id'] : null);
    if ($scope !== 'global' && $scope !== 'category' && ($scopeId === null || $scopeId <= 0)) {
        throw new InvalidArgumentException('scope_id obrigatório para este escopo');
    }
    $label = isset($data['label']) ? trim((string)$data['label']) : null;
    if ($scope === 'category' && ($label === null || $label === '')) {
        throw new InvalidArgumentException('label (categoria) obrigatório');
    }
    $active = !empty($data['is_active']) || !array_key_exists('is_active', $data) ? 1 : 0;
    $id = (int)($data['id'] ?? 0);

    if ($id > 0) {
        $stmt = db()->prepare(
            'UPDATE gcv_commission_rules
             SET scope_type=?, scope_id=?, commission_pct=?, label=?, is_active=?, updated_by=?
             WHERE id=? AND deleted_at IS NULL'
        );
        $stmt->execute([$scope, $scopeId, $pct, $label, $active, $adminId, $id]);
    } else {
        $stmt = db()->prepare(
            'INSERT INTO gcv_commission_rules
             (scope_type, scope_id, commission_pct, label, is_active, created_by, updated_by)
             VALUES (?,?,?,?,?,?,?)'
        );
        $stmt->execute([$scope, $scopeId, $pct, $label, $active, $adminId, $adminId]);
        $id = (int)db()->lastInsertId();
    }

    $get = db()->prepare('SELECT * FROM gcv_commission_rules WHERE id = ?');
    $get->execute([$id]);
    $row = $get->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        throw new RuntimeException('Regra não encontrada após salvar');
    }
    return $row;
}

function gcv_commission_soft_delete_rule(int $id, int $adminId): bool
{
    gcv_marketplace_ensure_schema();
    $stmt = db()->prepare(
        'UPDATE gcv_commission_rules
         SET deleted_at = NOW(), is_active = 0, updated_by = ?
         WHERE id = ? AND deleted_at IS NULL'
    );
    $stmt->execute([$adminId, $id]);
    return $stmt->rowCount() > 0;
}

/** Mantém a regra global alinhada à % de Configurações (legado). */
function gcv_commission_sync_global_from_settings(float $pct): void
{
    if ($pct < 0 || $pct > 100) {
        return;
    }
    try {
        gcv_marketplace_ensure_schema();
        db()->prepare(
            "UPDATE gcv_commission_rules
             SET commission_pct = ?, updated_at = NOW()
             WHERE scope_type = 'global' AND deleted_at IS NULL"
        )->execute([$pct]);
    } catch (Throwable $e) {
        error_log('commission sync global: ' . $e->getMessage());
    }
}
