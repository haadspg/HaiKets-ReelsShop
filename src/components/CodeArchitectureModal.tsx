import React, { useState, useEffect } from 'react';
import { X, Code, Copy, Check, ExternalLink, Download, FileCode, Server, UploadCloud, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CodeArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NamecheapStatus {
  configured: boolean;
  protocol: string;
  host: string | null;
  port: number;
  remoteDir: string;
  hasDist: boolean;
}

export const CodeArchitectureModal: React.FC<CodeArchitectureModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'php' | 'vanilla' | 'vue' | 'namecheap'>('php');
  const [copied, setCopied] = useState(false);
  const [ncStatus, setNcStatus] = useState<NamecheapStatus | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployFeedback, setDeployFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const loadNamecheapStatus = async () => {
    try {
      const res = await fetch('/api/deploy/namecheap/status');
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct || !ct.includes('application/json')) return;
      const data = await res.json();
      if (data?.success) setNcStatus(data);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === 'namecheap') {
      loadNamecheapStatus();
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const phpCode = `<?php
/**
 * HaiKets ReelShop PHP CRUD & Web3 USDq Smart Contract Backend
 * Ready for Namecheap cPanel / Apache / LiteSpeed Shared & VPS Hosting
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
    file_put_contents($dbFile, json_encode(["products" => [], "transactions" => []], JSON_PRETTY_PRINT));
}

$data = json_decode(file_get_contents($dbFile), true);
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($method === 'GET' && strpos($path, '/products') !== false) {
    echo json_encode(["success" => true, "products" => $data['products']]);
    exit();
}

if ($method === 'POST' && strpos($path, '/smart-contract/buy') !== false) {
    $productId = $body['productId'] ?? '';
    $quantity = max(1, intval($body['quantity'] ?? 1));
    foreach ($data['products'] as &$prod) {
        if ($prod['id'] === $productId && $prod['inventory'] >= $quantity) {
            $prod['inventory'] -= $quantity;
            $txHash = "0x" . bin2hex(random_bytes(32));
            file_put_contents($dbFile, json_encode($data, JSON_PRETTY_PRINT));
            echo json_encode(["success" => true, "transactionHash" => $txHash, "newStock" => $prod['inventory']]);
            exit();
        }
    }
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "Product unavailable"]);
    exit();
}
?>`;

  const vanillaCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>HaiKets Vanilla HTML5 / CSS Reels</title>
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
        <p>180 USDq · 14 in stock</p>
        <button class="buy-btn" onclick="buy('prod-watch-01')">⚡ Buy with USDq Agent Wallet</button>
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
      console.log('Confirmed Tx:', data.transaction?.hash);
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
          <span>{{ product.priceUSDq }} USDq</span>
          <span>{{ product.inventory }} in stock</span>
        </div>
        <button @click="buy(product)" class="buy-btn">⚡ Quick Buy with USDq</button>
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
        console.log('Confirmed Tx:', data.transaction?.hash);
      }
    }
  }
}
</script>`;

  const namecheapSnippet = `# 1. Fastest Connection Protocol: SFTP over SSH2
#    - Namecheap Shared Hosting SSH/SFTP Port: 21098
#    - Namecheap VPS / Dedicated Server Port:  22
#
# 2. Configure Server Secrets (in AI Studio Secrets panel or .env):
#    NAMECHEAP_HOST="server123.web-hosting.com"
#    NAMECHEAP_PORT="21098"
#    NAMECHEAP_USER="your_cpanel_username"
#    NAMECHEAP_PASSWORD="your_cpanel_password"   # or NAMECHEAP_SSH_KEY="-----BEGIN OPENSSH PRIVATE KEY-----..."
#    NAMECHEAP_REMOTE_DIR="/home/your_cpanel_username/public_html"
#
# 3. Build & Sync via SFTP:
#    npm run build && npx tsx scripts/deploy-namecheap.ts
#
# Included Apache/LiteSpeed public/.htaccess rules:
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^api(/.*)?$ /api.php [L,QSA]
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]
  RewriteRule ^ /index.html [L]
</IfModule>`;

  const currentCode =
    activeTab === 'php'
      ? phpCode
      : activeTab === 'vanilla'
      ? vanillaCode
      : activeTab === 'vue'
      ? vueCode
      : namecheapSnippet;

  const handleCopy = () => {
    navigator.clipboard?.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename =
      activeTab === 'php'
        ? 'api.php'
        : activeTab === 'vanilla'
        ? 'vanilla-reels.html'
        : activeTab === 'vue'
        ? 'ReelsComponent.vue'
        : 'namecheap-deploy.txt';
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeployNow = async () => {
    setIsDeploying(true);
    setDeployFeedback(null);
    try {
      const res = await fetch('/api/deploy/namecheap', { method: 'POST' });
      const data = await res.json();
      setDeployFeedback({
        ok: Boolean(data.success),
        text: data.success ? data.message : data.error || 'Deployment failed',
      });
    } catch {
      setDeployFeedback({ ok: false, text: 'Network error while reaching deployment endpoint' });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-white">Full-Stack Architecture & Live Hosting</h2>
              <p className="text-xs text-slate-400">
                Explore PHP REST API, Vanilla HTML5, Vue 3, and Namecheap SFTP/SSH2 deployment.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs & Actions Bar */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('php')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'php'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>PHP Backend</span>
            </button>

            <button
              onClick={() => setActiveTab('vanilla')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'vanilla'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Vanilla HTML</span>
            </button>

            <button
              onClick={() => setActiveTab('vue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'vue'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>Vue.js 3</span>
            </button>

            <button
              onClick={() => setActiveTab('namecheap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'namecheap'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              <Server className="w-3.5 h-3.5" />
              <span>Namecheap SFTP/SSH</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(activeTab === 'vanilla' || activeTab === 'vue') && (
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
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>

            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>

        {/* Namecheap Server Status & Trigger Panel */}
        {activeTab === 'namecheap' && (
          <div className="px-5 py-4 bg-slate-900/95 border-b border-slate-800 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                {ncStatus?.configured ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-white">
                    {ncStatus?.configured
                      ? `Connected target: ${ncStatus.host}:${ncStatus.port} -> ${ncStatus.remoteDir}`
                      : 'Server Secrets Not Configured Yet'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {ncStatus?.configured
                      ? `Protocol: ${ncStatus.protocol} · Bundle ready: ${ncStatus.hasDist ? 'Yes (dist/)' : 'Run npm run build first'}`
                      : 'Add NAMECHEAP_HOST, NAMECHEAP_PORT (21098), NAMECHEAP_USER, and NAMECHEAP_PASSWORD or NAMECHEAP_SSH_KEY in Secrets.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadNamecheapStatus}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Check Env</span>
                </button>
                <button
                  onClick={handleDeployNow}
                  disabled={!ncStatus?.configured || isDeploying}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isDeploying ? 'Uploading via SFTP...' : 'Deploy via SFTP'}</span>
                </button>
              </div>
            </div>

            {deployFeedback && (
              <div
                className={`px-3 py-2 rounded-lg text-xs border ${
                  deployFeedback.ok
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-800 text-rose-300'
                }`}
              >
                {deployFeedback.text}
              </div>
            )}
          </div>
        )}

        {/* Code Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 select-text">
          <pre className="leading-relaxed whitespace-pre-wrap">{currentCode}</pre>
        </div>
      </div>
    </div>
  );
};
