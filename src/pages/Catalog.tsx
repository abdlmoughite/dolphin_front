import { Filter, Grid2X2, List, Share2, ShoppingCart, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, Brand, Category, mediaUrl, Paginated, Product } from '../lib/api';
import { money } from '../lib/i18n';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, LoadingGrid } from '../components/States';
import { useCart } from '../stores/cart';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [grid, setGrid] = useState(true);
  const query = params.toString();
  const products = useQuery({ queryKey: ['products', query], queryFn: async () => (await api.get<Paginated<Product>>(`/products/?${query}`)).data });
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/')).data });
  const brands = useQuery({ queryKey: ['brands'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    if (key !== 'page') next.delete('page');
    setParams(next);
  };
  const filterPanel = (
    <div className="grid gap-4">
      <label className="grid gap-1 text-sm font-semibold">Categorie<select className="input" value={params.get('category') || ''} onChange={(e) => set('category', e.target.value)}><option value="">Toutes</option>{categories.data?.results.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Marque<select className="input" value={params.get('brand') || ''} onChange={(e) => set('brand', e.target.value)}><option value="">Toutes</option>{brands.data?.results.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Prix min<input className="input" type="number" onChange={(e) => set('min_price', e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-semibold">Prix max<input className="input" type="number" onChange={(e) => set('max_price', e.target.value)} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" onChange={(e) => set('promotion', e.target.checked ? 'true' : '')} /> Promotions</label>
    </div>
  );
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-slate-500">Accueil / Catalogue</p><h1 className="font-heading text-3xl font-bold">Catalogue DOLPHIN</h1><p className="text-slate-600">{products.data?.count || 0} resultats</p></div>
        <div className="flex gap-2"><button className="btn-secondary lg:hidden" onClick={() => setMobileFilters(true)}><Filter className="h-4 w-4" />Filtres</button><button className="btn-secondary" onClick={() => setGrid(!grid)}>{grid ? <List /> : <Grid2X2 />}</button><select className="input max-w-48" onChange={(e) => set('ordering', e.target.value)}><option value="-created_at">Nouveautes</option><option value="regular_price">Prix croissant</option><option value="-sales_count">Best sellers</option><option value="-average_rating">Mieux notes</option></select></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card hidden p-5 lg:block">{filterPanel}</aside>
        <div className="grid gap-5">{products.isLoading ? <LoadingGrid /> : products.data?.results.length ? <><div className={`grid gap-5 ${grid ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>{products.data.results.map((p) => <ProductCard key={p.id} product={p} />)}</div><Pagination count={products.data.count} page={Number(params.get('page') || 1)} onPage={(page) => set('page', String(page))} /></> : <EmptyState title="Aucun produit" text="Essayez de modifier vos filtres." />}</div>
      </div>
      {mobileFilters && <div className="fixed inset-0 z-50 bg-navy/40 p-4" onClick={() => setMobileFilters(false)}><div className="card ml-auto h-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>{filterPanel}</div></div>}
    </section>
  );
}

export function ProductDetailsPage() {
  const { slug } = useParams();
  const [qty, setQty] = useState(1);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const { data: product, isLoading } = useQuery({ queryKey: ['product', slug], queryFn: async () => (await api.get<Product>(`/products/${slug}/`)).data });
  const add = useCart((s) => s.add);
  const variant = useMemo(() => product?.variants.find((v) => v.id === variantId) || product?.variants?.[0], [product, variantId]);
  if (isLoading) return <section className="mx-auto max-w-7xl px-4 py-8"><div className="skeleton h-96" /></section>;
  if (!product) return <EmptyState title="Produit introuvable" text="Ce produit n'est plus disponible." />;
  const selectedImage = product.images?.[imageIndex]?.image || product.images?.find((image) => image.is_main)?.image;
  const available = variant?.inventory?.available_quantity ?? variant?.inventory?.quantity ?? 0;
  const canBuy = Boolean(variant && available > 0 && qty <= available);
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="grid gap-3">
        <div className="card aspect-square overflow-hidden bg-mist">
          {selectedImage ? <img className="h-full w-full object-cover" src={mediaUrl(selectedImage)} alt={product.name} /> : <div className="grid h-full place-items-center p-6 text-center font-heading text-4xl font-bold text-ocean">{product.name}</div>}
        </div>
        {!!product.images?.length && <div className="grid grid-cols-4 gap-3">{product.images.map((image, index) => <button key={image.id} className={`aspect-square overflow-hidden rounded-dolphin border ${imageIndex === index ? 'border-ocean' : 'border-slate-200'}`} onClick={() => setImageIndex(index)}><img className="h-full w-full object-cover" src={mediaUrl(image.image)} alt={image.alt_text || product.name} /></button>)}</div>}
      </div>
      <div className="grid content-start gap-5">
        <p className="text-sm text-slate-500">Accueil / {product.category?.name}</p>
        <h1 className="font-heading text-4xl font-bold">{product.name}</h1>
        <div className="flex items-center gap-2 text-amber-500"><Star className="fill-current" />{Number(product.average_rating || 0).toFixed(1)} avis verifies</div>
        <div className="flex items-end gap-3"><strong className="text-3xl text-ocean">{money(product.current_price)}</strong>{product.promotional_price && <span className="text-slate-400 line-through">{money(product.regular_price)}</span>}{product.discount_percent > 0 && <span className="badge bg-coral text-white">-{product.discount_percent}%</span>}</div>
        <p className="text-slate-700">{product.short_description}</p>
        <div className="grid gap-2"><span className="font-bold">Variantes</span><div className="flex flex-wrap gap-2">{product.variants.map((v) => <button key={v.id} onClick={() => { setVariantId(v.id); setQty(1); }} className={`btn-secondary ${variant?.id === v.id ? 'bg-mist' : ''}`}>{v.values.map((x) => x.value).join(' / ') || v.sku}</button>)}</div>{variant && <span className={`text-sm font-semibold ${available > 0 ? 'text-success' : 'text-coral'}`}>{available > 0 ? `${available} en stock` : 'Rupture de stock'}</span>}</div>
        <div className="flex flex-wrap items-center gap-3"><input className="input max-w-24" type="number" min={1} max={available || 1} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value), available || 1)))} /><button className="btn-primary" disabled={!canBuy} onClick={() => variant && add(variant.id, qty).then(() => toast.success('Panier mis a jour'))}><ShoppingCart className="h-4 w-4" />Ajouter au panier</button><a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(product.name)}`}><Share2 className="h-4 w-4" />Partager</a></div>
        <div className="card p-5"><h2 className="font-heading text-xl font-bold">Description</h2><p className="mt-2 text-slate-700">{product.description}</p></div>
        <div className="grid gap-2 text-sm text-slate-600"><p>Livraison selon la ville choisie au checkout.</p><p>Retour possible selon la politique de retour DOLPHIN.</p></div>
      </div>
    </section>
  );
}

function Pagination({ count, page, onPage }: { count: number; page: number; onPage: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(count / 20));
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2">
      <button className="btn-secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Precedent</button>
      <span className="text-sm font-semibold text-slate-600">Page {page} / {totalPages}</span>
      <button className="btn-secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Suivant</button>
    </div>
  );
}
