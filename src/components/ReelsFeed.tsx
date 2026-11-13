import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, MessageSquare, Share2, Zap, ShoppingBag, Volume2, VolumeX, ChevronDown, ChevronUp, ShieldCheck, Sparkles, ArrowRightLeft, ListOrdered } from 'lucide-react';
import { Product, AgentWallet, SupportedChain } from '../types.ts';
import { SUPPORTED_CHAINS_CONFIG } from '../mockData.ts';
import { soundController } from '../audio.ts';

interface ReelsFeedProps {
  products: Product[];
  wallet: AgentWallet;
  onQuickBuy: (product: Product, sourceChain?: SupportedChain) => void;
  onAddToCart: (product: Product) => void;
  onOpenReviews: (product: Product) => void;
  onToggleLike: (productId: string) => void;
  isPurchasing: boolean;
}

export const ReelsFeed: React.FC<ReelsFeedProps> = ({
  products,
  wallet,
  onQuickBuy,
  onAddToCart,
  onOpenReviews,
  onToggleLike,
  isPurchasing,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [expandedDesc, setExpandedDesc] = useState<Record<string, boolean>>({});
  const [showHeartBurst, setShowHeartBurst] = useState<string | null>(null);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChainCfg = SUPPORTED_CHAINS_CONFIG[wallet.network] || SUPPORTED_CHAINS_CONFIG.base;

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        scrollToIndex(Math.min(products.length - 1, activeIndex + 1));
      } else if (e.key === 'ArrowUp') {
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, products.length]);

  const scrollToIndex = (index: number) => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    containerRef.current.scrollTo({
      top: index * height,
      behavior: 'smooth',
    });
    soundController.playSwipeWhoosh();
    setActiveIndex(index);
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    const height = containerRef.current.clientHeight;
    const index = Math.round(containerRef.current.scrollTop / height);
    if (index !== activeIndex && index >= 0 && index < products.length) {
      setActiveIndex(index);
    }
  };

  const toggleSound = () => {
    const unmuted = soundController.toggleMute();
    setIsMuted(!unmuted);
  };

  const handleLike = (productId: string) => {
    soundController.playLikePop();
    setShowHeartBurst(productId);
    setTimeout(() => setShowHeartBurst(null), 850);
    onToggleLike(productId);
  };

  const handleShare = (product: Product) => {
    navigator.clipboard?.writeText(window.location.origin + '?product=' + product.id);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-65px)] bg-slate-950 text-slate-400">
        <p>No products in the catalog.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[calc(100vh-65px)] overflow-hidden bg-black flex justify-center">
      {/* Sound toggle & Chain indicator floating top-left */}
      <div className="absolute top-5 left-6 z-30 flex items-center gap-2.5">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={toggleSound}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-white text-xs hover:bg-black/90 transition-colors cursor-pointer"
          title="Toggle Ambient Boutique Audio"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-medium">Audio Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
              <span className="font-medium text-blue-400">Audio Playing</span>
            </>
          )}
        </motion.button>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-xs text-slate-300">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeChainCfg.iconColor }}
          />
          <span className="font-semibold text-white">{activeChainCfg.name}</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400 font-mono font-medium">
            {wallet.usdqBalances[wallet.network]} USDq
          </span>
        </div>
      </div>

      {/* Up/Down desktop navigational arrows */}
      <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col gap-3 z-30">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          disabled={activeIndex === 0}
          onClick={() => scrollToIndex(activeIndex - 1)}
          className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
          title="Previous Product Reel"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          disabled={activeIndex === products.length - 1}
          onClick={() => scrollToIndex(activeIndex + 1)}
          className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
          title="Next Product Reel"
        >
          <ChevronDown className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Copied link toast */}
      <AnimatePresence>
        {copiedLink && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-900/30"
          >
            Reel share link copied to clipboard!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snap feed container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full max-w-[480px] h-full overflow-y-scroll snap-y snap-mandatory no-scrollbar relative bg-slate-950 border-x border-slate-900 shadow-2xl"
      >
        {products.map((product, index) => {
          const isActive = index === activeIndex;
          const isExpanded = !!expandedDesc[product.id];
          const isLowStock = product.inventory > 0 && product.inventory <= 10;
          const isOutOfStock = product.inventory === 0;

          const hasSufficientActive = (wallet.usdqBalances[wallet.network] || 0) >= product.priceUSDq;
          const bestAlternativeChain = (['base', 'optimism', 'polygon'] as SupportedChain[]).find(
            (c) => (wallet.usdqBalances[c] || 0) >= product.priceUSDq
          );

          return (
            <div
              key={product.id}
              className="relative w-full h-full snap-start snap-always shrink-0 overflow-hidden flex items-center justify-center select-none"
            >
              {/* Product vertical media display with smooth scale & lighting motion */}
              <div className="absolute inset-0 bg-slate-950 overflow-hidden">
                <motion.img
                  src={product.mediaUrl}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ scale: 1.05 }}
                  animate={
                    isActive
                      ? {
                          scale: 1,
                          opacity: 1,
                          filter: 'brightness(1)',
                          transition: { duration: 0.75, ease: [0.16, 1, 0.3, 1] },
                        }
                      : {
                          scale: 1.05,
                          opacity: 0.82,
                          filter: 'brightness(0.85)',
                          transition: { duration: 0.5 },
                        }
                  }
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Scrim overlay for legibility */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/30 pointer-events-none" />

              {/* Tactile floating heart burst with spring animation on like */}
              <AnimatePresence>
                {showHeartBurst === product.id && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0, rotate: -20 }}
                    animate={{ scale: [0, 1.45, 1.1], opacity: [0, 1, 0], rotate: 0 }}
                    exit={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
                  >
                    <Heart className="w-28 h-28 text-rose-500 fill-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)]" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Top Chainlink CCIP & ElectricSQL Pill */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="absolute top-5 right-5 z-20 flex items-center gap-1.5"
              >
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-slate-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>{product.tokenId}</span>
                </div>
              </motion.div>

              {/* Right Vertical Action Bar with Staggered Entrance */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={isActive ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="absolute right-4 bottom-24 z-20 flex flex-col items-center gap-5"
              >
                {/* Creator Avatar */}
                <motion.div whileHover={{ scale: 1.08 }} className="relative group cursor-pointer">
                  <img
                    src={product.creatorAvatar}
                    alt={product.creatorName}
                    className="w-11 h-11 rounded-full border-2 border-white object-cover shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold shadow-sm">
                    +
                  </div>
                </motion.div>

                {/* Like Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleLike(product.id)}
                  className="flex flex-col items-center gap-1 text-white group cursor-pointer"
                  aria-label="Like product"
                >
                  <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/70 transition-all">
                    <Heart
                      className={`w-5 h-5 transition-colors ${
                        product.isLiked ? 'text-rose-500 fill-rose-500' : 'text-white'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-200">
                    {product.likesCount}
                  </span>
                </motion.button>

                {/* Reviews / Comments Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => onOpenReviews(product)}
                  className="flex flex-col items-center gap-1 text-white group cursor-pointer"
                  aria-label="Open reviews and comments"
                >
                  <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/70 transition-all">
                    <MessageSquare className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-200">
                    {product.reviewsCount}
                  </span>
                </motion.button>

                {/* Share Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleShare(product)}
                  className="flex flex-col items-center gap-1 text-white group cursor-pointer"
                  aria-label="Share product"
                >
                  <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-black/70 transition-all">
                    <Share2 className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] text-slate-200 font-medium">Share</span>
                </motion.button>

                {/* Bag / Add to Cart with Framer Motion Pop */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.88 }}
                  disabled={isOutOfStock}
                  onClick={() => {
                    onAddToCart(product);
                    setJustAddedId(product.id);
                    setTimeout(() => setJustAddedId((curr) => (curr === product.id ? null : curr)), 650);
                  }}
                  className="relative flex flex-col items-center gap-1 text-white group disabled:opacity-40 cursor-pointer"
                  aria-label="Add to bag"
                >
                  <AnimatePresence>
                    {justAddedId === product.id && (
                      <motion.span
                        initial={{ opacity: 0, y: 4, scale: 0.7 }}
                        animate={{ opacity: 1, y: -14, scale: 1 }}
                        exit={{ opacity: 0, y: -22, scale: 0.85 }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                        className="pointer-events-none absolute -top-2 text-[11px] font-mono font-bold text-emerald-400"
                      >
                        +1
                      </motion.span>
                    )}
                  </AnimatePresence>
                  <motion.div
                    animate={
                      justAddedId === product.id
                        ? { scale: [1, 1.24, 0.94, 1] }
                        : { scale: 1 }
                    }
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                      justAddedId === product.id
                        ? 'bg-emerald-600/30 border-emerald-400/70'
                        : 'bg-slate-900/80 border-slate-700 group-hover:bg-slate-800'
                    }`}
                  >
                    <ShoppingBag className={`w-5 h-5 ${justAddedId === product.id ? 'text-emerald-300' : 'text-amber-300'}`} />
                  </motion.div>
                  <span className="text-[11px] text-slate-200 font-medium">Bag</span>
                </motion.button>
              </motion.div>

              {/* Bottom Info Overlay with Tactile Elevation Transition */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={
                  isActive
                    ? { opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] } }
                    : { opacity: 0, y: 24 }
                }
                className="absolute bottom-0 left-0 right-16 p-5 pb-6 z-20 flex flex-col gap-2.5 text-white pointer-events-auto"
              >
                {/* Creator handle */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold tracking-wide text-white">
                    {product.creatorHandle}
                  </span>
                  <span className="text-xs text-slate-400 font-normal">· {product.category}</span>
                </div>

                {/* Product Name */}
                <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
                  {product.name}
                </h2>

                {/* Unboxed Metadata (Zero-Pill discipline) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-medium">
                  {product.tags.map((tag, i) => (
                    <React.Fragment key={tag}>
                      <span>{tag}</span>
                      {i < product.tags.length - 1 && <span className="text-slate-600">·</span>}
                    </React.Fragment>
                  ))}
                </div>

                {/* Description snippet with expander */}
                <div className="text-xs text-slate-300 leading-relaxed max-w-[320px]">
                  <p className={isExpanded ? '' : 'line-clamp-2'}>
                    {product.description}
                  </p>
                  <button
                    onClick={() =>
                      setExpandedDesc((prev) => ({ ...prev, [product.id]: !isExpanded }))
                    }
                    className="text-xs text-blue-400 hover:underline mt-0.5 font-medium cursor-pointer"
                  >
                    {isExpanded ? 'Show less' : 'Read more'}
                  </button>
                </div>

                {/* Pricing row with smaller numbering list icon and Round Responsive Buy Icon Button */}
                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="flex flex-col gap-1">
                    {/* Price in HaiKets default USDq Stablecoin */}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-bold font-mono text-emerald-400 tabular-nums">
                        {product.priceUSDq} USDq
                      </span>
                      <span className="text-xs font-mono text-slate-400 tabular-nums">
                        (${product.priceUSD} USD)
                      </span>
                    </div>

                    {/* Smaller Numbering List Icon for in-stock */}
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-xs font-mono">
                        <ListOrdered
                          className={`w-3.5 h-3.5 ${
                            isOutOfStock
                              ? 'text-rose-400'
                              : isLowStock
                              ? 'text-amber-400 animate-pulse'
                              : 'text-emerald-400'
                          }`}
                        />
                        <span
                          className={`text-[11px] tabular-nums ${
                            isOutOfStock
                              ? 'text-rose-400 font-semibold'
                              : isLowStock
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-300 font-medium'
                          }`}
                        >
                          {isOutOfStock ? '0 sold out' : `#${product.inventory} in stock`}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Round Responsive Advanced CSS Purchase Icon Button (Energetic, Click-Attractive, Moderate) */}
                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      disabled={isOutOfStock || isPurchasing}
                      onClick={() => onQuickBuy(product, wallet.network)}
                      title={`1-Tap Buy with USDq (${product.priceUSDq} USDq · Gasless)`}
                      aria-label={`Buy ${product.name} with USDq`}
                      className="relative group flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {/* Energetic ambient pulse glow ring */}
                      <span className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 opacity-60 blur-xs group-hover:opacity-100 transition-opacity duration-300 animate-pulse" />

                      {/* Outer gradient rim */}
                      <span className="relative w-full h-full rounded-full bg-gradient-to-tr from-blue-600 via-indigo-500 to-emerald-400 p-[2px] flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:shadow-emerald-500/50 transition-shadow">
                        {/* Inner core with radial sheen */}
                        <span className="w-full h-full rounded-full bg-slate-950/85 backdrop-blur-md flex items-center justify-center text-white group-hover:bg-slate-900/80 transition-colors relative overflow-hidden">
                          {/* Light sheen animation sweep */}
                          <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />

                          {isPurchasing ? (
                            <span className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <div className="flex items-center justify-center relative">
                              <ShoppingBag className="w-5 h-5 text-emerald-400 group-hover:text-emerald-300 transition-colors" />
                              <Zap className="w-2.5 h-2.5 text-amber-300 fill-amber-300 absolute -bottom-0.5 -right-1 drop-shadow-sm animate-bounce" />
                            </div>
                          )}
                        </span>
                      </span>

                      {/* Floating mini BUY badge */}
                      <span className="absolute -bottom-1 text-[9px] font-mono font-bold text-white bg-blue-600/90 border border-blue-400/50 px-1.5 py-0.2 rounded-full shadow-xs whitespace-nowrap">
                        BUY
                      </span>
                    </motion.button>
                  </div>
                </div>

                {/* Cross-chain CCIP alternative route if active chain balance is low */}
                {!hasSufficientActive && bestAlternativeChain && (
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onQuickBuy(product, bestAlternativeChain)}
                    className="text-[10px] font-mono text-amber-300 hover:text-amber-200 flex items-center gap-1 pt-1 cursor-pointer"
                  >
                    <ArrowRightLeft className="w-3 h-3" />
                    <span>
                      Route from {bestAlternativeChain.toUpperCase()} via Chainlink CCIP ({wallet.usdqBalances[bestAlternativeChain]} USDq)
                    </span>
                  </motion.button>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
