import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Zap, Sparkles, LogOut } from 'lucide-react';
import { User, AgentWallet } from '../types.ts';

interface OAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  wallet: AgentWallet;
  onAgenticLogin: (email: string, name: string) => Promise<void>;
  onGoogleSignIn?: () => Promise<void>;
  onFirebaseSignOut?: () => Promise<void>;
  isFirebaseSignedIn?: boolean;
  onToggleRole: () => void;
}

export const OAuthModal: React.FC<OAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAgenticLogin,
  onGoogleSignIn,
  onFirebaseSignOut,
  isFirebaseSignedIn = false,
  onToggleRole,
}) => {
  const [emailInput, setEmailInput] = useState(currentUser.email);
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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

  const handleGoogleConnect = async () => {
    if (!onGoogleSignIn) return;
    setIsGoogleLoading(true);
    try {
      await onGoogleSignIn();
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
        onClose();
      }, 1000);
    } finally {
      setIsGoogleLoading(false);
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
              <h2 className="text-base font-bold text-white">Account & Agentic Enclave Auth</h2>
              <p className="text-xs text-slate-400">Firebase Google Auth & Turnkey / Privy Enclave</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Enclave Status Strip */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/60 shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="min-w-0">
              <div className="font-semibold text-white text-sm flex items-center gap-2 flex-wrap">
                <span className="truncate">{currentUser.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> {isFirebaseSignedIn ? 'Google Verified' : 'Enclave Active'}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{currentUser.email}</div>
              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                <span>Role: <strong className="text-amber-400">{currentUser.role}</strong></span>
                <span>·</span>
                <button
                  onClick={onToggleRole}
                  className="text-blue-400 hover:underline font-medium cursor-pointer"
                >
                  Switch to {currentUser.role === 'ADMIN' ? 'SHOPPER' : 'ADMIN'}
                </button>
              </div>
            </div>
          </div>

          {isFirebaseSignedIn && onFirebaseSignOut && (
            <button
              onClick={onFirebaseSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
              title="Sign out of Google account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Google Sign-In Primary Cloud Persistence Action */}
        {onGoogleSignIn && !isFirebaseSignedIn && (
          <button
            type="button"
            onClick={handleGoogleConnect}
            disabled={isGoogleLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google (Cloud Sync)'}</span>
          </button>
        )}

        {/* Backroom Provisioning Architecture Explainer */}
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-2 text-xs text-slate-300 leading-relaxed">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Zero-Popup Automated Agentic Flow</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Sign in with Google for persistent cloud wallet & order sync, or initialize a Turnkey MPC enclave session in sub-400ms:
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-[0.98] transition-all cursor-pointer"
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
              Session active! Ready for 1-tap USDq purchases.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
