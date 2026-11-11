<?php
/**
 * MCP streamable HTTP, sem sessão.
 * Ferramentas: listar_passeios, consultar_contato.
 */
declare(strict_types=1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Mcp-Session-Id, MCP-Protocol-Version');
header('Access-Control-Expose-Headers: Mcp-Session-Id');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    header('Allow: POST, OPTIONS');
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'name' => 'Guia Chapada Veadeiros',
        'version' => '1.0.0',
        'endpoint' => 'https://www.guiachapadaveadeiros.com/mcp',
        'error' => 'Use POST with JSON-RPC.',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    header('Allow: POST, OPTIONS');
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$decoded = json_decode($raw, true);
$batch = is_array($decoded) && ($decoded === [] || array_keys($decoded) === range(0, count($decoded) - 1));
$messages = $batch ? $decoded : (is_array($decoded) ? [$decoded] : []);

$responses = [];
$sawRequest = false;
foreach ($messages as $msg) {
    if (!is_array($msg)) {
        continue;
    }
    $id = $msg['id'] ?? null;
    $method = isset($msg['method']) ? (string) $msg['method'] : '';
    if ($id === null && $method !== '') {
        continue;
    }
    $sawRequest = true;
    $responses[] = gcv_mcp_dispatch($id, $method, is_array($msg['params'] ?? null) ? $msg['params'] : []);
}

header('Content-Type: application/json; charset=utf-8');
if (!$sawRequest) {
    http_response_code(202);
    exit;
}

echo json_encode($batch ? $responses : ($responses[0] ?? null), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

function gcv_mcp_dispatch($id, string $method, array $params): array
{
    if ($method === 'initialize') {
        $asked = isset($params['protocolVersion']) ? (string) $params['protocolVersion'] : '';
        $supported = ['2025-11-25', '2025-06-18', '2025-03-26'];
        $version = in_array($asked, $supported, true) ? $asked : '2025-11-25';
        return gcv_mcp_ok($id, [
            'protocolVersion' => $version,
            'capabilities' => ['tools' => ['listChanged' => false]],
            'serverInfo' => ['name' => 'guia-chapada-veadeiros', 'title' => 'Guia Chapada Veadeiros', 'version' => '1.0.0'],
            'instructions' => 'Passeios e contato do Guia Chapada Veadeiros. Use listar_passeios e consultar_contato.',
        ]);
    }
    if ($method === 'ping') {
        return gcv_mcp_ok($id, []);
    }
    if ($method === 'tools/list') {
        return gcv_mcp_ok($id, ['tools' => gcv_mcp_tools()]);
    }
    if ($method === 'tools/call') {
        $name = isset($params['name']) ? (string) $params['name'] : '';
        $args = is_array($params['arguments'] ?? null) ? $params['arguments'] : [];
        $text = gcv_mcp_call($name, $args);
        if ($text === null) {
            return gcv_mcp_ok($id, [
                'content' => [['type' => 'text', 'text' => 'Ferramenta desconhecida. Use listar_passeios ou consultar_contato.']],
                'isError' => true,
            ]);
        }
        return gcv_mcp_ok($id, [
            'content' => [['type' => 'text', 'text' => $text]],
            'isError' => false,
        ]);
    }
    return [
        'jsonrpc' => '2.0',
        'id' => $id,
        'error' => ['code' => -32601, 'message' => 'Method not found'],
    ];
}

function gcv_mcp_ok($id, array $result): array
{
    return ['jsonrpc' => '2.0', 'id' => $id, 'result' => $result];
}

function gcv_mcp_tools(): array
{
    return [
        [
            'name' => 'listar_passeios',
            'title' => 'Listar passeios',
            'description' => 'Lista os passeios mais pedidos na Chapada dos Veadeiros e o endereço para reservar com guia local.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => [
                    'interesse' => [
                        'type' => 'string',
                        'description' => 'Cachoeira, trilha, data ou tipo de passeio',
                    ],
                ],
            ],
        ],
        [
            'name' => 'consultar_contato',
            'title' => 'Consultar contato',
            'description' => 'Telefone, WhatsApp, e-mail e páginas de contato, sobre, privacidade e termos.',
            'inputSchema' => [
                'type' => 'object',
                'properties' => new stdClass(),
            ],
        ],
    ];
}

function gcv_mcp_call(string $name, array $args): ?string
{
    $origin = 'https://www.guiachapadaveadeiros.com';
    if ($name === 'consultar_contato') {
        return implode("\n", [
            'Guia Chapada Veadeiros',
            'WhatsApp e telefone: +55 62 98250-6891',
            'E-mail: contato@guiachapadaveadeiros.com',
            'Base: Alto Paraíso de Goiás, Chapada dos Veadeiros, Goiás, Brasil',
            'CNPJ 24.354.289/0001-05',
            'Contato: ' . $origin . '/contato.html',
            'Sobre: ' . $origin . '/sobre.html',
            'Privacidade: ' . $origin . '/privacidade.html',
            'Termos: ' . $origin . '/termos.html',
        ]);
    }
    if ($name === 'listar_passeios') {
        $interesse = isset($args['interesse']) ? gcv_mcp_plain((string) $args['interesse']) : '';
        $lines = [
            'Passeios com guia local na Chapada dos Veadeiros.',
            'Mais pedidos: Cataratas dos Couros, Vale da Lua, Cachoeira do Segredo, Santa Bárbara, Saltos do Rio Preto e Mirante da Janela.',
            'Reservar: ' . $origin . '/passeios.html',
            'Atrativos: ' . $origin . '/atrativos.html',
            'O preço de cada saída aparece na página do passeio, antes do pagamento, por Pix ou cartão.',
        ];
        if ($interesse !== '') {
            $lines[] = 'Interesse informado: ' . $interesse;
        }
        return implode("\n", $lines);
    }
    return null;
}

function gcv_mcp_plain(string $value): string
{
    $value = preg_replace('/[\x00-\x1F\x7F]/', ' ', $value) ?? '';
    $value = trim($value);
    if (strlen($value) > 240) {
        $value = substr($value, 0, 240);
    }
    return $value;
}
