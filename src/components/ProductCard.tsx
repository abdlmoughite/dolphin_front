import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { api, mediaUrl, Product } from '../lib/api';
import { money } from '../lib/i18n';
import { useCart } from '../stores/cart';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const setCheckoutOpen = useCart((s) => s.setCheckoutOpen);
  const [adding, setAdding] = useState(false);
  const variant = product.variants?.[0];
  const canAdd = product.status === 'ACTIVE' && product.category?.is_active !== false && !product.category?.is_archived && Boolean(variant?.id || product.id);
  const mainImage = product.images?.find((image) => image.is_main)?.image || product.images?.[0]?.image;
  const addWishlist = async () => {
    await api.post('/wishlist/', { product_id: product.id });
    toast.success('Favori ajoute');
  };
  return (
    <article className="card group overflow-hidden transition hover:-translate-y-1 hover:shadow-lg">
      <Link to={`/produit/${product.slug}`} className="block">
        <div className="aspect-square bg-mist">
          {mainImage ? (
            <img className="h-full w-full object-cover" src={mediaUrl(mainImage)} alt={product.images?.[0]?.alt_text || product.name} loading="lazy" />
          ) : (
            <div className="flex h-full items-center justify-center bg-white p-5 text-center font-heading text-xl font-bold text-ocean">{product.name}</div>
          )}
        </div>
      </Link>
      <div className="grid gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/produit/${product.slug}`} className="font-bold text-navy hover:text-ocean">{product.name}</Link>
            <p className="text-sm text-slate-500">{product.brand?.name || 'DOLPHIN'}</p>
          </div>
          <button className="rounded-full p-2 text-ocean hover:bg-mist" aria-label="Ajouter aux favoris" onClick={addWishlist}><Heart className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-1 text-sm text-amber-500"><Star className="h-4 w-4 fill-current" />{Number(product.average_rating || 0).toFixed(1)}</div>
        <div className="flex items-end gap-2">
          <strong className="text-lg text-ocean">{money(product.current_price)}</strong>
          {product.promotional_price && <span className="text-sm text-slate-400 line-through">{money(product.regular_price)}</span>}
          {product.discount_percent > 0 && <span className="badge bg-coral text-white">-{product.discount_percent}%</span>}
        </div>
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className={canAdd ? 'text-success' : 'text-coral'}>{canAdd ? (variant ? `${product.variants.length} variante(s)` : 'Sans variante') : 'Indisponible'}</span>
          <span className="text-slate-400">{product.sku}</span>
        </div>
        <button className="btn-primary w-full" disabled={adding || !canAdd} onClick={async () => { if (!canAdd) { toast.error('Produit indisponible'); return; } setAdding(true); try { await add(variant?.id ? { variantId: variant.id, productId: product.id } : { productId: product.id }); toast.success('Produit ajoute au panier'); setCheckoutOpen(true); } catch { /* Toast handled by API interceptor. */ } finally { setAdding(false); } }}>
          <ShoppingCart className="h-4 w-4" /> {canAdd ? 'Ajouter' : 'Indisponible'}
        </button>
      </div>
    </article>
  );
}
