import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, Zap, ShieldCheck, ShoppingBag, ArrowRightLeft } from 'lucide-react';
import { CartItem, AgentWallet, SupportedChain } from '../types.ts';
import { SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: (settlementChain: SupportedChain) => Promise<void>;
  wallet: AgentWallet;
  isCheckingOut: boolean;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onCheckout,
  wallet,
  isCheckingOut,
}) => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain>(wallet.network);

  if (!isOpen) return null;

  const totalUSDq = items.reduce((sum, item) => sum + item.product.priceUSDq * item.quantity, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const chainBalance = wallet.usdqBalances[selectedChain] || 0;
  const canAfford = chainBalance >= totalUSDq;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Your Shopping Bag</h2>
            <span className="text-xs font-mono text-slate-400">({totalItems} items)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 space-y-3">
              <ShoppingBag className="w-12 h-12 text-slate-700" />
              <p className="text-sm">Your bag is empty.</p>
              <p className="text-xs text-slate-500 max-w-[240px]">
                Browse the Reels feed and tap "Add to Bag" on products you love.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3"
              >
                <img
                  src={item.product.mediaUrl}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-lg object-cover bg-slate-950 shrink-0 border border-slate-800"
                  referrerPolicy="no-referrer"
                />

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-xs truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                    {item.product.priceUSDq} USDq (~${item.product.priceUSD})
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-mono px-2 text-white font-medium">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.inventory}
                        className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => onRemoveItem(item.product.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Checkout in USDq */}
        {items.length > 0 && (
          <div className="p-5 border-t border-slate-800 bg-slate-900/70 space-y-4">
            {/* Multi-Chain USDq Network Selector */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Settlement Network (USDq Stablecoin)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['base', 'optimism', 'polygon'] as SupportedChain[]).map((chain) => {
                  const cfg = SUPPORTED_CHAINS_CONFIG[chain];
                  const bal = wallet.usdqBalances[chain] || 0;
                  const isSelected = selectedChain === chain;

                  return (
                    <button
                      key={chain}
                      type="button"
                      onClick={() => setSelectedChain(chain)}
                      className={`p-2 rounded-xl border text-left text-xs font-mono transition-colors ${
                        isSelected
                          ? 'bg-blue-950/80 border-blue-500 text-white font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: cfg.iconColor }}
                        />
                        <span>{cfg.name}</span>
                      </div>
                      <div className="text-[10px] text-emerald-400 mt-1">{bal} USDq</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total and Gas Sponsorship Notice */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Subtotal ({totalItems} items)</span>
                <span className="font-mono text-white text-sm font-semibold">
                  {totalUSDq} USDq
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Network Gas (Paymaster)</span>
                </span>
                <span className="font-mono text-emerald-400 font-medium">Free ($0.00)</span>
              </div>
            </div>

            {/* Checkout Button */}
            <button
              disabled={isCheckingOut || !canAfford}
              onClick={() => onCheckout(selectedChain)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>
                {isCheckingOut
                  ? 'Settling on-chain...'
                  : !canAfford
                  ? `Insufficient USDq on ${selectedChain.toUpperCase()}`
                  : `1-Tap Pay ${totalUSDq} USDq (${selectedChain.toUpperCase()})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
