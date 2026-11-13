import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, ShoppingBag, Eye, ShieldCheck, ListOrdered, AlertTriangle, Check } from 'lucide-react';
import { Product } from '../types.ts';

interface ProductCardProps {
  product: Product;
  onQuickBuy: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onOpenReel: (product: Product) => void;
  isPurchasing: boolean;
  lowStockThreshold?: number;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onQuickBuy,
  onAddToCart,
  onOpenReel,
  isPurchasing,
  lowStockThreshold = 10,
}) => {
  const [justAdded, setJustAdded] = useState(false);

  const isOutOfStock = product.inventory === 0;
  const isLowStock = product.inventory > 0 && product.inventory < lowStockThreshold;

  const handleAddClick = () => {
    if (isOutOfStock) return;
    onAddToCart(product);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 650);
  };

  return (
    <div className="group relative flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all hover:shadow-xl hover:shadow-black/40">
      {/* 65-75% height Image container */}
      <div className="relative aspect-[3/4] w-full bg-slate-950 overflow-hidden">
        <img
          src={product.mediaUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          referrerPolicy="no-referrer"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-300 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-400" />
            {product.tokenId}
          </span>

          {isOutOfStock ? (
            <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-rose-800 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
              <span>0 sold out</span>
            </span>
          ) : isLowStock ? (
            <span
              title={`Low stock warning: ${product.inventory} units left (below threshold of ${lowStockThreshold})`}
              className="text-[11px] font-semibold text-amber-300 bg-amber-950/85 backdrop-blur-md px-2 py-0.5 rounded-md border border-amber-700/80 flex items-center gap-1 shadow-sm shadow-amber-950/40"
            >
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="tabular-nums">Low · #{product.inventory} left</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-slate-300 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
              <ListOrdered className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="tabular-nums">#{product.inventory} in stock</span>
            </span>
          )}
        </div>

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-4">
          <button
            onClick={() => onOpenReel(product)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/95 hover:bg-white text-slate-950 text-xs font-semibold shadow-lg active:scale-95 transition-all"
          >
            <Eye className="w-4 h-4 text-blue-600" />
            <span>Watch Reel Showcase</span>
          </button>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3 bg-slate-900/95">
        <div>
          {/* Category & Creator */}
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>{product.category}</span>
            <span className="text-slate-500">·</span>
            <span>{product.creatorHandle}</span>
          </div>

          {/* Product Name */}
          <h3 className="text-base font-semibold text-white tracking-tight leading-snug line-clamp-1">
            {product.name}
          </h3>

          {/* Tagline */}
          <p className="text-xs text-slate-400 mt-1 line-clamp-1">
            {product.tagline}
          </p>
        </div>

        {/* Pricing row in USDq */}
        <div className="pt-2 border-t border-slate-800/80 flex items-baseline justify-between">
          <div>
            <div className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
              {product.priceUSDq} USDq
            </div>
            <div className="text-[11px] font-mono text-slate-500 tabular-nums">
              ~{product.priceETH} ETH (${product.priceUSD})
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <AnimatePresence>
                {justAdded && (
                  <motion.span
                    initial={{ opacity: 0, y: 4, scale: 0.7 }}
                    animate={{ opacity: 1, y: -16, scale: 1 }}
                    exit={{ opacity: 0, y: -24, scale: 0.85 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-emerald-400 whitespace-nowrap"
                  >
                    +1
                  </motion.span>
                )}
              </AnimatePresence>

              <motion.button
                disabled={isOutOfStock}
                onClick={handleAddClick}
                animate={justAdded ? { scale: [1, 1.22, 0.94, 1] } : { scale: 1 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`p-2 rounded-lg transition-colors disabled:opacity-40 cursor-pointer ${
                  justAdded
                    ? 'bg-emerald-600/20 border border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-transparent'
                }`}
                title="Add to Shopping Bag"
                aria-label={`Add ${product.name} to bag`}
              >
                {justAdded ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
              </motion.button>
            </div>

            <button
              disabled={isOutOfStock || isPurchasing}
              onClick={() => onQuickBuy(product)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm shadow-blue-900/30 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Buy</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
