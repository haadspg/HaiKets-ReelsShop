import React, { useState } from 'react';
import { X, Database, RefreshCw, Activity, ArrowRightLeft, Radio, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';
import { ElectricSQLShape, OraclePriceFeed, CCIPMessageRecord } from '../types.ts';
import { SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';

interface ElectricSQLConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  shapes: ElectricSQLShape[];
  oracleFeeds: OraclePriceFeed[];
  ccipMessages: CCIPMessageRecord[];
  onTriggerSync: () => Promise<void>;
}

export const ElectricSQLConsole: React.FC<ElectricSQLConsoleProps> = ({
  isOpen,
  onClose,
  shapes,
  oracleFeeds,
  ccipMessages,
  onTriggerSync,
}) => {
  const [activeTab, setActiveTab] = useState<'shapes' | 'oracles' | 'ccip'>('shapes');
  const [isSyncing, setIsSyncing] = useState(false);

  if (!isOpen) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onTriggerSync();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">ElectricSQL Cloud & Oracle Pipeline</h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Reactive Shapes Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Bidirectional real-time on-chain finality sync across Base, OP Mainnet, & Polygon.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Force Sync</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('shapes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'shapes' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>ElectricSQL Shapes ({shapes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('oracles')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'oracles' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Chainlink Oracle Feeds ({oracleFeeds.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ccip')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeTab === 'ccip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Chainlink CCIP Routing ({ccipMessages.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: ElectricSQL Shapes */}
          {activeTab === 'shapes' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-xs">Replication Lag</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">~8ms</div>
                  <div className="text-[10px] text-slate-500">Sub-second on-chain sync</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-xs">DB Finality Protocol</div>
                  <div className="text-xl font-bold font-mono text-white mt-1">Postgres + L2</div>
                  <div className="text-[10px] text-slate-500">ElectricSQL Cloud Engine</div>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-slate-400 text-xs">Subscribed Clients</div>
                  <div className="text-xl font-bold font-mono text-blue-400 mt-1">Live Reactive</div>
                  <div className="text-[10px] text-slate-500">Reels & Admin Viewers</div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-300">Active Real-Time Shapes:</div>
                {shapes.map((shape) => (
                  <div
                    key={shape.tableName}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono text-xs"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span>{shape.tableName}</span>
                        <span className="text-[10px] text-slate-500 font-normal">
                          ({shape.recordCount} records)
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Op: <span className="text-blue-400">{shape.lastOperation}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <div className="text-slate-300">Block #{shape.lastSyncedBlock}</div>
                        <div className="text-[10px] text-emerald-400">{shape.syncLagMs}ms latency</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px]">
                        {shape.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: Chainlink Oracle Price Feeds */}
          {activeTab === 'oracles' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                HaiKets relies on Chainlink Decentralized Oracle Networks to maintain accurate, tamper-proof pricing for tokenized catalog products, NFT authenticity certificates, and USDq conversions.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {oracleFeeds.map((feed) => (
                  <div
                    key={feed.pair}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-white text-sm">{feed.pair}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                        {feed.source}
                      </span>
                    </div>

                    <div className="my-2 flex items-baseline justify-between">
                      <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                        ${feed.price.toLocaleString(undefined, { minimumFractionDigits: feed.price < 10 ? 3 : 2 })}
                      </span>
                      <span
                        className={`text-xs font-mono font-semibold ${
                          feed.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {feed.change24h >= 0 ? '+' : ''}
                        {feed.change24h}% (24h)
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span>Heartbeat: {feed.heartbeatSec}s</span>
                      <span>Updated {feed.lastUpdated}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Chainlink CCIP Routing */}
          {activeTab === 'ccip' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                <strong>Chainlink CCIP Lanes Active:</strong> USDq payments automatically route across Base (8453), OP Mainnet (10), and Polygon (137). Users on Polygon can pay for goods listed on Base with instant cross-chain settlement.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.values(SUPPORTED_CHAINS_CONFIG).map((chain) => (
                  <div key={chain.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 font-bold text-white mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: chain.iconColor }}
                      />
                      <span>{chain.name}</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate mt-1">
                      Router: {chain.ccipRouterAddress.slice(0, 10)}...
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      USDq: {chain.usdqContractAddress.slice(0, 10)}...
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2.5 mt-4">
                <div className="text-xs font-semibold text-slate-300">Recent CCIP Routed Messages:</div>
                {ccipMessages.map((msg) => (
                  <div
                    key={msg.messageId}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-blue-400 font-bold uppercase">{msg.sourceChain}</span>
                        <span className="text-slate-500">──CCIP──▶</span>
                        <span className="text-emerald-400 font-bold uppercase">{msg.destinationChain}</span>
                        <span className="text-[10px] text-slate-500">({msg.timestamp})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate max-w-sm">
                        Msg ID: {msg.messageId}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-emerald-400">
                        {msg.tokenAmount} {msg.tokenSymbol}
                      </div>
                      <div className="text-[10px] text-slate-500">Gasless Paymaster Sponsored</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
