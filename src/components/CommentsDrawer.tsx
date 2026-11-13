import React, { useState, useEffect } from 'react';
import { X, Send, Star, ShieldCheck, MessageSquare } from 'lucide-react';
import { Product, Review, User } from '../types.ts';

interface CommentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  currentUser: User;
  onAddReview: (productId: string, comment: string, rating: number) => Promise<boolean>;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  isOpen,
  onClose,
  product,
  currentUser,
  onAddReview,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [rating, setRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setIsLoading(true);
      fetch(`/api/products/${product.id}/reviews`)
        .then((res) => {
          if (!res.ok) return null;
          const ct = res.headers.get('content-type');
          if (!ct || !ct.includes('application/json')) return null;
          return res.json();
        })
        .then((data) => {
          if (data?.success) {
            setReviews(data.reviews);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      const success = await onAddReview(product.id, newComment, rating);
      if (success) {
        setReviews((prev) => [
          {
            id: `rev-${Date.now()}`,
            productId: product.id,
            author: currentUser.name,
            avatar: currentUser.avatar,
            comment: newComment,
            rating,
            timestamp: 'Just now',
            verifiedBuyer: true,
          },
          ...prev,
        ]);
        setNewComment('');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-slate-950 border-l border-slate-800 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white">Verified Reviews & Community</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product mini header */}
        <div className="px-5 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center gap-3">
          <img
            src={product.mediaUrl}
            alt={product.name}
            className="w-10 h-10 rounded-lg object-cover bg-slate-950 shrink-0"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">{product.name}</div>
            <div className="text-[11px] font-mono text-emerald-400">
              {product.priceUSDq} USDq · {product.inventory} in stock
            </div>
          </div>
        </div>

        {/* Comments Feed */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-500">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-700" />
              <p className="text-xs">No reviews yet for this product.</p>
              <p className="text-[11px] text-slate-500">Be the first verified buyer to leave feedback!</p>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rev.avatar}
                      alt={rev.author}
                      className="w-7 h-7 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>{rev.author}</span>
                        {rev.verifiedBuyer && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verified</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">{rev.timestamp}</div>
                    </div>
                  </div>

                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pl-9">
                  {rev.comment}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Comment input footer */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-4 h-4 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a verified review..."
              className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
