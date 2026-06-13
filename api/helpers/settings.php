<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

function setting(string $key, $default = null) {
    static $cache = [];
    if (!isset($cache[$key])) {
        $row = db()->prepare('SELECT value FROM gcv_settings WHERE key_name = ?');
        $row->execute([$key]);
        $cache[$key] = $row->fetchColumn();
    }
    return $cache[$key] !== false ? $cache[$key] : $default;
}
