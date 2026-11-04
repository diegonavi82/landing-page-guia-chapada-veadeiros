<?php
declare(strict_types=1);

require_once __DIR__ . '/../helpers/db.php';
require_once __DIR__ . '/../helpers/auth.php';
require_once __DIR__ . '/../helpers/ranking.php';

header('Content-Type: application/json; charset=utf-8');
require_admin();

json_response(true, gcv_ranking_build());
