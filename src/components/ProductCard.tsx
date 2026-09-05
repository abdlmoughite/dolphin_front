import { Heart, ShoppingCart, Star } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, mediaUrl, Product } from '../lib/api';
import { money } from '../lib/i18n';
import { useCart } from '../stores/cart';
import { useAuth } from '../stores/auth';

export function ProductCard({ product }: { product: Product }) {
  const add = useCart((s) => s.add);
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const variant = product.variants?.[0];
  const inStock = Boolean(variant && (variant.inventory?.available_quantity || 0) > 0);
  const mainImage = product.images?.find((image) => image.is_main)?.image || product.images?.[0]?.image;
  return (
    <article className="card overflow-hidden">
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
          <button className="rounded-full p-2 text-ocean hover:bg-mist" aria-label="Ajouter aux favoris" onClick={() => {
            if (!user) {
              toast.error('Connectez-vous pour enregistrer vos favoris');
              navigate('/connexion');
              return;
            }
            api.post('/wishlist/', { product_id: product.id }).then(() => toast.success('Ajoute aux favoris'));
          }}><Heart className="h-5 w-5" /></button>
        </div>
        <div className="flex items-center gap-1 text-sm text-amber-500"><Star className="h-4 w-4 fill-current" />{Number(product.average_rating || 0).toFixed(1)}</div>
        <div className="flex items-end gap-2">
          <strong className="text-lg text-ocean">{money(product.current_price)}</strong>
          {product.promotional_price && <span className="text-sm text-slate-400 line-through">{money(product.regular_price)}</span>}
          {product.discount_percent > 0 && <span className="badge bg-coral text-white">-{product.discount_percent}%</span>}
        </div>
        <button className="btn-primary w-full" disabled={!inStock} onClick={() => variant && add(variant.id).then(() => toast.success('Produit ajoute au panier'))}>
          <ShoppingCart className="h-4 w-4" /> {inStock ? 'Ajouter' : 'Rupture de stock'}
        </button>
      </div>
    </article>
  );
}
