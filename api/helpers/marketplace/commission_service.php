<?php
declare(strict_types=1);

require_once __DIR__ . '/../db.php';
require_once __DIR__ . '/../marketplace_schema.php';

/**
 * Resolução de comissão por prioridade:
 * Excursão → Guia → Categoria → Cidade → Global
 * Valor padrão 14% via seed em gcv_commission_rules (nunca hardcoded no cálculo).
 */

/** @return array{rule_id:?int,pct:float,scope_type:string,label:?string} */
function gcv_commission_resolve(
    ?int $excursionId = null,
    ?int $guideUserId = null,
    ?string $categoryKey = null,
    ?int $cityId = null
): array {
    gcv_marketplace_ensure_schema();
    $pdo = db();

    $candidates = [
        ['excursion', $excursionId],
        ['guide', $guideUserId],
        ['category', $categoryKey],
        ['city', $cityId],
        ['global', null],
    ];

    foreach ($candidates as [$scope, $scopeId]) {
        if ($scope !== 'global' && ($scopeId === null || $scopeId === '' || $scopeId === 0)) {
            continue;
        }
        if ($scope === 'category') {
            $stmt = $pdo->prepare(
                "SELECT id, commission_pct, scope_type, label
                 FROM gcv_commission_rules
                 WHERE scope_type = 'category' AND scope_id IS NULL
                   AND label = ? AND is_active = 1 AND deleted_at IS NULL
                 ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute([(string)$scopeId]);
        } elseif ($scope === 'global') {
            $stmt = $pdo->prepare(
                "SELECT id, commission_pct, scope_type, label
                 FROM gcv_commission_rules
                 WHERE scope_type = 'global' AND scope_id IS NULL
                   AND is_active = 1 AND deleted_at IS NULL
                 ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute();
        } else {
            $stmt = $pdo->prepare(
                "SELECT id, commission_pct, scope_type, label
                 FROM gcv_commission_rules
                 WHERE scope_type = ? AND scope_id = ?
                   AND is_active = 1 AND deleted_at IS NULL
                 ORDER BY id DESC LIMIT 1"
            );
            $stmt->execute([$scope, (int)$scopeId]);
        }
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            return [
                'rule_id' => (int)$row['id'],
                'pct' => (float)$row['commission_pct'],
                'scope_type' => (string)$row['scope_type'],
                'label' => $row['label'] !== null ? (string)$row['label'] : null,
            ];
        }
    }

    // Fallback extremo: settings legado (ainda no banco, não no código fixo)
    require_once __DIR__ . '/../settings.php';
    $pct = (float)setting('platform_commission_pct', '14');
    if ($pct <= 0) {
        $pct = 14.0;
    }
    return [
        'rule_id' => null,
        'pct' => $pct,
        'scope_type' => 'global_fallback_settings',
        'label' => 'Fallback settings',
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
