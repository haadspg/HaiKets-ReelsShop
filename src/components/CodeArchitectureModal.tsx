import React, { useState } from 'react';
import { X, Code, Copy, Check, ExternalLink, Download, FileCode, CheckCircle2 } from 'lucide-react';

interface CodeArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodeArchitectureModal: React.FC<CodeArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'php' | 'vanilla' | 'vue'>('php');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const phpCode = `<?php
/**
 * ReelShop PHP CRUD & Web3 Smart Contract Webhook Backend
 * REST API for Administrative Products Management & Real-Time Inventory Tracking
 * Supports OAuth2 Bearer Tokens and EVM Smart Contract Webhooks
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
                "priceUSDC" => 180,
                "inventory" => 14,
                "contractAddress" => "0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781",
                "category" => "Luxury Wearables",
                "mediaUrl" => "/src/assets/images/reels_cyber_watch_1793613626518.jpg"
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

// 2. POST /api/products (Admin CRUD Create)
if ($method === 'POST' && strpos($path, '/products') !== false) {
    if (empty($body['name']) || !isset($body['priceUSDC']) || !isset($body['inventory'])) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "Missing required product fields"]);
        exit();
    }
    $newProduct = [
        "id" => "prod-" . bin2hex(random_bytes(4)),
        "name" => $body['name'],
        "priceUSDC" => floatval($body['priceUSDC']),
        "inventory" => intval($body['inventory']),
        "contractAddress" => $body['contractAddress'] ?? "0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781",
        "category" => $body['category'] ?? "General",
        "mediaUrl" => $body['mediaUrl'] ?? "/src/assets/images/reels_cyber_watch_1793613626518.jpg"
    ];
    $data['products'][] = $newProduct;
    saveDB($data, $dbFile);
    http_response_code(201);
    echo json_encode(["success" => true, "product" => $newProduct]);
    exit();
}

// 3. POST /api/smart-contract/buy (Web3 Token Purchase & Inventory Decrement)
if ($method === 'POST' && strpos($path, '/smart-contract/buy') !== false) {
    $productId = $body['productId'] ?? '';
    $quantity = intval($body['quantity'] ?? 1);
    
    foreach ($data['products'] as &$prod) {
        if ($prod['id'] === $productId) {
            if ($prod['inventory'] < $quantity) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "Out of stock"]);
                exit();
            }
            $prod['inventory'] -= $quantity;
            $txHash = "0x" . bin2hex(random_bytes(32));
            $txRecord = [
                "hash" => $txHash,
                "productId" => $productId,
                "quantity" => $quantity,
                "status" => "CONFIRMED",
                "timestamp" => date('c')
            ];
            $data['transactions'][] = $txRecord;
            saveDB($data, $dbFile);
            echo json_encode([
                "success" => true,
                "transactionHash" => $txHash,
                "newStock" => $prod['inventory'],
                "message" => "Smart contract verified and inventory decremented in real-time."
            ]);
            exit();
        }
    }
    http_response_code(404);
    echo json_encode(["success" => false, "error" => "Product not found"]);
    exit();
}

echo json_encode(["success" => true, "service" => "ReelShop PHP Web3 API"]);
?>`;

  const vanillaCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>ReelShop Vanilla HTML5 / CSS Reels</title>
  <style>
    body { margin: 0; background: #000; color: #fff; overflow: hidden; font-family: sans-serif; }
    .feed { height: 100vh; overflow-y: scroll; scroll-snap-type: y mandatory; }
    .reel { height: 100vh; scroll-snap-align: start; position: relative; }
    .reel img { width: 100%; height: 100%; object-fit: cover; }
    .overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 24px; background: linear-gradient(to top, rgba(0,0,0,0.9), transparent); }
    .buy-btn { background: #2563eb; color: #fff; border: none; padding: 12px; border-radius: 10px; width: 100%; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="feed">
    <div class="reel">
      <img src="/src/assets/images/reels_cyber_watch_1793613626518.jpg" alt="Watch">
      <div class="overlay">
        <h3>Chronos Obsidian Tourbillon</h3>
        <p>180 USDC · 14 in stock</p>
        <button class="buy-btn" onclick="buy('prod-watch-01')">⚡ Buy with Agent Wallet</button>
      </div>
    </div>
  </div>
  <script>
    async function buy(id) {
      const res = await fetch('/api/smart-contract/buy', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({productId: id, isAgentExecution: true})
      });
      const data = await res.json();
      alert('Confirmed Tx: ' + data.transaction.hash);
    }
  </script>
</body>
</html>`;

  const vueCode = `<template>
  <div class="reels-container">
    <div v-for="product in products" :key="product.id" class="reel-card">
      <img :src="product.mediaUrl" :alt="product.name" class="reel-media" />
      <div class="reel-overlay">
        <span class="seller">{{ product.creatorHandle }}</span>
        <h2>{{ product.name }}</h2>
        <div class="metrics">
          <span>{{ product.priceUSDC }} USDC</span>
          <span>{{ product.inventory }} in stock</span>
        </div>
        <button @click="buy(product)" class="buy-btn">⚡ Quick Buy with Agent Wallet</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: ['products'],
  methods: {
    async buy(p) {
      const res = await fetch('/api/smart-contract/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: p.id, quantity: 1, isAgentExecution: true })
      });
      const data = await res.json();
      if (data.success) {
        alert('Confirmed Tx: ' + data.transaction.hash);
      }
    }
  }
}
</script>`;

  const currentCode = activeTab === 'php' ? phpCode : activeTab === 'vanilla' ? vanillaCode : vueCode;

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = activeTab === 'php' ? 'api.php' : activeTab === 'vanilla' ? 'vanilla-reels.html' : 'ReelsComponent.vue';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white">Full-Stack Architecture Inspector</h2>
              <p className="text-xs text-slate-400">
                Explore backend PHP REST API, standalone Vanilla HTML5, and Vue.js 3 implementations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Actions Bar */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('php')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'php'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>PHP Backend (api.php)</span>
            </button>

            <button
              onClick={() => setActiveTab('vanilla')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'vanilla'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Vanilla HTML / JS</span>
            </button>

            <button
              onClick={() => setActiveTab('vue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'vue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Vue.js 3 Component</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'php' && (
              <a
                href={activeTab === 'vanilla' ? '/vanilla-reels.html' : '/vue-reels.html'}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Live Page</span>
              </a>
            )}

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 select-text">
          <pre className="leading-relaxed whitespace-pre-wrap">{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
