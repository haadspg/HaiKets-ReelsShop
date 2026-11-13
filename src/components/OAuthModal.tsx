import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Key, Zap, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { User, AgentWallet } from '../types.ts';

interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  wallet: AgentWallet;
  onAgenticLogin: (email: string, name: string) => Promise<void>;
  onToggleRole: () => void;
}

export const OAuthModal: React.FC<OAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  wallet,
  onAgenticLogin,
  onToggleRole,
}) => {
  const [emailInput, setEmailInput] = useState(currentUser.email);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [isInitializing, setIsInitializing] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleInstantConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitializing(true);
    try {
      await onAgenticLogin(emailInput, nameInput);
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1200);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Automated Backroom Agentic Authentication</h2>
              <p className="text-xs text-slate-400">Turnkey & Privy Zero-Friction Enclave Pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enclave Status Strip */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/60"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="font-semibold text-white text-sm flex items-center gap-2">
                <span>{currentUser.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Enclave Active
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                <span>Role: <strong className="text-amber-400">{currentUser.role}</strong></span>
                <span>·</span>
                <button
                  onClick={onToggleRole}
                  className="text-blue-400 hover:underline font-medium"
                >
                  Switch to {currentUser.role === 'ADMIN' ? 'SHOPPER' : 'ADMIN'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Backroom Provisioning Architecture Explainer */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Zero-Popup Automated Agentic Flow</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Unlike traditional OAuth redirects that get blocked in iframes or mobile browsers, the HaiKets backroom engine provisions a secure Turnkey MPC enclave wallet in sub-400ms:
            </p>
            <ul className="space-y-1 text-[11px] font-mono text-slate-300">
              <li>✓ Instant Smart Account (ERC-4337) on Base, OP, and Polygon</li>
              <li>✓ 24-hour cryptographic session keys pre-authorized</li>
              <li>✓ Paymaster gas sponsorship (100% free transactions)</li>
            </ul>
          </div>

          <form onSubmit={handleInstantConnect} className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Email / Social ID</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isInitializing}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isInitializing
                  ? 'Provisioning Backroom Enclave...'
                  : 'Initialize Turnkey / Privy Enclave Session'}
              </span>
            </button>
          </form>

          {successNotice && (
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-center text-xs animate-fade-in">
              Enclave session active! Ready for 1-tap USDq purchases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
