<?php
declare(strict_types=1);

/**
 * Link do contratante para escolher o guia do privativo.
 * https://www.guiachapadaveadeiros.com/escolher-guia/?t=TOKEN
 */

require_once __DIR__ . '/helpers/db.php';
require_once __DIR__ . '/helpers/guide_choice.php';
require_once __DIR__ . '/helpers/guide_substitution.php';
require_once __DIR__ . '/helpers/ops_clock.php';
require_once __DIR__ . '/helpers/notify_ops.php';

$token = strtolower(trim((string)($_GET['t'] ?? $_POST['t'] ?? '')));
$lang = (string)($_GET['lang'] ?? $_POST['lang'] ?? 'pt');
if (!in_array($lang, ['pt', 'en', 'es'], true)) {
    $lang = 'pt';
}

$ui = [
    'pt' => [
        'title' => 'Escolha o seu guia',
        'lead' => 'Estes guias aceitaram participar. Escolha quem vai guiar o passeio.',
        'button' => 'Escolher este guia',
        'gone' => 'Este link não está mais disponível.',
        'done' => 'Guia escolhido. Você recebe a confirmação no WhatsApp.',
        'late' => 'O prazo acabou. O guia mais bem colocado da lista assumiu o passeio.',
        'deadline' => 'Escolha até',
        'clock' => 'Esse prazo só corre das 6h às 9h e das 16h às 22h.',
    ],
    'en' => [
        'title' => 'Choose your guide',
        'lead' => 'These guides agreed to be chosen. Pick who will guide the tour.',
        'button' => 'Choose this guide',
        'gone' => 'This link is no longer available.',
        'done' => 'Guide chosen. You will get the confirmation on WhatsApp.',
        'late' => 'The time ran out. The highest guide on the list was assigned.',
        'deadline' => 'Choose by',
        'clock' => 'This time runs only from 6:00 to 9:00 and from 16:00 to 22:00.',
    ],
    'es' => [
        'title' => 'Elige a tu guía',
        'lead' => 'Estos guías aceptaron participar. Elige quién va a guiar el paseo.',
        'button' => 'Elegir a este guía',
        'gone' => 'Este enlace ya no está disponible.',
        'done' => 'Guía elegido. Recibes la confirmación por WhatsApp.',
        'late' => 'El plazo terminó. El guía mejor colocado de la lista quedó con el paseo.',
        'deadline' => 'Elige hasta',
        'clock' => 'Ese plazo solo corre de 6:00 a 9:00 y de 16:00 a 22:00.',
    ],
];
$t = $ui[$lang];

function gcv_escolha_h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

$round = gcv_escolha_round_by_token($token);
$notice = '';
$guides = [];
$when = '';
$title = '';
$open = false;

if (!$round) {
    $notice = $t['gone'];
} else {
    $excursionId = (int)$round['excursion_id'];
    $tour = gcv_substitution_load_excursion($excursionId) ?: [];
    $title = $tour ? gcv_ops_excursion_title($tour) : '';
    $when = $tour
        ? trim(gcv_ops_date_br((string)($tour['date_iso'] ?? '')) . ' às ' . substr((string)($tour['departure_time'] ?? ''), 0, 5))
        : '';
    $status = (string)($round['status'] ?? '');
    $expired = $status === 'open' && (string)($round['expires_at'] ?? '') <= gcv_ops_clock_now()->format('Y-m-d H:i:s');
    if ($expired) {
        gcv_escolha_expire_rounds(gcv_ops_clock_now());
        $round = gcv_escolha_round_by_token($token) ?: $round;
        $status = (string)($round['status'] ?? '');
        $notice = $t['late'];
    }
    if ($status === 'open' && $_SERVER['REQUEST_METHOD'] === 'POST') {
        $guideId = (int)($_POST['guide_id'] ?? 0);
        $allowed = [];
        foreach (gcv_escolha_candidates($excursionId) as $g) {
            $allowed[(int)$g['id']] = true;
        }
        if ($guideId > 0 && isset($allowed[$guideId])) {
            $out = gcv_escolha_assign($excursionId, $guideId, false);
            if (!empty($out['ok'])) {
                $notice = $t['done'];
                $status = 'chosen';
            } else {
                $notice = (string)($out['error'] ?? $t['gone']);
            }
        }
    }
    $open = $status === 'open' && $notice === '';
    if ($open) {
        $guides = gcv_escolha_candidates($excursionId);
        if (!$guides) {
            $open = false;
            $notice = $t['gone'];
        }
    } elseif ($notice === '' && $status === 'chosen') {
        $notice = $t['done'];
    } elseif ($notice === '') {
        $notice = $t['gone'];
    }
}

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="<?php echo gcv_escolha_h($lang); ?>">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?php echo gcv_escolha_h($t['title']); ?></title>
  <style>
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f6f3ee; color: #1c1917; }
    main { max-width: 640px; margin: 0 auto; padding: 28px 18px 48px; }
    h1 { font-size: 1.8rem; line-height: 1.15; margin: 0 0 8px; }
    p { line-height: 1.45; }
    .meta { color: #57534e; }
    .card { display: flex; gap: 14px; align-items: center; background: #fff; border: 1px solid #e7e5e4; border-radius: 16px; padding: 14px; margin: 12px 0; }
    img { width: 72px; height: 96px; object-fit: cover; border-radius: 10px; background: #e7e5e4; }
    button { background: #1c1917; color: #fff; border: 0; border-radius: 999px; padding: 10px 16px; font: inherit; cursor: pointer; }
    .note { background: #fff7ed; border: 1px solid #fdba74; border-radius: 12px; padding: 12px 14px; }
  </style>
</head>
<body>
<main>
  <h1><?php echo gcv_escolha_h($t['title']); ?></h1>
  <?php if ($title !== '') { ?><p class="meta"><?php echo gcv_escolha_h($title); ?><?php echo $when !== '' ? ' · ' . gcv_escolha_h($when) : ''; ?></p><?php } ?>
  <?php if ($notice !== '') { ?><p class="note"><?php echo gcv_escolha_h($notice); ?></p><?php } ?>
  <?php if ($open) { ?>
    <p><?php echo gcv_escolha_h($t['lead']); ?></p>
    <p class="meta"><?php echo gcv_escolha_h($t['deadline']); ?> <?php echo gcv_escolha_h(gcv_ops_clock_label_from_sql((string)($round['expires_at'] ?? ''))); ?>. <?php echo gcv_escolha_h($t['clock']); ?></p>
    <?php foreach ($guides as $g) {
        $foto = trim((string)($g['foto'] ?? ''));
        if ($foto !== '' && str_starts_with($foto, '/')) {
            $foto = 'https://www.guiachapadaveadeiros.com' . $foto;
        }
        ?>
      <form method="post" class="card">
        <input type="hidden" name="t" value="<?php echo gcv_escolha_h($token); ?>">
        <input type="hidden" name="lang" value="<?php echo gcv_escolha_h($lang); ?>">
        <input type="hidden" name="guide_id" value="<?php echo (int)$g['id']; ?>">
        <?php if ($foto !== '') { ?><img src="<?php echo gcv_escolha_h($foto); ?>" alt=""><?php } ?>
        <div>
          <strong><?php echo gcv_escolha_h((string)($g['nome'] ?? 'Guia')); ?></strong>
          <div style="margin-top:8px"><button type="submit"><?php echo gcv_escolha_h($t['button']); ?></button></div>
        </div>
      </form>
    <?php } ?>
  <?php } ?>
</main>
</body>
</html>
