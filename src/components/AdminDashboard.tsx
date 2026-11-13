import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw, ShieldAlert, CheckCircle2, Box, DollarSign, Layers } from 'lucide-react';
import { Product, User } from '../types.ts';

interface AdminDashboardProps {
  products: Product[];
  onAddProduct: (productData: Partial<Product>) => Promise<boolean>;
  onUpdateProduct: (id: string, updates: Partial<Product>) => Promise<boolean>;
  onDeleteProduct: (id: string) => Promise<boolean>;
  onAdjustInventory: (id: string, delta?: number, exact?: number) => Promise<boolean>;
  user: User;
  onToggleRole: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustInventory,
  user,
  onToggleRole,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stockInput, setStockInput] = useState<{ [id: string]: string }>({});

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: 'Luxury Wearables',
    tagline: '',
    description: '',
    priceUSDq: 100,
    priceETH: 0.03,
    inventory: 20,
    mediaUrl: '/src/assets/images/reels_cyber_watch_1793613626518.jpg',
    creatorHandle: '@brand_merchant',
    creatorName: 'Verified Merchant',
    contractAddress: '0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781',
    tags: 'USDq Native, Limited Edition, Web3',
  });

  // Calculate KPIs
  const totalStock = products.reduce((acc, p) => acc + p.inventory, 0);
  const totalValuation = products.reduce((acc, p) => acc + p.inventory * p.priceUSDq, 0);
  const lowStockCount = products.filter((p) => p.inventory <= 10).length;

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      category: 'Luxury Wearables',
      tagline: '',
      description: '',
      priceUSDq: 150,
      priceETH: 0.045,
      inventory: 25,
      mediaUrl: '/src/assets/images/reels_cyber_watch_1793613626518.jpg',
      creatorHandle: '@atelier_prime',
      creatorName: 'Prime Atelier',
      contractAddress: '0x71C8F67A8a7bF53a251787c800DaFe34dE6aB781',
      tags: 'Luxury, Carbon, ERC-721',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      category: p.category,
      tagline: p.tagline,
      description: p.description,
      priceUSDq: p.priceUSDq,
      priceETH: p.priceETH,
      inventory: p.inventory,
      mediaUrl: p.mediaUrl,
      creatorHandle: p.creatorHandle,
      creatorName: p.creatorName,
      contractAddress: p.contractAddress,
      tags: p.tags.join(', '),
    });
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tagsArray = formData.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      if (editingProduct) {
        await onUpdateProduct(editingProduct.id, {
          ...formData,
          priceUSDq: Number(formData.priceUSDq),
          priceETH: Number(formData.priceETH),
          priceUSD: Number(formData.priceUSDq),
          inventory: Number(formData.inventory),
          tags: tagsArray,
        });
        setEditingProduct(null);
      } else {
        await onAddProduct({
          ...formData,
          priceUSDq: Number(formData.priceUSDq),
          priceETH: Number(formData.priceETH),
          priceUSD: Number(formData.priceUSDq),
          inventory: Number(formData.inventory),
          tags: tagsArray,
        });
        setShowAddModal(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsSubmitting(true);
    try {
      await onDeleteProduct(id);
      setDeleteConfirmId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomStockSet = async (id: string) => {
    const val = parseInt(stockInput[id], 10);
    if (!isNaN(val) && val >= 0) {
      await onAdjustInventory(id, undefined, val);
      setStockInput((prev) => ({ ...prev, [id]: '' }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Administrative Products Studio
            </h1>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Live Real-Time Inventory Sync
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage product catalog CRUD, adjust smart contract inventory thresholds, and broadcast real-time updates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Quick role toggle */}
          <button
            onClick={onToggleRole}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors"
          >
            <span>Role:</span>
            <span className="font-semibold text-amber-400">{user.role}</span>
            <span className="text-slate-500 text-[10px]">(Click to switch)</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-900/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Product</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Units in Stock</span>
            <Box className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white tabular-nums">
            {totalStock}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Across {products.length} registered products
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Total Catalog Valuation</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 tabular-nums">
            ${totalValuation.toLocaleString()} USDC
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Verified by on-chain escrow contract
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Low Stock Alerts (&le; 10 units)</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 tabular-nums">
            {lowStockCount}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Autonomous agent auto-buy triggers active
          </div>
        </div>
      </div>

      {/* Product Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <span>Product Inventory & Smart Contract Management</span>
          </h2>
          <span className="text-xs text-slate-400">
            Real-time SSE updates enabled
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-950/50">
                <th className="py-3.5 px-5">Product</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 font-mono">Price (USDC / ETH)</th>
                <th className="py-3.5 px-4 font-mono">Live Stock</th>
                <th className="py-3.5 px-4">Contract / Token</th>
                <th className="py-3.5 px-4 text-center">Quick Stock Adjust</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-sm">
              {products.map((product) => {
                const isLow = product.inventory <= 10;
                return (
                  <tr key={product.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Product visual & name */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.mediaUrl}
                          alt={product.name}
                          className="w-12 h-12 rounded-xl object-cover bg-slate-950 border border-slate-700/80 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="max-w-[200px]">
                          <div className="font-semibold text-white truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-slate-400 truncate">
                            {product.creatorHandle}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4 text-slate-300 text-xs">
                      {product.category}
                    </td>

                    {/* Price */}
                    <td className="py-4 px-4 font-mono tabular-nums">
                      <div className="text-emerald-400 font-semibold">
                        {product.priceUSDq} USDq
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {product.priceETH} ETH
                      </div>
                    </td>

                    {/* Inventory */}
                    <td className="py-4 px-4 font-mono tabular-nums">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-base font-bold ${
                            product.inventory === 0
                              ? 'text-rose-400'
                              : isLow
                              ? 'text-amber-400'
                              : 'text-white'
                          }`}
                        >
                          {product.inventory}
                        </span>
                        <span className="text-xs text-slate-500">units</span>
                      </div>
                    </td>

                    {/* Smart contract */}
                    <td className="py-4 px-4 font-mono text-xs">
                      <div className="text-blue-400 truncate max-w-[120px]">
                        {product.contractAddress.slice(0, 8)}...{product.contractAddress.slice(-4)}
                      </div>
                      <div className="text-slate-500 text-[11px]">{product.tokenId}</div>
                    </td>

                    {/* Quick Stock Adjust Steppers */}
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onAdjustInventory(product.id, -1)}
                          disabled={product.inventory === 0}
                          title="Decrease by 1"
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-xs font-mono disabled:opacity-30"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => onAdjustInventory(product.id, 5)}
                          title="Increase by 5"
                          className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 flex items-center justify-center text-xs font-mono"
                        >
                          +5
                        </button>
                        <div className="flex items-center gap-1 ml-1">
                          <input
                            type="number"
                            min="0"
                            placeholder="Set"
                            value={stockInput[product.id] || ''}
                            onChange={(e) =>
                              setStockInput({ ...stockInput, [product.id]: e.target.value })
                            }
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomStockSet(product.id)}
                            className="w-14 px-1.5 py-1 text-xs font-mono bg-slate-950 border border-slate-700 rounded text-white"
                          />
                          <button
                            onClick={() => handleCustomStockSet(product.id)}
                            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 rounded"
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEdit(product)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(product.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Delete Product?</h3>
            <p className="text-xs text-slate-400 mb-6">
              This will remove the product from the TikTok Reels feed and revoke its smart contract listing.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isSubmitting}
                className="flex-1 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl"
              >
                {isSubmitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full my-8 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-4">
              {editingProduct ? 'Edit Product Details' : 'Create New Product Reel'}
            </h2>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chronos Obsidian Watch"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  >
                    <option value="Luxury Wearables">Luxury Wearables</option>
                    <option value="Technical Apparel">Technical Apparel</option>
                    <option value="Artisanal Living">Artisanal Living</option>
                    <option value="Acoustic Engineering">Acoustic Engineering</option>
                    <option value="Collectibles">Collectibles</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Initial Stock Inventory *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.inventory}
                    onChange={(e) => setFormData({ ...formData, inventory: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price in USDq *
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    value={formData.priceUSDq}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priceUSDq: Number(e.target.value),
                        priceETH: Number((Number(e.target.value) * 0.00031).toFixed(4)),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Price in ETH
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.priceETH}
                    onChange={(e) => setFormData({ ...formData, priceETH: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Short Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g. Titanium chassis · Biometric sync · ERC-721"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detailed specifications, materials, and decentralized warranty."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reel Media Image URL
                </label>
                <input
                  type="text"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Creator Handle
                  </label>
                  <input
                    type="text"
                    value={formData.creatorHandle}
                    onChange={(e) => setFormData({ ...formData, creatorHandle: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
