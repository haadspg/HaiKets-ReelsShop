import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import {
  syncFirebaseUserAndWallet,
  subscribeToFirestoreProducts,
  subscribeToUserWallet,
  subscribeToUserTransactions,
  persistWalletState,
  persistTransaction,
  persistProductCreate,
  persistProductUpdate,
  persistProductDelete,
  persistProductInventory,
} from './lib/firestoreStore.ts';
import { Navbar } from './components/Navbar.tsx';
import { ReelsFeed } from './components/ReelsFeed.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { WalletDashboard } from './components/WalletDashboard.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { CommentsDrawer } from './components/CommentsDrawer.tsx';
import { OAuthModal } from './components/OAuthModal.tsx';
import { CodeArchitectureModal } from './components/CodeArchitectureModal.tsx';
import { ElectricSQLConsole } from './components/ElectricSQLConsole.tsx';
import {
  Product,
  AgentWallet,
  TransactionRecord,
  User,
  CartItem,
  SupportedChain,
  ElectricSQLShape,
  OraclePriceFeed,
  CCIPMessageRecord,
} from './types.ts';
import {
  INITIAL_PRODUCTS,
  INITIAL_WALLET,
  INITIAL_TRANSACTIONS,
  INITIAL_USER,
  INITIAL_ELECTRICSQL_SHAPES,
  INITIAL_ORACLE_FEEDS,
  INITIAL_CCIP_MESSAGES,
} from './mockData.ts';
import { soundController } from './audio.ts';
import { CheckCircle2, AlertTriangle, Film, Search, Database } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<'reels' | 'catalog' | 'admin' | 'wallet' | 'architecture'>('reels');
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [wallet, setWallet] = useState<AgentWallet>(INITIAL_WALLET);
  const [transactions, setTransactions] = useState<TransactionRecord[]>(INITIAL_TRANSACTIONS);
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [electricShapes, setElectricShapes] = useState<ElectricSQLShape[]>(INITIAL_ELECTRICSQL_SHAPES);
  const [oracleFeeds, setOracleFeeds] = useState<OraclePriceFeed[]>(INITIAL_ORACLE_FEEDS);
  const [ccipMessages, setCcipMessages] = useState<CCIPMessageRecord[]>(INITIAL_CCIP_MESSAGES);

  // Modals & Drawers state
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isElectricSQLOpen, setIsElectricSQLOpen] = useState(false);
  const [isArchitectureOpen, setIsArchitectureOpen] = useState(false);
  const [activeReviewsProduct, setActiveReviewsProduct] = useState<Product | null>(null);

  // Operation states
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [cartPopKey, setCartPopKey] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [toast, setToast] = useState<{ title: string; subtitle?: string; type?: 'success' | 'info' | 'error' } | null>(null);

  // Catalog search & category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const showToast = (title: string, subtitle?: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ title, subtitle, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Initial load from backend API
  useEffect(() => {
    const safeFetchJson = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const ct = res.headers.get('content-type');
        if (!ct || !ct.includes('application/json')) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    safeFetchJson('/api/products').then((data) => data?.success && setProducts(data.products));
    safeFetchJson('/api/wallet').then((data) => data?.success && setWallet(data.wallet));
    safeFetchJson('/api/transactions').then((data) => data?.success && setTransactions(data.transactions));
    safeFetchJson('/api/electricsql/shapes').then((data) => data?.success && setElectricShapes(data.shapes));
    safeFetchJson('/api/oracle/feeds').then((data) => data?.success && setOracleFeeds(data.feeds));
    safeFetchJson('/api/ccip/messages').then((data) => data?.success && setCcipMessages(data.messages));
  }, []);

  // Firebase Auth & Firestore Real-Time Sync
  useEffect(() => {
    let unsubWallet: (() => void) | undefined;
    let unsubTx: (() => void) | undefined;
    let unsubProducts: (() => void) | undefined;

    try {
      unsubProducts = subscribeToFirestoreProducts((fsProducts) => {
        if (fsProducts.length > 0) {
          setProducts(fsProducts);
        }
      });
    } catch (err) {
      console.warn('Firestore products subscription warning:', err);
    }

    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      unsubWallet?.();
      unsubTx?.();

      if (fbUser && fbUser.emailVerified) {
        try {
          const synced = await syncFirebaseUserAndWallet(fbUser, INITIAL_WALLET);
          setUser(synced.user);
          setWallet(synced.wallet);

          unsubWallet = subscribeToUserWallet(fbUser.uid, synced.wallet, (w) => {
            setWallet(w);
          });
          unsubTx = subscribeToUserTransactions(fbUser.uid, (txs) => {
            if (txs.length > 0) {
              setTransactions(txs);
            }
          });
        } catch (err) {
          console.warn('Firestore user sync warning:', err);
        }
      }
    });

    return () => {
      unsubAuth();
      unsubWallet?.();
      unsubTx?.();
      unsubProducts?.();
    };
  }, []);

  // Server-Sent Events (SSE) for Real-Time Asset, ElectricSQL & Inventory Updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.addEventListener('INVENTORY_CHANGED', (e: MessageEvent) => {
        const payload = JSON.parse(e.data);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.productId ? { ...p, inventory: payload.inventory } : p))
        );
        if (payload.transaction) {
          setTransactions((prev) => [payload.transaction, ...prev]);
        }
      });

      eventSource.addEventListener('ELECTRICSQL_SYNC', (e: MessageEvent) => {
        const shape = JSON.parse(e.data);
        setElectricShapes((prev) =>
          prev.map((s) => (s.tableName === shape.tableName ? shape : s))
        );
      });

      eventSource.addEventListener('ELECTRICSQL_FULL_SYNC', (e: MessageEvent) => {
        const shapes = JSON.parse(e.data);
        setElectricShapes(shapes);
      });

      eventSource.addEventListener('CCIP_UPDATE', (e: MessageEvent) => {
        const { message, wallet: updatedWallet } = JSON.parse(e.data);
        if (message) setCcipMessages((prev) => [message, ...prev]);
        if (updatedWallet) setWallet(updatedWallet);
      });

      eventSource.addEventListener('PRODUCT_CREATED', (e: MessageEvent) => {
        const newProduct = JSON.parse(e.data);
        setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
      });

      eventSource.addEventListener('PRODUCT_UPDATED', (e: MessageEvent) => {
        const updated = JSON.parse(e.data);
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      });

      eventSource.addEventListener('PRODUCT_DELETED', (e: MessageEvent) => {
        const { id } = JSON.parse(e.data);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      });

      eventSource.addEventListener('PURCHASE_COMPLETED', (e: MessageEvent) => {
        const payload = JSON.parse(e.data);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.productId ? { ...p, inventory: payload.inventory } : p))
        );
        if (payload.wallet) {
          setWallet(payload.wallet);
        }
        if (payload.transaction) {
          setTransactions((prev) => [payload.transaction, ...prev]);
        }
      });

      eventSource.addEventListener('WALLET_UPDATED', (e: MessageEvent) => {
        const payload = JSON.parse(e.data);
        if (payload.wallet) {
          setWallet(payload.wallet);
        }
        if (payload.transaction) {
          setTransactions((prev) => [payload.transaction, ...prev]);
        }
      });

      eventSource.addEventListener('REVIEW_ADDED', (e: MessageEvent) => {
        const payload = JSON.parse(e.data);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === payload.productId ? { ...p, reviewsCount: payload.reviewsCount } : p
          )
        );
      });

      eventSource.addEventListener('USER_UPDATED', (e: MessageEvent) => {
        const updatedUser = JSON.parse(e.data);
        setUser(updatedUser);
      });
    } catch (err) {
      console.warn('SSE connection warning:', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // 1-Tap Quick Buy in USDq with optional Chainlink CCIP cross-chain routing
  const handleQuickBuy = async (product: Product, sourceChain: SupportedChain = wallet.network) => {
    setIsPurchasing(true);
    try {
      const res = await fetch('/api/smart-contract/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
          settlementChain: wallet.network,
          sourceChain,
          isAgentExecution: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified) {
          if (data.wallet) persistWalletState(firebaseUser.uid, data.wallet).catch(console.warn);
          if (data.transaction) persistTransaction(firebaseUser.uid, data.transaction).catch(console.warn);
          if (typeof data.updatedInventory === 'number') {
            persistProductInventory(product.id, data.updatedInventory).catch(console.warn);
          }
        }
        soundController.playSuccessChime();
        showToast(
          `1-Tap Buy Confirmed: ${product.name}`,
          data.message + ` · Tx: ${data.transaction.hash.slice(0, 14)}... · +${data.rewardTokens} $SHOP Earned!`
        );
      } else {
        showToast('Purchase Failed', data.error || 'Smart contract rejected transaction', 'error');
      }
    } catch {
      showToast('Network Error', 'Failed to communicate with Web3 node', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  // Add to Bag
  const handleAddToCart = (product: Product) => {
    soundController.playLikePop();
    setCartPopKey((k) => k + 1);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.inventory) }
            : item
        );
      }
      return [...prev, { product, quantity: 1, settlementChain: wallet.network }];
    });
    showToast('Added to Bag', `${product.name} ready in your shopping bag.`);
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity } : item))
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCartCheckout = async (settlementChain: SupportedChain) => {
    setIsPurchasing(true);
    try {
      for (const item of cart) {
        const res = await fetch('/api/smart-contract/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.product.id,
            quantity: item.quantity,
            settlementChain,
            sourceChain: settlementChain,
            isAgentExecution: true,
          }),
        });
        const data = await res.json();
        if (data?.success && firebaseUser?.emailVerified) {
          if (data.wallet) persistWalletState(firebaseUser.uid, data.wallet).catch(console.warn);
          if (data.transaction) persistTransaction(firebaseUser.uid, data.transaction).catch(console.warn);
          if (typeof data.updatedInventory === 'number') {
            persistProductInventory(item.product.id, data.updatedInventory).catch(console.warn);
          }
        }
      }
      soundController.playSuccessChime();
      setCart([]);
      setIsCartOpen(false);
      showToast(
        'Checkout Complete via Smart Contract',
        `All items settled in USDq on ${settlementChain.toUpperCase()} with 100% sponsored gas.`
      );
    } catch {
      showToast('Checkout Failed', 'Failed to execute smart contract transaction', 'error');
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleToggleLike = (productId: string) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          return {
            ...p,
            isLiked: !p.isLiked,
            likesCount: p.isLiked ? p.likesCount - 1 : p.likesCount + 1,
          };
        }
        return p;
      })
    );
  };

  // Backroom Agentic Turnkey/Privy Login
  const handleAgenticLogin = async (email: string, name: string) => {
    try {
      const res = await fetch('/api/auth/agentic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        if (data.wallet) setWallet(data.wallet);
        soundController.playSuccessChime();
        showToast('Enclave Initialized', 'Turnkey / Privy session active with delegable USDq spend keys.');
      }
    } catch {
      showToast('Auth Error', 'Failed to initialize backroom enclave', 'error');
    }
  };

  // Firebase Google Sign-In
  const handleGoogleSignIn = async () => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      if (cred.user) {
        soundController.playSuccessChime();
        showToast('Google Account Connected', 'Firebase Authentication & Firestore cloud sync active.');
      }
    } catch {
      showToast('Sign-In Cancelled', 'Could not complete Google authentication', 'error');
    }
  };

  const handleFirebaseSignOut = async () => {
    try {
      await signOut(auth);
      setUser(INITIAL_USER);
      showToast('Signed Out', 'Switched back to local demo enclave session.', 'info');
    } catch {
      showToast('Sign-Out Error', 'Failed to sign out cleanly', 'error');
    }
  };

  // Switch Active Blockchain Network
  const handleSwitchChain = async (network: SupportedChain) => {
    try {
      const res = await fetch('/api/wallet/switch-chain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ network }),
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.wallet);
        if (firebaseUser?.emailVerified) {
          persistWalletState(firebaseUser.uid, data.wallet).catch(console.warn);
        }
        showToast('Network Switched', `Active settlement chain set to ${network.toUpperCase()}`);
      }
    } catch {
      showToast('Error', 'Failed to switch network', 'error');
    }
  };

  // Chainlink CCIP Cross-Chain Bridge
  const handleBridgeUSDq = async (
    sourceChain: SupportedChain,
    destinationChain: SupportedChain,
    amount: number
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/wallet/ccip-bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceChain, destinationChain, amount }),
      });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified && data.wallet) {
          persistWalletState(firebaseUser.uid, data.wallet).catch(console.warn);
        }
        soundController.playSuccessChime();
        showToast(
          'CCIP Route Finalized',
          `Bridged ${amount} USDq from ${sourceChain.toUpperCase()} to ${destinationChain.toUpperCase()} via Chainlink CCIP.`
        );
        return true;
      }
      showToast('Bridge Error', data.error || 'Failed to route CCIP message', 'error');
      return false;
    } catch {
      showToast('Bridge Error', 'Network error during CCIP routing', 'error');
      return false;
    }
  };

  // Force ElectricSQL Shape Sync
  const handleTriggerElectricSync = async () => {
    try {
      const res = await fetch('/api/electricsql/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setElectricShapes(data.shapes);
        showToast('ElectricSQL Resynced', 'All on-chain and off-chain shapes synchronized to finality.');
      }
    } catch {
      showToast('Sync Error', 'Failed to refresh shapes', 'error');
    }
  };

  // Admin CRUD Handlers
  const handleAddProduct = async (productData: Partial<Product>): Promise<boolean> => {
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productData),
      });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified && user.role === 'ADMIN') {
          persistProductCreate(firebaseUser.uid, data.product).catch(console.warn);
        }
        showToast('Product Created', `${data.product.name} live on Reels feed.`);
        return true;
      }
      showToast('Error', data.error || 'Failed to create product', 'error');
      return false;
    } catch {
      showToast('Error', 'Server connection error', 'error');
      return false;
    }
  };

  const handleUpdateProduct = async (id: string, updates: Partial<Product>): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified && user.role === 'ADMIN') {
          persistProductUpdate(id, updates).catch(console.warn);
        }
        showToast('Product Updated', `Saved changes for ${data.product.name}.`);
        return true;
      }
      showToast('Error', data.error || 'Failed to update product', 'error');
      return false;
    } catch {
      showToast('Error', 'Server connection error', 'error');
      return false;
    }
  };

  const handleDeleteProduct = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified && user.role === 'ADMIN') {
          persistProductDelete(id).catch(console.warn);
        }
        showToast('Product Deleted', 'Item removed from catalog and reels.');
        return true;
      }
      showToast('Error', data.error || 'Failed to delete product', 'error');
      return false;
    } catch {
      showToast('Error', 'Server connection error', 'error');
      return false;
    }
  };

  const handleAdjustInventory = async (id: string, delta?: number, exact?: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${id}/adjust-inventory`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta, exact }),
      });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified) {
          persistProductInventory(id, data.product.inventory).catch(console.warn);
        }
        showToast(
          'ElectricSQL Inventory Sync',
          `New stock for ${data.product.name}: ${data.product.inventory} units (Shape synced).`
        );
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Wallet Handlers
  const handleClaimFaucet = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/wallet/faucet', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (firebaseUser?.emailVerified) {
          if (data.wallet) persistWalletState(firebaseUser.uid, data.wallet).catch(console.warn);
          if (data.transaction) persistTransaction(firebaseUser.uid, data.transaction).catch(console.warn);
        }
        soundController.playSuccessChime();
        showToast('Faucet Claimed', `+300 USDq funded on ${wallet.network.toUpperCase()}!`);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleRenewSessionKey = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/agentic-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Enclave Session Key Renewed', 'Valid for the next 24 hours of autonomous purchases.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleToggleRole = async () => {
    try {
      const res = await fetch('/api/auth/switch-role', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast('Role Switched', `You are now operating as ${data.user.role}.`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddReview = async (productId: string, comment: string, rating: number): Promise<boolean> => {
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment, rating }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Review Published', 'Thank you for your verified buyer feedback.');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Filter products for Catalog view
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category)))];
  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Bar Contract (3 zones) with Active Multi-Chain and ElectricSQL State */}
      <Navbar
        currentView={currentView}
        onViewChange={(v) => {
          if (v === 'architecture') {
            setIsArchitectureOpen(true);
          } else {
            setCurrentView(v);
          }
        }}
        cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)}
        cartPopKey={cartPopKey}
        onOpenCart={() => setIsCartOpen(true)}
        user={user}
        wallet={wallet}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenElectricSQL={() => setIsElectricSQLOpen(true)}
        onSwitchChain={handleSwitchChain}
      />

      {/* Floating Notification Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            toast.type === 'error'
              ? 'bg-rose-950 border-rose-800 text-rose-200'
              : 'bg-slate-900 border-slate-800 text-white'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="font-semibold text-xs">{toast.title}</div>
            {toast.subtitle && (
              <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{toast.subtitle}</div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area based on currentView */}
      <main className="flex-1 flex flex-col">
        {currentView === 'reels' && (
          <ReelsFeed
            products={products}
            wallet={wallet}
            onQuickBuy={handleQuickBuy}
            onAddToCart={handleAddToCart}
            onOpenReviews={(p) => setActiveReviewsProduct(p)}
            onToggleLike={handleToggleLike}
            isPurchasing={isPurchasing}
          />
        )}

        {currentView === 'catalog' && (
          <div className="max-w-7xl mx-auto px-6 py-8 w-full flex-1">
            {/* Catalog Header & Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Curated Catalog & USDq Token Store
                </h1>
                <p className="text-sm text-slate-400 mt-1">
                  High-craft goods settled on-chain via Turnkey enclave keys, ElectricSQL shapes, and Chainlink CCIP routes.
                </p>
              </div>

              <button
                onClick={() => setCurrentView('reels')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-900/30 transition-all shrink-0"
              >
                <Film className="w-4 h-4" />
                <span>Switch to Reels Feed</span>
              </button>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedCategory === cat
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 whitespace-nowrap shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Low-stock &lt;</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value) || 1))}
                    aria-label="Low stock warning threshold"
                    className="w-12 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono text-amber-300 text-center tabular-nums focus:outline-none focus:border-amber-500"
                  />
                </label>

                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products or tags..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-sm">No products found matching your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onQuickBuy={(p) => handleQuickBuy(p, wallet.network)}
                    onAddToCart={handleAddToCart}
                    onOpenReel={() => {
                      setCurrentView('reels');
                    }}
                    isPurchasing={isPurchasing}
                    lowStockThreshold={lowStockThreshold}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {currentView === 'admin' && (
          <AdminDashboard
            products={products}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustInventory={handleAdjustInventory}
            user={user}
            onToggleRole={handleToggleRole}
          />
        )}

        {currentView === 'wallet' && (
          <WalletDashboard
            wallet={wallet}
            transactions={transactions}
            onClaimFaucet={handleClaimFaucet}
            onBridgeUSDq={handleBridgeUSDq}
            onRenewSessionKey={handleRenewSessionKey}
            onSwitchChain={handleSwitchChain}
          />
        )}
      </main>

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onCheckout={handleCartCheckout}
        wallet={wallet}
        isCheckingOut={isPurchasing}
      />

      {/* Verified Reviews / Comments Drawer */}
      <CommentsDrawer
        isOpen={!!activeReviewsProduct}
        onClose={() => setActiveReviewsProduct(null)}
        product={activeReviewsProduct}
        currentUser={user}
        onAddReview={handleAddReview}
      />

      {/* Automated Backroom Enclave Auth Modal (Turnkey / Privy + Firebase Google Auth) */}
      <OAuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        wallet={wallet}
        onAgenticLogin={handleAgenticLogin}
        onGoogleSignIn={handleGoogleSignIn}
        onFirebaseSignOut={handleFirebaseSignOut}
        isFirebaseSignedIn={!!firebaseUser}
        onToggleRole={handleToggleRole}
      />

      {/* PHP, Vanilla HTML & Vue 3 Code & Architecture Inspector Modal */}
      <CodeArchitectureModal
        isOpen={isArchitectureOpen}
        onClose={() => setIsArchitectureOpen(false)}
      />

      {/* ElectricSQL Cloud & Chainlink Oracle Console Modal */}
      <ElectricSQLConsole
        isOpen={isElectricSQLOpen}
        onClose={() => setIsElectricSQLOpen(false)}
        shapes={electricShapes}
        oracleFeeds={oracleFeeds}
        ccipMessages={ccipMessages}
        onTriggerSync={handleTriggerElectricSync}
      />
    </div>
  );
}
