import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import SftpClient from 'ssh2-sftp-client';
import {
  INITIAL_PRODUCTS,
  INITIAL_WALLET,
  INITIAL_TRANSACTIONS,
  INITIAL_USER,
  INITIAL_REVIEWS,
  INITIAL_ELECTRICSQL_SHAPES,
  INITIAL_ORACLE_FEEDS,
  INITIAL_CCIP_MESSAGES,
  SUPPORTED_CHAINS_CONFIG,
} from './src/mockData.ts';
import {
  Product,
  AgentWallet,
  TransactionRecord,
  User,
  Review,
  ElectricSQLShape,
  OraclePriceFeed,
  CCIPMessageRecord,
  SupportedChain,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// In-memory data store with live state
let products: Product[] = [...INITIAL_PRODUCTS];
let wallet: AgentWallet = { ...INITIAL_WALLET };
let transactions: TransactionRecord[] = [...INITIAL_TRANSACTIONS];
let currentUser: User = { ...INITIAL_USER };
let reviews: Record<string, Review[]> = { ...INITIAL_REVIEWS };
let electricShapes: ElectricSQLShape[] = [...INITIAL_ELECTRICSQL_SHAPES];
let oracleFeeds: OraclePriceFeed[] = [...INITIAL_ORACLE_FEEDS];
let ccipMessages: CCIPMessageRecord[] = [...INITIAL_CCIP_MESSAGES];

// SSE Connected Clients
interface SSEClient {
  id: number;
  res: express.Response;
}
let sseClients: SSEClient[] = [];

const broadcastSSE = (eventType: string, payload: any) => {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.res.write(message);
    } catch {
      // client disconnected
    }
  });
};

// Helper: trigger ElectricSQL shape update
const updateElectricSQLShape = (tableName: string, operation: string) => {
  const shape = electricShapes.find((s) => s.tableName === tableName);
  if (shape) {
    shape.lastSyncedBlock += 1;
    shape.lastOperation = operation;
    shape.lastUpdated = 'Just now';
    shape.syncLagMs = Math.floor(6 + Math.random() * 8);
    broadcastSSE('ELECTRICSQL_SYNC', shape);
  }
};

// -------------------------------------------------------------
// Real-time SSE Stream
// -------------------------------------------------------------
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = Date.now();
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  res.write(
    `event: CONNECTED\ndata: ${JSON.stringify({
      status: 'connected',
      electricSQL: 'active_shape_stream',
      chainlinkFeeds: 'streaming',
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// -------------------------------------------------------------
// Turnkey / Privy Backroom Agentic Authentication (Zero-Friction)
// -------------------------------------------------------------
app.post('/api/auth/agentic-login', (req, res) => {
  const { email, name } = req.body;

  currentUser = {
    id: `usr-agent-${Date.now().toString(36)}`,
    name: name || 'Alex Rivera',
    email: email || 'truqaman@gmail.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    role: currentUser.role || 'SHOPPER',
    authProvider: 'PRIVY_TURNKEY_ENCLAVE',
    connectedAt: new Date().toISOString(),
    enclaveAddress: wallet.address,
  };

  wallet.isSessionKeyActive = true;
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  wallet.sessionKeyExpiresAt = tomorrow;

  updateElectricSQLShape('agentic_session_delegations', 'SESSION_KEY_GRANTED_24H');
  broadcastSSE('USER_UPDATED', currentUser);
  broadcastSSE('WALLET_UPDATED', { wallet });

  res.json({
    success: true,
    message: 'Turnkey/Privy enclave session initialized successfully in backroom.',
    user: currentUser,
    wallet,
  });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ success: true, user: currentUser });
});

app.post('/api/auth/switch-role', (req, res) => {
  currentUser.role = currentUser.role === 'ADMIN' ? 'SHOPPER' : 'ADMIN';
  broadcastSSE('USER_UPDATED', currentUser);
  res.json({ success: true, user: currentUser });
});

app.get('/api/auth/url', (req, res) => {
  const currentAppUrl = process.env.APP_URL || 'https://ais-dev-aiudyl6vmnae57abj6lltb-140407912395.europe-west2.run.app';
  const redirectUri = `${currentAppUrl}/auth/callback`;
  const internalOAuthUrl = `/auth/callback?code=agentic_privy_code_${Date.now()}`;
  res.json({ url: internalOAuthUrl });
});

app.get(['/auth/callback', '/auth/callback/'], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head><title>Authentication Successful</title></head>
      <body style="background:#090d16;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
        <div style="background:#131b2e;padding:24px;border-radius:12px;text-align:center;">
          <h3 style="color:#10b981;margin-top:0;">Authentication Successful!</h3>
          <p style="color:#94a3b8;font-size:14px;">Closing window...</p>
        </div>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', user: ${JSON.stringify(currentUser)} }, '*');
            setTimeout(() => window.close(), 400);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

// -------------------------------------------------------------
// Multi-Chain USDq Wallet & Chainlink CCIP Routing
// -------------------------------------------------------------
app.get('/api/wallet', (req, res) => {
  res.json({ success: true, wallet, chains: SUPPORTED_CHAINS_CONFIG });
});

app.post('/api/wallet/switch-chain', (req, res) => {
  const { network } = req.body;
  if (!['base', 'optimism', 'polygon'].includes(network)) {
    return res.status(400).json({ success: false, error: 'Invalid network' });
  }

  wallet.network = network as SupportedChain;
  wallet.chainId = SUPPORTED_CHAINS_CONFIG[network].chainId;

  updateElectricSQLShape('chainlink_ccip_lanes', `ACTIVE_CHAIN_SWITCH_${network.toUpperCase()}`);
  broadcastSSE('WALLET_UPDATED', { wallet });

  res.json({ success: true, wallet });
});

app.post('/api/wallet/faucet', (req, res) => {
  const activeChain = wallet.network;
  wallet.usdqBalances[activeChain] += 300;
  wallet.totalUSDqBalance =
    wallet.usdqBalances.base + wallet.usdqBalances.optimism + wallet.usdqBalances.polygon;
  wallet.shopTokenBalance += 250;

  const faucetTx: TransactionRecord = {
    id: `tx-faucet-${Date.now().toString(36)}`,
    hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    type: 'FAUCET',
    tokenAmount: 300,
    tokenSymbol: 'USDq',
    sourceChain: activeChain,
    status: 'CONFIRMED',
    timestamp: 'Just now',
    blockNumber: 18921410,
    gasSponsored: true,
    executor: 'USER',
  };
  transactions.unshift(faucetTx);

  updateElectricSQLShape('inventory_oracle_finality', 'FAUCET_CREDIT_USDq');
  broadcastSSE('WALLET_UPDATED', { wallet, transaction: faucetTx });
  res.json({ success: true, wallet, transaction: faucetTx });
});

app.post('/api/wallet/ccip-bridge', (req, res) => {
  const { sourceChain, destinationChain, amount } = req.body;
  const numAmount = Number(amount);

  if (!sourceChain || !destinationChain || !numAmount) {
    return res.status(400).json({ success: false, error: 'Invalid bridge parameters' });
  }

  if (wallet.usdqBalances[sourceChain as SupportedChain] < numAmount) {
    return res.status(400).json({ success: false, error: `Insufficient USDq on ${sourceChain}` });
  }

  // Deduct from source and credit destination
  wallet.usdqBalances[sourceChain as SupportedChain] -= numAmount;
  wallet.usdqBalances[destinationChain as SupportedChain] += numAmount;

  const msgId = `0xccip_msg_${Array.from({ length: 36 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

  const newCCIPMsg: CCIPMessageRecord = {
    messageId: msgId,
    sourceChain: sourceChain as SupportedChain,
    destinationChain: destinationChain as SupportedChain,
    tokenAmount: numAmount,
    tokenSymbol: 'USDq',
    status: 'FINALIZED',
    txHash,
    timestamp: 'Just now',
    gasSavedUSD: 3.85,
  };
  ccipMessages.unshift(newCCIPMsg);

  const bridgeTx: TransactionRecord = {
    id: `tx-ccip-${Date.now().toString(36)}`,
    hash: txHash,
    type: 'CCIP_CROSS_CHAIN',
    tokenAmount: numAmount,
    tokenSymbol: 'USDq',
    sourceChain: sourceChain as SupportedChain,
    destinationChain: destinationChain as SupportedChain,
    ccipMessageId: msgId,
    status: 'CONFIRMED',
    timestamp: 'Just now',
    blockNumber: 18921415,
    gasSponsored: true,
    executor: 'AUTONOMOUS_AGENT',
  };
  transactions.unshift(bridgeTx);

  updateElectricSQLShape('chainlink_ccip_lanes', `CCIP_LANE_ROUTED_${sourceChain}_TO_${destinationChain}`);
  broadcastSSE('CCIP_UPDATE', { message: newCCIPMsg, wallet });

  res.json({ success: true, message: newCCIPMsg, wallet });
});

app.get('/api/ccip/messages', (req, res) => {
  res.json({ success: true, messages: ccipMessages });
});

app.get('/api/transactions', (req, res) => {
  res.json({ success: true, transactions });
});

// -------------------------------------------------------------
// ElectricSQL Cloud Shapes & Real-Time Sync
// -------------------------------------------------------------
app.get('/api/electricsql/shapes', (req, res) => {
  res.json({ success: true, shapes: electricShapes });
});

app.post('/api/electricsql/sync', (req, res) => {
  electricShapes = electricShapes.map((s) => ({
    ...s,
    lastSyncedBlock: s.lastSyncedBlock + 1,
    syncLagMs: Math.floor(4 + Math.random() * 6),
    lastUpdated: 'Just now',
  }));
  broadcastSSE('ELECTRICSQL_FULL_SYNC', electricShapes);
  res.json({ success: true, shapes: electricShapes });
});

// -------------------------------------------------------------
// Chainlink Oracle Feeds
// -------------------------------------------------------------
app.get('/api/oracle/feeds', (req, res) => {
  // Add micro-fluctuation to live price feeds for realistic oracle updates
  oracleFeeds = oracleFeeds.map((feed) => {
    if (feed.pair === 'USDq / USD') return feed;
    const delta = (Math.random() - 0.49) * 0.002 * feed.price;
    return {
      ...feed,
      price: Number((feed.price + delta).toFixed(3)),
      lastUpdated: 'Just now',
    };
  });
  res.json({ success: true, feeds: oracleFeeds });
});

// -------------------------------------------------------------
// Products CRUD Endpoints (ElectricSQL Synced)
// -------------------------------------------------------------
app.get('/api/products', (req, res) => {
  res.json({ success: true, products });
});

app.get('/api/products/:id', (req, res) => {
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, product });
});

app.post('/api/products', (req, res) => {
  const {
    name,
    tagline,
    description,
    category,
    priceUSDq,
    priceETH,
    inventory,
    mediaUrl,
    creatorHandle,
    creatorName,
    contractAddress,
    tags,
    supportedChains,
  } = req.body;

  if (!name || inventory === undefined || !priceUSDq) {
    return res.status(400).json({ success: false, error: 'Missing required product fields' });
  }

  const numUSDq = Number(priceUSDq);
  const newProduct: Product = {
    id: `prod-${Date.now().toString(36)}`,
    name,
    tagline: tagline || `${category || 'Luxury Goods'} · USDq Settlement · Base/OP/Polygon`,
    description: description || 'Next-generation tokenized product with on-chain provenance.',
    category: category || 'Collectibles',
    priceUSDq: numUSDq,
    priceETH: Number(priceETH) || Number((numUSDq * 0.00031).toFixed(4)),
    priceUSD: numUSDq,
    inventory: Number(inventory),
    initialStock: Number(inventory),
    mediaUrl: mediaUrl || '/src/assets/images/reels_cyber_watch_1793613626518.jpg',
    creatorHandle: creatorHandle || '@verified_seller',
    creatorName: creatorName || 'Decentralized Merchant',
    creatorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    likesCount: 0,
    isLiked: false,
    contractAddress: contractAddress || '0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781',
    tokenId: `#${Math.floor(1000 + Math.random() * 9000)}`,
    tags: Array.isArray(tags) ? tags : ['USDq Native', 'ElectricSQL', 'Chainlink CCIP'],
    reviewsCount: 0,
    rating: 5.0,
    createdAt: new Date().toISOString(),
    supportedChains: supportedChains || ['base', 'optimism', 'polygon'],
  };

  products.unshift(newProduct);
  updateElectricSQLShape('haikets_products_catalog', 'INSERT_PRODUCT_CATALOG');
  broadcastSSE('PRODUCT_CREATED', newProduct);
  res.status(201).json({ success: true, product: newProduct });
});

app.put('/api/products/:id', (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const updated: Product = {
    ...products[index],
    ...req.body,
    id: products[index].id,
  };

  products[index] = updated;
  updateElectricSQLShape('haikets_products_catalog', 'UPDATE_PRODUCT_METADATA');
  broadcastSSE('PRODUCT_UPDATED', updated);
  res.json({ success: true, product: updated });
});

app.delete('/api/products/:id', (req, res) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const deleted = products.splice(index, 1)[0];
  updateElectricSQLShape('haikets_products_catalog', 'DELETE_PRODUCT_RECORD');
  broadcastSSE('PRODUCT_DELETED', { id: deleted.id });
  res.json({ success: true, message: 'Product deleted', id: deleted.id });
});

app.post('/api/products/:id/adjust-inventory', (req, res) => {
  const { delta, exact } = req.body;
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  if (exact !== undefined) {
    product.inventory = Math.max(0, Number(exact));
  } else if (delta !== undefined) {
    product.inventory = Math.max(0, product.inventory + Number(delta));
  }

  const syncTx: TransactionRecord = {
    id: `tx-sync-${Date.now().toString(36)}`,
    hash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
    type: 'INVENTORY_SYNC',
    productId: product.id,
    productTitle: product.name,
    tokenAmount: product.inventory,
    tokenSymbol: 'USDq',
    status: 'CONFIRMED',
    timestamp: 'Just now',
    blockNumber: 18921420,
    gasSponsored: true,
    executor: 'AUTONOMOUS_AGENT',
  };
  transactions.unshift(syncTx);

  updateElectricSQLShape('inventory_oracle_finality', `STOCK_ADJUSTMENT_${product.id}_${product.inventory}`);
  broadcastSSE('INVENTORY_CHANGED', {
    productId: product.id,
    inventory: product.inventory,
    transaction: syncTx,
  });

  res.json({ success: true, product, transaction: syncTx });
});

// -------------------------------------------------------------
// Reviews & Comments
// -------------------------------------------------------------
app.get('/api/products/:id/reviews', (req, res) => {
  const prodReviews = reviews[req.params.id] || [];
  res.json({ success: true, reviews: prodReviews });
});

app.post('/api/products/:id/reviews', (req, res) => {
  const { comment, rating } = req.body;
  if (!comment) {
    return res.status(400).json({ success: false, error: 'Comment text is required' });
  }

  const newRev: Review = {
    id: `rev-${Date.now().toString(36)}`,
    productId: req.params.id,
    author: currentUser.name,
    avatar: currentUser.avatar,
    comment,
    rating: Number(rating) || 5,
    timestamp: 'Just now',
    verifiedBuyer: true,
  };

  if (!reviews[req.params.id]) {
    reviews[req.params.id] = [];
  }
  reviews[req.params.id].unshift(newRev);

  const prod = products.find((p) => p.id === req.params.id);
  if (prod) {
    prod.reviewsCount += 1;
    broadcastSSE('REVIEW_ADDED', { productId: prod.id, review: newRev, reviewsCount: prod.reviewsCount });
  }

  res.status(201).json({ success: true, review: newRev });
});

// -------------------------------------------------------------
// Smart Contract USDq Purchase with Optional Chainlink CCIP Routing
// -------------------------------------------------------------
app.post('/api/smart-contract/buy', (req, res) => {
  const {
    productId,
    quantity = 1,
    settlementChain = wallet.network,
    sourceChain = wallet.network,
    isAgentExecution = true,
  } = req.body;

  const product = products.find((p) => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  if (product.inventory < quantity) {
    return res.status(400).json({ success: false, error: 'Insufficient stock available' });
  }

  const costUSDq = product.priceUSDq * quantity;

  // Check balance on sourceChain
  const availableUSDq = wallet.usdqBalances[sourceChain as SupportedChain] || 0;
  if (availableUSDq < costUSDq) {
    return res.status(400).json({
      success: false,
      error: `Insufficient USDq balance on ${sourceChain} (Have: ${availableUSDq} USDq, Need: ${costUSDq} USDq)`,
    });
  }

  // Deduct USDq from sourceChain
  wallet.usdqBalances[sourceChain as SupportedChain] -= costUSDq;
  wallet.totalUSDqBalance =
    wallet.usdqBalances.base + wallet.usdqBalances.optimism + wallet.usdqBalances.polygon;
  wallet.spentToday += costUSDq;

  // Decrement inventory
  product.inventory -= quantity;

  // Add 5% cashback rewards
  const rewardShopTokens = Math.max(5, Math.floor(costUSDq * 0.05));
  wallet.shopTokenBalance += rewardShopTokens;
  wallet.gasSavedUSD = Number((wallet.gasSavedUSD + 5.20).toFixed(2));

  const isCrossChain = sourceChain !== settlementChain;
  let ccipMsgId = '';

  if (isCrossChain) {
    ccipMsgId = `0xccip_msg_${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const ccipRecord: CCIPMessageRecord = {
      messageId: ccipMsgId,
      sourceChain: sourceChain as SupportedChain,
      destinationChain: settlementChain as SupportedChain,
      tokenAmount: costUSDq,
      tokenSymbol: 'USDq',
      status: 'FINALIZED',
      txHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
      timestamp: 'Just now',
      gasSavedUSD: 5.20,
    };
    ccipMessages.unshift(ccipRecord);
  }

  const txHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
  const buyTx: TransactionRecord = {
    id: `tx-buy-${Date.now().toString(36)}`,
    hash: txHash,
    type: 'PURCHASE',
    productId: product.id,
    productTitle: product.name,
    tokenAmount: costUSDq,
    tokenSymbol: 'USDq',
    sourceChain: sourceChain as SupportedChain,
    destinationChain: settlementChain as SupportedChain,
    ccipMessageId: isCrossChain ? ccipMsgId : undefined,
    status: 'CONFIRMED',
    timestamp: 'Just now',
    blockNumber: 18921430,
    gasSponsored: true,
    executor: isAgentExecution ? 'AUTONOMOUS_AGENT' : 'USER',
  };
  transactions.unshift(buyTx);

  // Update ElectricSQL Cloud on-chain finality shapes
  updateElectricSQLShape('inventory_oracle_finality', `PURCHASE_CONFIRMED_${product.id}_NEW_STOCK_${product.inventory}`);
  if (isCrossChain) {
    updateElectricSQLShape('chainlink_ccip_lanes', `CCIP_LANE_${sourceChain}_TO_${settlementChain}_FINALIZED`);
  }

  broadcastSSE('PURCHASE_COMPLETED', {
    productId: product.id,
    inventory: product.inventory,
    wallet,
    transaction: buyTx,
  });

  res.json({
    success: true,
    message: isCrossChain
      ? `Purchased with USDq routed from ${sourceChain} to ${settlementChain} via Chainlink CCIP`
      : `Purchased with native USDq on ${settlementChain}`,
    transaction: buyTx,
    updatedInventory: product.inventory,
    wallet,
    rewardTokens: rewardShopTokens,
    ccipMessageId: ccipMsgId || null,
  });
});

// -------------------------------------------------------------
// Interactive Export Templates (PHP, Vue, Vanilla) & Namecheap SFTP Deploy
// -------------------------------------------------------------
app.get('/api/export/php', (req, res) => {
  res.type('text/plain').send(PHP_BACKEND_CODE);
});

app.get('/api/deploy/namecheap/status', (req, res) => {
  const host = process.env.NAMECHEAP_HOST || '';
  const port = Number(process.env.NAMECHEAP_PORT || 21098);
  const username = process.env.NAMECHEAP_USER || '';
  const hasAuth = Boolean(process.env.NAMECHEAP_PASSWORD || process.env.NAMECHEAP_SSH_KEY);
  const remoteDir = process.env.NAMECHEAP_REMOTE_DIR || (username ? `/home/${username}/public_html` : '/public_html');
  const configured = Boolean(host && username && hasAuth);
  const hasDist = fs.existsSync(path.resolve(__dirname, 'dist'));

  res.json({
    success: true,
    configured,
    protocol: 'SFTP (SSH2)',
    host: host || null,
    port,
    remoteDir,
    hasDist,
  });
});

app.post('/api/deploy/namecheap', async (req, res) => {
  const host = process.env.NAMECHEAP_HOST;
  const port = Number(process.env.NAMECHEAP_PORT || 21098);
  const username = process.env.NAMECHEAP_USER;
  const password = process.env.NAMECHEAP_PASSWORD;
  const privateKeyEnv = process.env.NAMECHEAP_SSH_KEY;
  const remoteDir = process.env.NAMECHEAP_REMOTE_DIR || (username ? `/home/${username}/public_html` : '');

  if (!host || !username || (!password && !privateKeyEnv)) {
    return res.status(400).json({
      success: false,
      error:
        'Namecheap SFTP credentials are not configured in server secrets (NAMECHEAP_HOST, NAMECHEAP_USER, and NAMECHEAP_PASSWORD or NAMECHEAP_SSH_KEY).',
    });
  }

  const distDir = path.resolve(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    return res.status(400).json({
      success: false,
      error: 'Production dist/ directory not found. Run `npm run build` before deploying.',
    });
  }

  const sftp = new SftpClient();
  const connectConfig: Record<string, unknown> = {
    host,
    port,
    username,
    readyTimeout: 15000,
  };

  if (privateKeyEnv) {
    connectConfig.privateKey = fs.existsSync(privateKeyEnv)
      ? fs.readFileSync(privateKeyEnv, 'utf8')
      : privateKeyEnv.replace(/\\n/g, '\n');
  } else {
    connectConfig.password = password;
  }

  try {
    await sftp.connect(connectConfig);
    await sftp.uploadDir(distDir, remoteDir);

    const phpApiPath = path.resolve(__dirname, 'api.php');
    if (fs.existsSync(phpApiPath)) {
      await sftp.put(phpApiPath, `${remoteDir.replace(/\/$/, '')}/api.php`);
    }

    res.json({
      success: true,
      message: `Deployed production SPA and api.php to ${host}:${port} (${remoteDir}) via SFTP/SSH2.`,
    });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: err?.message || 'Failed to connect or upload via Namecheap SFTP/SSH2',
    });
  } finally {
    await sftp.end().catch(() => {});
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
const startServer = async () => {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`HaiKets ReelShop Web3 & ElectricSQL Server running at http://0.0.0.0:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

const PHP_BACKEND_CODE = `<?php
/**
 * HaiKets ReelShop PHP REST API & ElectricSQL Webhook Pipeline
 * Multi-chain USDq Settlement with Chainlink CCIP Routing
 */
header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$body = json_decode(file_get_contents('php://input'), true) ?? [];

if ($method === 'POST' && strpos($path, '/smart-contract/buy') !== false) {
    $productId = $body['productId'] ?? '';
    $sourceChain = $body['sourceChain'] ?? 'base';
    $settlementChain = $body['settlementChain'] ?? 'base';
    $quantity = intval($body['quantity'] ?? 1);
    
    $txHash = "0x" . bin2hex(random_bytes(32));
    $ccipMsgId = ($sourceChain !== $settlementChain) ? "0xccip_msg_" . bin2hex(random_bytes(16)) : null;
    
    echo json_encode([
        "success" => true,
        "token" => "USDq",
        "txHash" => $txHash,
        "ccipMessageId" => $ccipMsgId,
        "electricSqlSync" => "FINALIZED_ON_CHAIN",
        "message" => "USDq transaction settled across Chainlink CCIP routes."
    ]);
    exit();
}

echo json_encode(["service" => "HaiKets PHP USDq & ElectricSQL Engine", "version" => "2.0.0"]);
?>`;
