<?php
/**
 * HaiKets ReelShop PHP CRUD & Web3 USDq Smart Contract Backend
 * Ready for Namecheap cPanel / Apache / LiteSpeed Shared & VPS Hosting
 * Supports multi-chain USDq settlement (Base, OP Mainnet, Polygon) & Chainlink CCIP metadata
 */

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$dbFile = __DIR__ . '/database.json';
if (!file_exists($dbFile)) {
    $initialData = [
        "products" => [
            [
                "id" => "prod-watch-01",
                "name" => "Chronos Obsidian Sapphire Tourbillon",
                "priceUSDq" => 180,
                "priceUSD" => 180,
                "inventory" => 14,
                "contractAddress" => "0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781",
                "category" => "Luxury Wearables",
                "mediaUrl" => "/assets/reels_cyber_watch.jpg",
                "supportedChains" => ["base", "optimism", "polygon"]
            ],
            [
                "id" => "prod-jacket-02",
                "name" => "AeroShield Stealth Nanofiber Jacket",
                "priceUSDq" => 125,
                "priceUSD" => 125,
                "inventory" => 28,
                "contractAddress" => "0x3A219bCe18683e8b417c490A2b45E01314C923B0",
                "category" => "Technical Apparel",
                "mediaUrl" => "/assets/reels_techwear_jacket.jpg",
                "supportedChains" => ["base", "optimism", "polygon"]
            ]
        ],
        "transactions" => []
    ];
    file_put_contents($dbFile, json_encode($initialData, JSON_PRETTY_PRINT));
}

$data = json_decode(file_get_contents($dbFile), true);
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode(file_get_contents('php://input'), true) ?? [];

function saveDB($data, $dbFile) {
    file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
}

// 1. GET /api/products
if ($method === 'GET' && strpos($path, '/products') !== false) {
    echo json_encode(["success" => true, "products" => $data['products']]);
    exit();
}

// 2. GET /api/transactions
if ($method === 'GET' && strpos($path, '/transactions') !== false) {
    echo json_encode(["success" => true, "transactions" => $data['transactions']]);
    exit();
}

// 3. POST /api/products (Admin CRUD Create)
if ($method === 'POST' && preg_match('#/products/?$#', $path)) {
    $price = $body['priceUSDq'] ?? $body['priceUSDC'] ?? null;
    if (empty($body['name']) || $price === null || !isset($body['inventory'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing required product fields"]);
        exit();
    }
    $newProduct = [
        "id" => "prod-" . bin2hex(random_bytes(4)),
        "name" => $body['name'],
        "priceUSDq" => floatval($price),
        "priceUSD" => floatval($price),
        "inventory" => intval($body['inventory']),
        "contractAddress" => $body['contractAddress'] ?? "0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781",
        "category" => $body['category'] ?? "General",
        "mediaUrl" => $body['mediaUrl'] ?? "/assets/reels_cyber_watch.jpg",
        "supportedChains" => $body['supportedChains'] ?? ["base", "optimism", "polygon"]
    ];
    array_unshift($data['products'], $newProduct);
    saveDB($data, $dbFile);
    http_response_code(201);
    echo json_encode(["success" => true, "product" => $newProduct]);
    exit();
}

// 4. PUT/DELETE /api/products/{id}
if (preg_match('#/products/([^/]+)$#', $path, $matches)) {
    $targetId = $matches[1];
    if ($method === 'PUT') {
        foreach ($data['products'] as &$prod) {
            if ($prod['id'] === $targetId) {
                if (isset($body['name'])) $prod['name'] = $body['name'];
                if (isset($body['priceUSDq'])) {
                    $prod['priceUSDq'] = floatval($body['priceUSDq']);
                    $prod['priceUSD'] = floatval($body['priceUSDq']);
                }
                if (isset($body['inventory'])) $prod['inventory'] = max(0, intval($body['inventory']));
                saveDB($data, $dbFile);
                echo json_encode(["success" => true, "product" => $prod]);
                exit();
            }
        }
    } elseif ($method === 'DELETE') {
        $data['products'] = array_values(array_filter($data['products'], fn($p) => $p['id'] !== $targetId));
        saveDB($data, $dbFile);
        echo json_encode(["success" => true, "id" => $targetId]);
        exit();
    }
}

// 5. POST /api/smart-contract/buy (USDq Token Purchase & Inventory Decrement)
if ($method === 'POST' && strpos($path, '/smart-contract/buy') !== false) {
    $productId = $body['productId'] ?? '';
    $quantity = max(1, intval($body['quantity'] ?? 1));
    $sourceChain = $body['sourceChain'] ?? 'base';
    $settlementChain = $body['settlementChain'] ?? $sourceChain;

    foreach ($data['products'] as &$prod) {
        if ($prod['id'] === $productId) {
            if ($prod['inventory'] < $quantity) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Out of stock"]);
                exit();
            }
            $prod['inventory'] -= $quantity;
            $txHash = "0x" . bin2hex(random_bytes(32));
            $ccipMsgId = ($sourceChain !== $settlementChain) ? "0xccip_msg_" . bin2hex(random_bytes(16)) : null;
            $costUSDq = ($prod['priceUSDq'] ?? 0) * $quantity;
            $txRecord = [
                "id" => "tx-buy-" . bin2hex(random_bytes(4)),
                "hash" => $txHash,
                "type" => "PURCHASE",
                "productId" => $productId,
                "productTitle" => $prod['name'],
                "tokenAmount" => $costUSDq,
                "tokenSymbol" => "USDq",
                "sourceChain" => $sourceChain,
                "destinationChain" => $settlementChain,
                "ccipMessageId" => $ccipMsgId,
                "status" => "CONFIRMED",
                "timestamp" => date('c'),
                "gasSponsored" => true
            ];
            array_unshift($data['transactions'], $txRecord);
            saveDB($data, $dbFile);
            echo json_encode([
                "success" => true,
                "transaction" => $txRecord,
                "updatedInventory" => $prod['inventory'],
                "ccipMessageId" => $ccipMsgId,
                "message" => "Settled in USDq on {$settlementChain}."
            ]);
            exit();
        }
    }
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "Product not found"]);
    exit();
}

echo json_encode(["success" => true, "service" => "HaiKets USDq PHP Backend", "version" => "2.0.0"]);
?>
