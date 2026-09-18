import { CircleHelp, Clock3, Headphones, Instagram, MapPin, MessageCircle, Search, ShieldCheck, Tag, TrendingUp, Truck, WalletCards, Wand2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, Brand, Category, HomepageBanner, mediaUrl, Paginated, Product } from '../lib/api';
import { productQueryKeys } from '../lib/queryKeys';
import { ProductCard } from '../components/ProductCard';
import { EmptyState, LoadingGrid } from '../components/States';
import { ErrorState, PageHeader } from '../components/ui';

export function HomePage() {
  const [email, setEmail] = useState('');
  const featured = useQuery({ queryKey: [...productQueryKeys.home, 'featured'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&featured=true')).data });
  const newest = useQuery({ queryKey: productQueryKeys.newest, queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&new_arrival=true&ordering=-created_at')).data });
  const bestsellers = useQuery({ queryKey: [...productQueryKeys.home, 'bestsellers'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&bestseller=true&ordering=-sales_count')).data });
  const promotions = useQuery({ queryKey: productQueryKeys.promotions, queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&promotion=true')).data });
  const categories = useQuery({ queryKey: ['categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_active=true')).data });
  const banners = useQuery({ queryKey: ['banners'], queryFn: async () => (await api.get<Paginated<HomepageBanner>>('/banners/')).data });
  const banner = banners.data?.results?.[0];
  const subscribe = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/newsletter/subscribe/', { email });
    toast.success('Inscription newsletter confirmee');
    setEmail('');
  };
  return (
    <>
      <section className="wave px-4 py-12 md:py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-ocean/10 px-3 py-1 text-sm font-bold text-ocean">Marketplace multi-categories au Maroc</p>
            <h1 className="font-heading text-4xl font-extrabold leading-tight text-navy md:text-6xl">{banner?.title.replace('Demo | ', '') || 'DOLPHIN'}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-700">{banner?.subtitle || "Tout ce qu'il vous faut, au meme endroit. Produits selectionnes, promotions claires, livraison gratuite."}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Link className="btn-primary" to={banner?.cta_url || '/catalogue'}>{banner?.cta_label || 'Decouvrir les produits'}</Link><Link className="btn-secondary" to="/catalogue?promotion=true">Voir les offres</Link></div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {['Variantes disponibles', 'Paiement livraison', 'Retours suivis'].map((item) => <div key={item} className="panel p-4 text-sm font-bold text-navy">{item}</div>)}
            </div>
          </div>
          <div className="overflow-hidden rounded-[24px] bg-white shadow-xl ring-1 ring-slate-200">
            {banner?.image ? <img className="aspect-[4/3] w-full object-cover" src={mediaUrl(banner.image)} alt={banner.title} /> : <div className="grid aspect-[4/3] place-items-center bg-mist text-center font-heading text-3xl font-bold text-ocean">Offres flash DOLPHIN</div>}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <PageHeader title="Categories populaires" description="Accedez directement aux rayons publies depuis le backend Dolphin." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{categories.data?.results.slice(0, 10).map((cat) => <Link key={cat.id} to={`/catalogue?category=${cat.id}`} className="card overflow-hidden font-bold text-ocean">{cat.image && <img className="aspect-[5/3] w-full object-cover" src={mediaUrl(cat.image)} alt={cat.name} />}<div className="p-4">{cat.name}<p className="mt-1 text-sm font-normal text-slate-500">{cat.product_count || 0} produits</p></div></Link>)}</div>
      </section>
      <ProductShelf title="Produits populaires" icon={<TrendingUp className="h-5 w-5" />} query={featured} />
      <ProductShelf title="Nouveautes" icon={<Wand2 className="h-5 w-5" />} query={newest} />
      <ProductShelf title="Meilleures ventes" icon={<ShieldCheck className="h-5 w-5" />} query={bestsellers} />
      <ProductShelf title="Promotions" icon={<Tag className="h-5 w-5" />} query={promotions} />
      <section className="bg-white px-4 py-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          {[['Livraison gratuite', Truck], ['Paiement securise', WalletCards], ['Support verifie', ShieldCheck]].map(([label, Icon]) => <div key={String(label)} className="rounded-dolphin border border-slate-200 p-5"><Icon className="mb-3 text-ocean" /><h3 className="font-heading text-lg font-bold">{String(label)}</h3><p className="text-slate-600">Pourquoi choisir DOLPHIN: prix clairs, suivi commande et service client en francais.</p></div>)}
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-12"><div className="card grid gap-4 p-6 md:grid-cols-[1fr_auto]"><div><h2 className="font-heading text-2xl font-bold">Newsletter</h2><p className="text-slate-600">Recevez les nouveautes et promotions publiees par Dolphin.</p></div><form className="flex gap-2" onSubmit={subscribe}><label className="sr-only">Email newsletter</label><input className="input" type="email" placeholder="email@exemple.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><button className="btn-primary">S'inscrire</button></form></div></section>
    </>
  );
}

function ProductShelf({ title, icon, query }: { title: string; icon: JSX.Element; query: ReturnType<typeof useQuery<Paginated<Product>>> }) {
  const products = query.data?.results.slice(0, 8) || [];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-heading text-2xl font-bold">{icon}{title}</h2>
        <Link className="btn-secondary" to={title === 'Promotions' ? '/catalogue?promotion=true' : '/catalogue'}>Voir tout</Link>
      </div>
      {query.isLoading ? <LoadingGrid /> : query.isError ? <ErrorState onRetry={() => query.refetch()} /> : products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <EmptyState title="Aucun produit disponible pour le moment." text="" />}
    </section>
  );
}

export function SimplePage({ title }: { title: string }) {
  return <section className="mx-auto max-w-7xl px-4 py-10"><h1 className="font-heading text-3xl font-bold">{title}</h1><div className="card mt-6 p-6 text-slate-700">Cette section est structuree pour contenu administrable, SEO, et extension multilingue future.</div></section>;
}

export function PromotionsPage() {
  const products = useQuery({ queryKey: [...productQueryKeys.promotions, 'page'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&promotion=true&ordering=regular_price')).data });
  const featured = products.data?.results.slice(0, 3) || [];
  return (
    <section>
      <div className="bg-white px-4 py-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-2 flex items-center gap-2 font-bold text-coral"><Tag className="h-5 w-5" />Offres en cours</p>
            <h1 className="font-heading text-4xl font-extrabold text-navy">Promotions DOLPHIN</h1>
            <p className="mt-3 max-w-2xl text-slate-600">Selections a prix reduits avec variantes disponibles et livraison gratuite partout au Maroc.</p>
          </div>
          <div className="grid min-w-56 content-center rounded-dolphin border border-coral/30 bg-coral/10 p-5 text-coral">
            <strong className="text-3xl">{products.data?.count || 0}</strong>
            <span className="font-semibold">produits en promotion</span>
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-10">
        {products.isLoading ? <LoadingGrid /> : products.isError ? <ErrorState onRetry={() => products.refetch()} /> : products.data?.results.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="Aucun produit disponible pour le moment." text="" />}
      </div>
      {!!featured.length && <section className="bg-mist px-4 py-10"><div className="mx-auto max-w-7xl"><h2 className="mb-5 font-heading text-2xl font-bold">A saisir rapidement</h2><div className="grid gap-4 md:grid-cols-3">{featured.map((product) => <Link key={product.id} to={`/produit/${product.slug}`} className="rounded-dolphin bg-white p-5 shadow-sm"><span className="badge bg-coral text-white">-{product.discount_percent}%</span><h3 className="mt-3 font-heading text-xl font-bold text-navy">{product.name}</h3><p className="mt-2 text-sm text-slate-600">{product.short_description}</p></Link>)}</div></div></section>}
    </section>
  );
}

export function NewArrivalsPage() {
  const products = useQuery({ queryKey: [...productQueryKeys.newest, 'page'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&new_arrival=true&ordering=-created_at')).data });
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 flex items-center gap-2 font-bold text-ocean"><Wand2 className="h-5 w-5" />Dernieres selections</p>
          <h1 className="font-heading text-4xl font-extrabold text-navy">Nouveautes</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Les derniers produits ajoutes au catalogue DOLPHIN, prets pour la navigation, le panier et le checkout.</p>
        </div>
        <Link className="btn-secondary" to="/catalogue?ordering=-created_at">Tout le catalogue</Link>
      </div>
      {products.isLoading ? <LoadingGrid /> : products.isError ? <ErrorState onRetry={() => products.refetch()} /> : products.data?.results.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.data.results.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <EmptyState title="Aucun produit disponible pour le moment." text="" />}
    </section>
  );
}

export function BrandsPage() {
  const brands = useQuery({ queryKey: ['brands-page'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const products = useQuery({ queryKey: productQueryKeys.brands, queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&ordering=-sales_count')).data });
  const countForBrand = (brandId: number) => products.data?.results.filter((product) => product.brand?.id === brandId).length || 0;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-8">
        <p className="mb-2 flex items-center gap-2 font-bold text-ocean"><ShieldCheck className="h-5 w-5" />Marques disponibles</p>
        <h1 className="font-heading text-4xl font-extrabold text-navy">Marques</h1>
        <p className="mt-3 max-w-2xl text-slate-600">Parcourez les marques referencees dans le catalogue et filtrez rapidement les produits associes.</p>
      </div>
      {brands.isLoading ? <LoadingGrid /> : brands.data?.results.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{brands.data.results.map((brand) => <Link key={brand.id} to={`/catalogue?brand=${brand.id}`} className="card grid min-h-44 content-between p-5"><div className="flex items-center justify-between gap-3"><div className="grid h-14 w-14 place-items-center rounded-dolphin bg-mist font-heading text-xl font-bold text-ocean">{brand.logo ? <img className="h-full w-full rounded-dolphin object-cover" src={mediaUrl(brand.logo)} alt={brand.name} /> : brand.name.slice(0, 2).toUpperCase()}</div><span className="badge bg-mist text-ocean">{countForBrand(brand.id)} produits</span></div><div><h2 className="font-heading text-xl font-bold text-navy">{brand.name}</h2><p className="mt-2 text-sm text-slate-600">Voir les produits de cette marque.</p></div></Link>)}</div> : <EmptyState title="Aucune marque" text="Les marques seront affichees apres publication du catalogue." />}
    </section>
  );
}

export function HelpPage() {
  const topics = [
    ['Commande', 'Ajoutez vos produits au panier, choisissez votre ville et confirmez le paiement a la livraison.'],
    ['Livraison', 'La livraison est gratuite. Les delais varient selon la ville: generalement 24-96h.'],
    ['Paiement', 'Le paiement a la livraison est disponible sur les zones actives du backend.'],
    ['Retours', 'Les demandes de retour sont suivies depuis le service client selon le statut de la commande.'],
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div>
          <p className="mb-2 flex items-center gap-2 font-bold text-ocean"><CircleHelp className="h-5 w-5" />Support DOLPHIN</p>
          <h1 className="font-heading text-4xl font-extrabold text-navy">Aide et contact</h1>
          <p className="mt-3 max-w-2xl text-slate-600">Les reponses essentielles pour commander, suivre une livraison et contacter l'equipe.</p>
          <div className="mt-8 grid gap-4">
            {topics.map(([title, text]) => <details key={title} className="rounded-dolphin border border-slate-200 bg-white p-5" open={title === 'Commande'}><summary className="cursor-pointer font-heading text-lg font-bold text-navy">{title}</summary><p className="mt-3 text-slate-600">{text}</p></details>)}
          </div>
        </div>
        <aside className="grid content-start gap-4">
          <div className="card p-5"><h2 className="font-heading text-xl font-bold">Contact rapide</h2><div className="mt-4 grid gap-3 text-sm text-slate-700"><a className="flex items-center gap-2 font-semibold hover:text-ocean" href="https://www.instagram.com/dolphin.officiel?stkn=MWtjbjgyam9meW9udQ==" target="_blank" rel="noreferrer"><Instagram className="h-4 w-4 text-ocean" />Instagram</a><a className="flex items-center gap-2 font-semibold hover:text-ocean" href="https://wa.me/212663336488" target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4 text-ocean" />0663336488</a><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-ocean" />Casablanca, Maroc</p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-ocean" />Lun-Sam, 9h-18h</p></div></div>
          <div className="card p-5"><h2 className="font-heading text-xl font-bold">Actions utiles</h2><div className="mt-4 grid gap-3"><Link className="btn-primary" to="/catalogue"><Search className="h-4 w-4" />Catalogue</Link><Link className="btn-secondary" to="/checkout"><Truck className="h-4 w-4" />Checkout</Link><a className="btn-secondary" href="https://wa.me/212612345678"><MessageCircle className="h-4 w-4" />WhatsApp</a></div></div>
        </aside>
      </div>
    </section>
  );
}
