import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Film, Grid, Wallet, ShieldCheck, ShoppingBag, Code, Database, Globe, UserCheck, Key, Zap } from 'lucide-react';
import { User, AgentWallet, SupportedChain } from '../types.ts';
import { SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';

interface NavbarProps {
  currentView: 'reels' | 'catalog' | 'admin' | 'wallet' | 'architecture';
  onViewChange: (view: 'reels' | 'catalog' | 'admin' | 'wallet' | 'architecture') => void;
  cartCount: number;
  cartPopKey?: number;
  onOpenCart: () => void;
  user: User;
  wallet: AgentWallet;
  onOpenAuth: () => void;
  onOpenElectricSQL: () => void;
  onSwitchChain: (chain: SupportedChain) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  cartCount,
  cartPopKey = 0,
  onOpenCart,
  user,
  wallet,
  onOpenAuth,
  onOpenElectricSQL,
  onSwitchChain,
}) => {
  const activeChainConfig = SUPPORTED_CHAINS_CONFIG[wallet.network] || SUPPORTED_CHAINS_CONFIG.base;
  const [isCartPopping, setIsCartPopping] = useState(false);

  useEffect(() => {
    if (cartPopKey <= 0) return;
    setIsCartPopping(true);
    const timer = setTimeout(() => setIsCartPopping(false), 320);
    return () => clearTimeout(timer);
  }, [cartPopKey]);

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-6 px-6 py-3 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 text-slate-100">
      {/* Zone 1: Brand wordmark & Active Chain Switcher */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={() => onViewChange('reels')}
          className="text-lg font-bold tracking-tight text-white flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block shadow-sm shadow-blue-500/50" />
          <span>HaiKets</span>
        </button>

        {/* Chain Switcher Dropdown */}
        <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
          {(['base', 'optimism', 'polygon'] as SupportedChain[]).map((c) => {
            const cfg = SUPPORTED_CHAINS_CONFIG[c];
            const isActive = wallet.network === c;
            return (
              <button
                key={c}
                onClick={() => onSwitchChain(c)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center gap-1.5 transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
                title={`Switch to ${cfg.name}`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: cfg.iconColor }}
                />
                <span>{cfg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Zone 2: 4-5 concise single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onViewChange('reels')}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            currentView === 'reels' ? 'text-blue-400 font-semibold' : ''
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Reels Feed</span>
        </button>

        <button
          onClick={() => onViewChange('catalog')}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            currentView === 'catalog' ? 'text-blue-400 font-semibold' : ''
          }`}
        >
          <Grid className="w-4 h-4" />
          <span>Catalog</span>
        </button>

        <button
          onClick={() => onViewChange('wallet')}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            currentView === 'wallet' ? 'text-blue-400 font-semibold' : ''
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Agent Wallet</span>
          <span className="text-xs font-mono text-emerald-400 tabular-nums font-semibold">
            {wallet.totalUSDqBalance} USDq
          </span>
        </button>

        <button
          onClick={() => onViewChange('admin')}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            currentView === 'admin' ? 'text-blue-400 font-semibold' : ''
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Admin Studio</span>
          {user.role === 'ADMIN' && (
            <span className="text-[10px] tracking-wider uppercase font-semibold text-amber-400 px-1 rounded bg-amber-950/60 border border-amber-800">
              Admin
            </span>
          )}
        </button>

        <button
          onClick={() => onViewChange('architecture')}
          className={`flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 hover:text-white ${
            currentView === 'architecture' ? 'text-blue-400 font-semibold' : ''
          }`}
        >
          <Code className="w-4 h-4" />
          <span>PHP / Vue</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action area */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* ElectricSQL Cloud & Oracle Indicator */}
        <button
          onClick={onOpenElectricSQL}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
          title="ElectricSQL Cloud & Oracle Sync Status"
        >
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="hidden lg:inline text-[11px]">ElectricSQL</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* Bag / Cart Button with Framer Motion Pop */}
        <motion.button
          onClick={onOpenCart}
          animate={
            isCartPopping
              ? { scale: [1, 1.18, 0.95, 1] }
              : { scale: 1 }
          }
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          whileTap={{ scale: 0.92 }}
          className={`relative flex items-center justify-center w-9 h-9 rounded-lg bg-slate-900 border transition-colors cursor-pointer ${
            isCartPopping
              ? 'border-emerald-400/80 text-emerald-300 shadow-md shadow-emerald-500/20'
              : 'border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white'
          }`}
          aria-label="Shopping Bag"
        >
          <ShoppingBag className="w-4 h-4" />
          <AnimatePresence mode="popLayout">
            {cartCount > 0 && (
              <motion.span
                key={`cart-badge-${cartCount}-${cartPopKey}`}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1.35, 0.92, 1], opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-blue-600 rounded-full px-1 tabular-nums shadow-sm"
              >
                {cartCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Turnkey / Privy Enclave Identity Trigger */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
        >
          <img
            src={user.avatar}
            alt={user.name}
            className="w-5 h-5 rounded-full object-cover border border-emerald-500/80"
            referrerPolicy="no-referrer"
          />
          <span className="hidden sm:inline max-w-[85px] truncate">{user.name}</span>
          <Key className="w-3.5 h-3.5 text-blue-400" />
        </button>
      </div>
    </header>
  );
};
