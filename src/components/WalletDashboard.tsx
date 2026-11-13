import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Key,
  ArrowRightLeft,
  Fuel,
  Sparkles,
  RefreshCw,
  Layers,
  History,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  ShoppingBag,
  AlertCircle,
} from 'lucide-react';
import { AgentWallet, TransactionRecord, SupportedChain } from '../types.ts';
import { SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';

interface WalletDashboardProps {
  wallet: AgentWallet;
  transactions: TransactionRecord[];
  onClaimFaucet: () => Promise<boolean>;
  onBridgeUSDq: (sourceChain: SupportedChain, destinationChain: SupportedChain, amount: number) => Promise<boolean>;
  onRenewSessionKey: () => Promise<boolean>;
  onSwitchChain: (chain: SupportedChain) => void;
}

export const WalletDashboard: React.FC<WalletDashboardProps> = ({
  wallet,
  transactions,
  onClaimFaucet,
  onBridgeUSDq,
  onRenewSessionKey,
  onSwitchChain,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [copied, setCopied] = useState(false);
  const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isRenewing, setIsRenewing] = useState(false);
  const [isBridging, setIsBridging] = useState(false);

  // Purchase History fetched state
  const [fetchedTransactions, setFetchedTransactions] = useState<TransactionRecord[]>(transactions);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'purchases' | 'all'>('purchases');

  // CCIP Bridge Form state
  const [bridgeSource, setBridgeSource] = useState<SupportedChain>(wallet.network);
  const [bridgeDest, setBridgeDest] = useState<SupportedChain>(
    wallet.network === 'base' ? 'optimism' : 'base'
  );
  const [bridgeAmount, setBridgeAmount] = useState<number>(100);

  const fetchPurchaseHistory = useCallback(async () => {
    setIsLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch('/api/transactions');
      const ct = res.headers.get('content-type');
      if (!res.ok || !ct || !ct.includes('application/json')) {
        throw new Error('Unable to load on-chain transactions');
      }
      const data = await res.json();
      if (data?.success && Array.isArray(data.transactions)) {
        setFetchedTransactions(data.transactions);
      } else {
        throw new Error(data?.error || 'Unexpected response format');
      }
    } catch (err: any) {
      setHistoryError(err?.message || 'Failed to fetch on-chain purchase history');
      setFetchedTransactions(transactions);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [transactions]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchPurchaseHistory();
    }
  }, [activeTab, fetchPurchaseHistory]);

  // Keep live SSE transactions synced into fetched view
  useEffect(() => {
    setFetchedTransactions((prev) => {
      const byId = new Map<string, TransactionRecord>();
      transactions.forEach((tx) => byId.set(tx.id, tx));
      prev.forEach((tx) => {
        if (!byId.has(tx.id)) byId.set(tx.id, tx);
      });
      return Array.from(byId.values());
    });
  }, [transactions]);

  const copyTxHash = (id: string, hash: string) => {
    navigator.clipboard?.writeText(hash);
    setCopiedTxId(id);
    setTimeout(() => setCopiedTxId((curr) => (curr === id ? null : curr)), 1800);
  };

  const copyAddress = () => {
    navigator.clipboard?.writeText(wallet.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFaucet = async () => {
    setIsClaiming(true);
    try {
      await onClaimFaucet();
    } finally {
      setIsClaiming(false);
    }
  };

  const handleRenew = async () => {
    setIsRenewing(true);
    try {
      await onRenewSessionKey();
    } finally {
      setIsRenewing(false);
    }
  };

  const handleExecuteBridge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bridgeSource === bridgeDest || bridgeAmount <= 0) return;

    setIsBridging(true);
    try {
      await onBridgeUSDq(bridgeSource, bridgeDest, bridgeAmount);
    } finally {
      setIsBridging(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Title & Network Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Wallet className="w-6 h-6 text-blue-400" />
              <span>Turnkey / Privy Embedded Agent Wallet</span>
            </h1>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              USDq Default Settlement Asset
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Zero-friction backroom enclave wallet with multi-chain USDq accounts on Base, OP Mainnet, and Polygon connected via Chainlink CCIP.
          </p>
        </div>

        {/* Claim Testnet USDq Faucet Button */}
        <button
          onClick={handleFaucet}
          disabled={isClaiming}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-900/30 disabled:opacity-50 shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{isClaiming ? 'Funding...' : `Claim +300 USDq (${wallet.network.toUpperCase()})`}</span>
        </button>
      </div>

      {/* Dashboard Tab Switcher */}
      {(() => {
        const completedPurchasesCount = fetchedTransactions.filter(
          (tx) => tx.type === 'PURCHASE' && tx.status === 'CONFIRMED'
        ).length;

        return (
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Wallet & CCIP Overview</span>
              </button>

              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Purchase History</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums ${
                    activeTab === 'history'
                      ? 'bg-blue-500/40 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {completedPurchasesCount}
                </span>
              </button>
            </div>

            {activeTab === 'history' && (
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                  <button
                    onClick={() => setHistoryFilter('purchases')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      historyFilter === 'purchases'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Completed Purchases
                  </button>
                  <button
                    onClick={() => setHistoryFilter('all')}
                    className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      historyFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All On-Chain Tx
                  </button>
                </div>

                <button
                  onClick={fetchPurchaseHistory}
                  disabled={isLoadingHistory}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin text-blue-400' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {activeTab === 'history' ? (
        (() => {
          const completedTransactions = fetchedTransactions.filter((tx) => {
            if (tx.status !== 'CONFIRMED') return false;
            return historyFilter === 'purchases' ? tx.type === 'PURCHASE' : true;
          });
          const purchaseTransactions = fetchedTransactions.filter(
            (tx) => tx.type === 'PURCHASE' && tx.status === 'CONFIRMED'
          );
          const totalSpentUSDq = purchaseTransactions.reduce((sum, tx) => sum + tx.tokenAmount, 0);

          const renderStatusBadge = (status: TransactionRecord['status']) => {
            if (status === 'CONFIRMED') {
              return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/70 border border-emerald-800/80 text-emerald-300 text-[11px] font-medium whitespace-nowrap">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Confirmed</span>
                </span>
              );
            }
            if (status === 'PENDING') {
              return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-950/70 border border-amber-800/80 text-amber-300 text-[11px] font-medium whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Pending</span>
                </span>
              );
            }
            return (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-950/70 border border-rose-800/80 text-rose-300 text-[11px] font-medium whitespace-nowrap">
                <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Reverted</span>
              </span>
            );
          };

          return (
            <div className="space-y-6">
              {/* Purchase History Summary Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Completed Purchases</div>
                  <div className="text-2xl font-bold font-mono text-white tabular-nums">
                    {purchaseTransactions.length}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Verified on-chain order settlements
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Total Settled Volume</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                    {totalSpentUSDq.toLocaleString()} USDq
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Across Base, OP Mainnet & Polygon
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
                  <div className="text-xs text-slate-400 mb-1">Paymaster Sponsorship</div>
                  <div className="text-2xl font-bold font-mono text-blue-400 tabular-nums">
                    100% Gasless
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    ${wallet.gasSavedUSD} total network fees saved
                  </div>
                </div>
              </div>

              {/* Error banner if fetch failed */}
              {historyError && (
                <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-center justify-between gap-4 text-xs text-rose-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{historyError}</span>
                  </div>
                  <button
                    onClick={fetchPurchaseHistory}
                    className="px-3 py-1 rounded-lg bg-rose-900/70 hover:bg-rose-800 text-white font-medium cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Transactions List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4 text-blue-400" />
                    <h2 className="text-base font-semibold text-white">
                      {historyFilter === 'purchases'
                        ? 'Completed On-Chain Purchases'
                        : 'All Completed On-Chain Transactions'}
                    </h2>
                  </div>
                  <span className="text-xs font-mono text-slate-400 tabular-nums">
                    {completedTransactions.length} confirmed records
                  </span>
                </div>

                {isLoadingHistory ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
                    <span className="text-xs font-mono">Fetching finalized on-chain records...</span>
                  </div>
                ) : completedTransactions.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-slate-400 gap-2">
                    <History className="w-10 h-10 text-slate-700" />
                    <p className="text-sm font-medium text-slate-300">No completed purchase transactions yet</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Complete a 1-tap USDq purchase from the Reels Feed or Catalog to see your finalized on-chain receipt here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {completedTransactions.map((tx) => {
                      const destChain = tx.destinationChain || tx.sourceChain || wallet.network;
                      const chainCfg = SUPPORTED_CHAINS_CONFIG[destChain] || SUPPORTED_CHAINS_CONFIG.base;
                      const explorerUrl = `${chainCfg.blockExplorerUrl}/tx/${tx.hash}`;

                      return (
                        <div
                          key={tx.id}
                          className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                              {renderStatusBadge(tx.status)}
                              <span className="text-sm font-semibold text-white truncate">
                                {tx.type === 'PURCHASE'
                                  ? tx.productTitle || 'USDq Product Purchase'
                                  : tx.type === 'CCIP_CROSS_CHAIN'
                                  ? `CCIP Bridge (${tx.sourceChain?.toUpperCase()} -> ${tx.destinationChain?.toUpperCase()})`
                                  : tx.type === 'INVENTORY_SYNC'
                                  ? `ElectricSQL Sync: ${tx.productTitle || tx.productId}`
                                  : 'USDq Faucet Mint'}
                              </span>
                              <span className="text-xs text-slate-400">
                                · {tx.executor === 'AUTONOMOUS_AGENT' ? 'Agent Enclave' : 'Direct Wallet'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-slate-400">
                              <span className="inline-flex items-center gap-1.5 text-slate-300">
                                <span
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: chainCfg.iconColor }}
                                />
                                {chainCfg.name}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="text-blue-400">
                                {tx.hash.slice(0, 12)}...{tx.hash.slice(-6)}
                              </span>
                              <button
                                onClick={() => copyTxHash(tx.id, tx.hash)}
                                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Copy transaction hash"
                                aria-label="Copy transaction hash"
                              >
                                {copiedTxId === tx.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <a
                                href={explorerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-slate-400 hover:text-blue-400 transition-colors"
                                title={`View on ${chainCfg.name} explorer`}
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              <span aria-hidden="true">·</span>
                              <span className="tabular-nums">Block #{tx.blockNumber}</span>
                              <span aria-hidden="true">·</span>
                              <span>{tx.timestamp}</span>
                              {tx.ccipMessageId && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-amber-400">CCIP Verified</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex md:flex-col items-center md:items-end justify-between gap-1 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800/80">
                            <div
                              className={`text-base font-bold font-mono tabular-nums ${
                                tx.type === 'PURCHASE' ? 'text-white' : 'text-emerald-400'
                              }`}
                            >
                              {tx.type === 'PURCHASE' ? '-' : '+'}
                              {tx.tokenAmount} {tx.tokenSymbol}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400">
                              {tx.gasSponsored ? 'Gas Sponsored ($0.00)' : 'Standard Gas'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })()
      ) : (
        <>

      {/* Top 3 Metric Surface Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {/* Card 1: Enclave Address & Session Keys */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Privy / Turnkey Enclave</span>
              <span className="text-[11px] font-mono text-blue-400">ERC-4337 Smart Account</span>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 mb-3">
              <span className="text-xs font-mono text-slate-200 truncate">
                {wallet.address}
              </span>
              <button
                onClick={copyAddress}
                className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
                title="Copy Address"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <Key className="w-3.5 h-3.5 text-emerald-400" />
              <span>Session Key:</span>
              <span className="text-emerald-400 font-medium">Valid (24h)</span>
            </div>
            <button
              onClick={handleRenew}
              disabled={isRenewing}
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRenewing ? 'animate-spin' : ''}`} />
              <span>Renew</span>
            </button>
          </div>
        </div>

        {/* Card 2: Total Aggregate USDq Balances */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Total Multi-Chain USDq</span>
            <span className="text-emerald-400 text-xs font-semibold">$1.00 Pegged</span>
          </div>

          <div className="my-2">
            <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
              {wallet.totalUSDqBalance.toLocaleString()} USDq
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Available instantly for 1-tap reels purchases
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span>Rewards: {wallet.shopTokenBalance} $SHOP</span>
            <span className="text-blue-400">5% Cashback</span>
          </div>
        </div>

        {/* Card 3: Paymaster Gas Sponsorship */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Paymaster Gas Sponsorship</span>
            <Fuel className="w-4 h-4 text-emerald-400" />
          </div>

          <div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums">
              ${wallet.gasSavedUSD}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Total network gas fees sponsored across all 3 chains
            </div>
          </div>

          <div className="mt-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-300">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Zero gas fees required for USDq buys or CCIP routing</span>
          </div>
        </div>
      </div>

      {/* Multi-Chain Breakdown Strip */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl">
        <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Multi-Chain USDq Liquidity Distribution</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['base', 'optimism', 'polygon'] as SupportedChain[]).map((c) => {
            const cfg = SUPPORTED_CHAINS_CONFIG[c];
            const bal = wallet.usdqBalances[c] || 0;
            const isCurrent = wallet.network === c;

            return (
              <div
                key={c}
                className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-950 border-blue-500 shadow-md shadow-blue-900/20'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: cfg.iconColor }}
                    />
                    <span className="font-bold text-white text-sm">{cfg.name}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                      Active
                    </span>
                  )}
                </div>

                <div className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                  {bal} USDq
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-1 truncate">
                  Contract: {cfg.usdqContractAddress.slice(0, 14)}...
                </div>

                {!isCurrent && (
                  <button
                    onClick={() => onSwitchChain(c)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                  >
                    Set as Active Chain
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Chainlink CCIP Bridge Simulator + Transaction Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Chainlink CCIP Cross-Chain Bridge Router (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            <h2 className="text-base font-semibold text-white">
              Chainlink CCIP Cross-Chain USDq Router
            </h2>
          </div>

          <form onSubmit={handleExecuteBridge} className="space-y-4 text-xs">
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Route USDq across Base, OP Mainnet, and Polygon using decentralized Chainlink CCIP message passing with guaranteed finality.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Source Chain
                </label>
                <select
                  value={bridgeSource}
                  onChange={(e) => setBridgeSource(e.target.value as SupportedChain)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="base">Base L2</option>
                  <option value="optimism">OP Mainnet</option>
                  <option value="polygon">Polygon PoS</option>
                </select>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Available: {wallet.usdqBalances[bridgeSource]} USDq
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Destination Chain
                </label>
                <select
                  value={bridgeDest}
                  onChange={(e) => setBridgeDest(e.target.value as SupportedChain)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                >
                  <option value="base">Base L2</option>
                  <option value="optimism">OP Mainnet</option>
                  <option value="polygon">Polygon PoS</option>
                </select>
                <div className="text-[10px] text-slate-500 font-mono mt-1">
                  Available: {wallet.usdqBalances[bridgeDest]} USDq
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Amount to Route (USDq)
              </label>
              <input
                type="number"
                min="10"
                max={wallet.usdqBalances[bridgeSource] || 1000}
                value={bridgeAmount}
                onChange={(e) => setBridgeAmount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px] text-slate-400">
              <div className="flex items-center justify-between">
                <span>CCIP Route Fee:</span>
                <span className="text-emerald-400 font-mono font-medium">Free (Sponsored)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Execution Time:</span>
                <span className="text-slate-300 font-mono">Instant (Enclave Pre-Signed)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isBridging || bridgeSource === bridgeDest || wallet.usdqBalances[bridgeSource] < bridgeAmount}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {isBridging ? 'Routing via CCIP...' : `Execute Cross-Chain Route (${bridgeAmount} USDq)`}
              </span>
            </button>
          </form>
        </div>

        {/* Right: Real-time Transaction Ledger (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h2 className="text-base font-semibold text-white">
              On-Chain Activity & Finality Ledger
            </h2>
            <span className="text-xs text-slate-400 font-mono">
              ElectricSQL Live Stream
            </span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[460px] space-y-3 pr-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-colors flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white">
                      {tx.type === 'PURCHASE'
                        ? tx.productTitle || 'USDq Purchase'
                        : tx.type === 'CCIP_CROSS_CHAIN'
                        ? `CCIP: ${tx.sourceChain?.toUpperCase()} ──▶ ${tx.destinationChain?.toUpperCase()}`
                        : tx.type === 'INVENTORY_SYNC'
                        ? `ElectricSQL Sync: ${tx.productTitle}`
                        : 'Faucet USDq Funding'}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                      {tx.executor === 'AUTONOMOUS_AGENT' ? 'Agent 🤖' : 'User'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 mt-0.5">
                    <span className="text-blue-400">
                      {tx.hash.slice(0, 10)}...{tx.hash.slice(-4)}
                    </span>
                    {tx.ccipMessageId && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400">CCIP Msg</span>
                      </>
                    )}
                    <span>·</span>
                    <span>Block #{tx.blockNumber}</span>
                    <span>·</span>
                    <span>{tx.timestamp}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-sm font-bold font-mono text-emerald-400 tabular-nums">
                    {tx.type === 'PURCHASE' ? '-' : '+'}
                    {tx.tokenAmount} {tx.tokenSymbol}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {tx.gasSponsored ? 'Gas: Sponsored' : 'Gas: Paid'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
