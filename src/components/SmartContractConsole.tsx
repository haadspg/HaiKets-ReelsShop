import React, { useState } from 'react';
import { X, ShieldCheck, Terminal, Cpu, Play, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { TransactionRecord } from '../types.ts';

interface SmartContractConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  recentTransactions: TransactionRecord[];
}

export const SmartContractConsole: React.FC<SmartContractConsoleProps> = ({
  isOpen,
  onClose,
  recentTransactions,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'purchaseWithToken' | 'deductInventory' | 'verifySessionKey'>('purchaseWithToken');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSimulate = () => {
    setIsSimulating(true);
    setSimulationResult(null);

    setTimeout(() => {
      setIsSimulating(false);
      setSimulationResult(
        JSON.stringify(
          {
            status: '0x1 (SUCCESS)',
            contract: '0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781',
            gasUsed: '42,109 (Paymaster Sponsored)',
            effectiveGasPrice: '0.001 Gwei',
            eventsEmitted: [
              'InventoryUpdated(productId=prod-watch-01, newStock=13)',
              'TokenTransfer(from=0x8a92...4b3F, to=0x71C8...781, amount=180 USDC)',
              'AgentRewardMinted(to=0x8a92...4b3F, rewardTokens=9 SHOP)',
            ],
            stateDiff: {
              'ShopEscrow.inventory[1]': '-1 unit',
              'AgentWallet.sessionNonce': '+1',
            },
          },
          null,
          2
        )
      );
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                EVM Smart Contract & Scalable Web3 Pipeline
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Contract: 0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781 · Base L2 (84532)
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

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* ABI Function Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Smart Contract ABI Method to Inspect / Simulate:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedMethod('purchaseWithToken')}
                className={`p-3 rounded-xl border text-left text-xs font-mono transition-colors ${
                  selectedMethod === 'purchaseWithToken'
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">purchaseWithToken()</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Settles token buy & burns inventory
                </div>
              </button>

              <button
                onClick={() => setSelectedMethod('deductInventory')}
                className={`p-3 rounded-xl border text-left text-xs font-mono transition-colors ${
                  selectedMethod === 'deductInventory'
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">deductInventory()</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  Oracle inventory sync webhook
                </div>
              </button>

              <button
                onClick={() => setSelectedMethod('verifySessionKey')}
                className={`p-3 rounded-xl border text-left text-xs font-mono transition-colors ${
                  selectedMethod === 'verifySessionKey'
                    ? 'bg-blue-950/80 border-blue-500 text-blue-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="font-bold text-white">verifySessionKey()</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  ERC-4337 validation & bounds check
                </div>
              </button>
            </div>
          </div>

          {/* Method definition & simulation runner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                <Terminal className="w-4 h-4" />
                <span>
                  {selectedMethod === 'purchaseWithToken'
                    ? 'function purchaseWithToken(uint256 productId, uint256 qty, address token) external returns (bytes32 txHash)'
                    : selectedMethod === 'deductInventory'
                    ? 'function deductInventory(uint256 productId, uint256 delta) external onlyAdminOrAgent'
                    : 'function verifySessionKey(address signer, bytes calldata signature, uint256 spendValue) external view returns (bool)'}
                </span>
              </div>

              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>{isSimulating ? 'Simulating Call...' : 'Simulate Call'}</span>
              </button>
            </div>

            {simulationResult && (
              <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                {simulationResult}
              </pre>
            )}
          </div>

          {/* On-Chain Event Stream Log */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Recent On-Chain Contract Events:</span>
              <span className="text-[10px] font-mono text-emerald-400">SSE Live Stream Connected</span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recentTransactions.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-slate-300">
                      {tx.type === 'PURCHASE'
                        ? 'Event: TokenPurchaseConfirmed'
                        : tx.type === 'INVENTORY_SYNC'
                        ? 'Event: InventoryUpdated'
                        : 'Event: AllowanceApproved'}
                    </span>
                    <span className="text-slate-500 text-[10px]">{tx.hash.slice(0, 14)}...</span>
                  </div>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {tx.tokenAmount} {tx.tokenSymbol}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
