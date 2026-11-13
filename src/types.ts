export type SupportedChain = 'base' | 'optimism' | 'polygon';

export interface ChainConfig {
  id: SupportedChain;
  name: string;
  chainId: number;
  iconColor: string;
  nativeCurrency: string;
  ccipRouterAddress: string;
  usdqContractAddress: string;
  blockExplorerUrl: string;
}

export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  priceUSDq: number; // HaiKets default stablecoin ($1.00 USD)
  priceETH: number;
  priceUSD: number;
  inventory: number;
  initialStock: number;
  mediaUrl: string;
  creatorHandle: string;
  creatorName: string;
  creatorAvatar: string;
  likesCount: number;
  isLiked: boolean;
  contractAddress: string;
  tokenId: string;
  tags: string[];
  reviewsCount: number;
  rating: number;
  createdAt: string;
  supportedChains: SupportedChain[];
}

export interface Review {
  id: string;
  productId: string;
  author: string;
  avatar: string;
  comment: string;
  rating: number;
  timestamp: string;
  verifiedBuyer: boolean;
}

export interface MultiChainBalances {
  base: number;
  optimism: number;
  polygon: number;
}

export interface AgentWallet {
  address: string;
  network: SupportedChain;
  chainId: number;
  usdqBalances: MultiChainBalances; // USDq on Base, OP, Polygon
  totalUSDqBalance: number;
  ethBalance: number;
  shopTokenBalance: number;
  sessionKeyExpiresAt: string;
  isSessionKeyActive: boolean;
  dailySpendLimit: number;
  spentToday: number;
  singleTxAllowance: number;
  autoBuyLowStock: boolean;
  autoBuyThreshold: number;
  paymasterSponsoredGas: boolean;
  gasSavedUSD: number;
  authProviderType: 'PRIVY_TURNKEY_ENCLAVE' | 'SOCIAL_BACKROOM';
  enclaveId: string;
}

export interface CCIPMessageRecord {
  messageId: string;
  sourceChain: SupportedChain;
  destinationChain: SupportedChain;
  tokenAmount: number;
  tokenSymbol: string;
  status: 'IN_FLIGHT' | 'SUCCESS' | 'FINALIZED';
  txHash: string;
  timestamp: string;
  gasSavedUSD: number;
}

export interface TransactionRecord {
  id: string;
  hash: string;
  type: 'PURCHASE' | 'ALLOWANCE_APPROVAL' | 'FAUCET' | 'INVENTORY_SYNC' | 'CCIP_CROSS_CHAIN' | 'SESSION_KEY_RENEW';
  productId?: string;
  productTitle?: string;
  tokenAmount: number;
  tokenSymbol: 'USDq' | 'ETH' | 'SHOP' | 'POL';
  sourceChain?: SupportedChain;
  destinationChain?: SupportedChain;
  ccipMessageId?: string;
  status: 'CONFIRMED' | 'PENDING' | 'REVERTED';
  timestamp: string;
  blockNumber: number;
  gasSponsored: boolean;
  executor: 'USER' | 'AUTONOMOUS_AGENT';
}

export interface ElectricSQLShape {
  tableName: string;
  recordCount: number;
  lastSyncedBlock: number;
  syncLagMs: number;
  status: 'SYNCHRONIZED' | 'STREAMING';
  lastOperation: string;
  lastUpdated: string;
}

export interface OraclePriceFeed {
  pair: string;
  price: number;
  change24h: number;
  heartbeatSec: number;
  lastUpdated: string;
  source: 'Chainlink Data Feeds';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'ADMIN' | 'SHOPPER';
  authProvider: 'PRIVY_TURNKEY_ENCLAVE' | 'OAUTH2_GOOGLE' | 'DEMO';
  connectedAt: string;
  enclaveAddress: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  settlementChain: SupportedChain;
}
