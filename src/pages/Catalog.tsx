import { Filter, Grid2X2, List, Share2, ShoppingCart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, Brand, Category, mediaUrl, Paginated, Product } from '../lib/api';
import { money } from '../lib/i18n';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, LoadingGrid } from '../components/States';
import { useCart } from '../stores/cart';
import { ErrorState, PageHeader, Pagination, SearchInput, StatusBadge } from '../components/ui';
import { productQueryKeys } from '../lib/queryKeys';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [mobileFilters, setMobileFilters] = useState(false);
  const [grid, setGrid] = useState(true);
  const publicParams = new URLSearchParams(params);
  publicParams.set('status', 'ACTIVE');
  const query = publicParams.toString();
  const products = useQuery({ queryKey: productQueryKeys.catalog(query), queryFn: async () => (await api.get<Paginated<Product>>(`/products/?${query}`)).data });
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
      <SearchInput value={params.get('search') || ''} onChange={(value) => set('search', value)} placeholder="Recherche produit" />
      <label className="grid gap-1 text-sm font-semibold">Categorie<select className="input" value={params.get('category') || ''} onChange={(e) => set('category', e.target.value)}><option value="">Toutes</option>{categories.data?.results.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Marque<select className="input" value={params.get('brand') || ''} onChange={(e) => set('brand', e.target.value)}><option value="">Toutes</option>{brands.data?.results.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="grid gap-1 text-sm font-semibold">Prix min<input className="input" type="number" value={params.get('min_price') || ''} onChange={(e) => set('min_price', e.target.value)} /></label>
      <label className="grid gap-1 text-sm font-semibold">Prix max<input className="input" type="number" value={params.get('max_price') || ''} onChange={(e) => set('max_price', e.target.value)} /></label>
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={params.get('promotion') === 'true'} onChange={(e) => set('promotion', e.target.checked ? 'true' : '')} /> Promotions</label>
      <button className="btn-secondary" onClick={() => setParams(new URLSearchParams())}>Reinitialiser</button>
    </div>
  );
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <PageHeader eyebrow="Accueil / Catalogue" title="Catalogue DOLPHIN" description={`${products.data?.count || 0} resultats disponibles`} />
        <div className="flex gap-2"><button className="btn-secondary lg:hidden" onClick={() => setMobileFilters(true)}><Filter className="h-4 w-4" />Filtres</button><button className="btn-secondary" onClick={() => setGrid(!grid)}>{grid ? <List /> : <Grid2X2 />}</button><select className="input max-w-48" value={params.get('ordering') || '-created_at'} onChange={(e) => set('ordering', e.target.value)}><option value="-created_at">Nouveautes</option><option value="regular_price">Prix croissant</option><option value="-regular_price">Prix decroissant</option><option value="-sales_count">Best sellers</option></select></div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card hidden p-5 lg:block">{filterPanel}</aside>
        <div className="grid gap-5">{products.isLoading ? <LoadingGrid /> : products.isError ? <ErrorState onRetry={() => products.refetch()} /> : products.data?.results.length ? <><div className={`grid gap-5 ${grid ? 'sm:grid-cols-2 xl:grid-cols-3' : ''}`}>{products.data.results.map((p) => <ProductCard key={p.id} product={p} />)}</div><Pagination count={products.data.count} page={Number(params.get('page') || 1)} onPage={(page) => set('page', String(page))} pageSize={12} /></> : <EmptyState title="Aucun produit disponible pour le moment." text="" />}</div>
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
  const [adding, setAdding] = useState(false);
  const { data: product, isLoading, isError, refetch } = useQuery({ queryKey: productQueryKeys.detail(slug), queryFn: async () => (await api.get<Product>(`/products/${slug}/`)).data });
  const similar = useQuery({ queryKey: productQueryKeys.similar(product?.category?.id), enabled: Boolean(product?.category?.id), queryFn: async () => (await api.get<Paginated<Product>>(`/products/?status=ACTIVE&category=${product?.category.id}`)).data });
  const add = useCart((s) => s.add);
  const setCheckoutOpen = useCart((s) => s.setCheckoutOpen);
  const variant = useMemo(() => product?.variants.find((v) => v.id === variantId) || product?.variants?.[0], [product, variantId]);
  const galleryImages = useMemo(() => [...(product?.images || [])].sort((a, b) => Number(b.is_main) - Number(a.is_main) || a.display_order - b.display_order), [product?.images]);
  if (isLoading) return <section className="mx-auto max-w-7xl px-4 py-8"><div className="skeleton h-96" /></section>;
  if (isError) return <section className="mx-auto max-w-7xl px-4 py-8"><ErrorState onRetry={() => refetch()} /></section>;
  if (!product) return <EmptyState title="Produit introuvable" text="Ce produit n'est plus disponible." />;
  const selectedImage = galleryImages[imageIndex]?.image;
  const canBuy = product.status === 'ACTIVE' && product.category?.is_active !== false && !product.category?.is_archived && Boolean(variant?.id || product.id);
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 lg:grid-cols-2">
      <div className="grid gap-3">
        <div className="card aspect-square overflow-hidden bg-mist">
          {selectedImage ? <img className="h-full w-full object-cover" src={mediaUrl(selectedImage)} alt={product.name} /> : <div className="grid h-full place-items-center p-6 text-center font-heading text-4xl font-bold text-ocean">{product.name}</div>}
        </div>
        {!!galleryImages.length && <div className="grid grid-cols-4 gap-3">{galleryImages.map((image, index) => <button key={image.id} className={`aspect-square overflow-hidden rounded-dolphin border ${imageIndex === index ? 'border-ocean' : 'border-slate-200'}`} onClick={() => setImageIndex(index)}><img className="h-full w-full object-cover" src={mediaUrl(image.image)} alt={image.alt_text || product.name} /></button>)}</div>}
      </div>
      <div className="grid content-start gap-5">
        <p className="text-sm text-slate-500">Accueil / {product.category?.name}</p>
        <h1 className="font-heading text-4xl font-bold">{product.name}</h1>
        <div className="flex flex-wrap items-center gap-3"><StatusBadge status={product.status} /><span className="text-sm font-semibold text-slate-500">SKU {product.sku}</span></div>
        <div className="flex items-end gap-3"><strong className="text-3xl text-ocean">{money(product.current_price)}</strong>{product.promotional_price && <span className="text-slate-400 line-through">{money(product.regular_price)}</span>}{product.discount_percent > 0 && <span className="badge bg-coral text-white">-{product.discount_percent}%</span>}</div>
        <p className="text-slate-700">{product.short_description}</p>
        <div className="grid gap-2"><span className="font-bold">Variantes</span><div className="flex flex-wrap gap-2">{product.variants.length ? product.variants.map((v) => <button key={v.id} onClick={() => { setVariantId(v.id); setQty(1); }} className={`btn-secondary ${variant?.id === v.id ? 'bg-mist' : ''}`}>{v.values.map((x) => x.value).join(' / ') || v.sku}</button>) : <span className="text-sm font-semibold text-slate-500">Aucune variante</span>}</div></div>
        <div className="flex flex-wrap items-center gap-3"><input className="input max-w-24" type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} /><button className="btn-primary" disabled={!canBuy || adding} onClick={async () => { if (!canBuy) { toast.error('Produit indisponible'); return; } setAdding(true); try { await add(variant?.id ? { variantId: variant.id, productId: product.id } : { productId: product.id }, qty); toast.success('Panier mis a jour'); setCheckoutOpen(true); } catch { /* Toast handled by API interceptor. */ } finally { setAdding(false); } }}><ShoppingCart className="h-4 w-4" />{canBuy ? 'Ajouter au panier' : 'Produit indisponible'}</button><a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(product.name)}`}><Share2 className="h-4 w-4" />Partager</a></div>
        <div className="card p-5"><h2 className="font-heading text-xl font-bold">Description</h2><p className="mt-2 text-slate-700">{product.description}</p></div>
        <div className="grid gap-2 text-sm text-slate-600"><p>Livraison gratuite partout au Maroc.</p><p>Retour possible selon la politique de retour DOLPHIN.</p></div>
      </div>
      <div className="lg:col-span-2">{similar.data?.results.filter((item) => item.id !== product.id).length ? <section className="mt-6"><h2 className="mb-4 font-heading text-2xl font-bold">Produits similaires</h2><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{similar.data.results.filter((item) => item.id !== product.id).slice(0, 4).map((item) => <ProductCard key={item.id} product={item} />)}</div></section> : null}</div>
    </section>
  );
}
