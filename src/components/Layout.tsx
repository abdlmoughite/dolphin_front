import { Instagram, Menu, MessageCircle, Search, ShoppingCart, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { FormEvent, ReactNode, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import logo from '../assets/dolphin-logo.jpeg';
import { CheckoutFormPanel } from '../pages/CartCheckout';
import { api, HomeDesignSettings } from '../lib/api';
import { useAuth } from '../stores/auth';
import { useCart } from '../stores/cart';

const nav = [
  ['Accueil', '/'],
  ['Catalogue', '/catalogue'],
  ['Promotions', '/promotions'],
  ['Aide', '/faq'],
];

export function StoreLayout() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { user, logout } = useAuth();
  const { cart, checkoutOpen, setCheckoutOpen } = useCart();
  const design = useQuery({ queryKey: ['home-design'], queryFn: async () => (await api.get<HomeDesignSettings>('/settings/design/')).data });
  const navigate = useNavigate();
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const announcement = design.data?.announcement_text || 'Livraison gratuite partout au Maroc';
  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/catalogue${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`);
    setOpen(false);
  };
  return (
    <div className="min-h-screen bg-[#f6fbfd]">
      {announcement && <div className="px-4 py-2 text-center text-sm font-bold" style={{ backgroundColor: design.data?.announcement_bg_color || '#FF6B4A', color: design.data?.announcement_text_color || '#FFFFFF' }}>{announcement}</div>}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
          <Link to="/" className="shrink-0"><img src={logo} alt="DOLPHIN" className="h-12 w-auto" /></Link>
          <nav className="hidden items-center gap-5 md:flex">
            {nav.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `font-semibold ${isActive ? 'text-ocean' : 'text-navy'}`}>{label}</NavLink>)}
          </nav>
          <form className="ml-auto hidden min-w-64 max-w-md flex-1 items-center gap-2 rounded-dolphin border border-slate-200 px-3 py-2 lg:flex" onSubmit={submitSearch}>
            <Search className="h-5 w-5 text-ocean" /><input className="w-full bg-transparent" placeholder="Rechercher un produit" value={search} onChange={(event) => setSearch(event.target.value)} />
          </form>
          <Link to="/panier" aria-label="Panier" className="relative rounded-full p-2 hover:bg-mist"><ShoppingCart /><span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 text-xs font-bold text-white">{cartCount}</span></Link>
          {user?.role === 'SUPER_ADMIN' && <><Link className="btn-secondary hidden sm:inline-flex" to="/developer">Developer</Link><button className="btn-secondary hidden sm:inline-flex" onClick={logout}>Sortir</button></>}
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-navy/40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-80 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <button className="mb-4 ml-auto block" onClick={() => setOpen(false)} aria-label="Fermer"><X /></button>
            <img src={logo} alt="DOLPHIN" className="mb-6 h-12" />
            <form className="mb-4 flex items-center gap-2 rounded-dolphin border px-3 py-2" onSubmit={submitSearch}><Search className="h-4 w-4 text-ocean" /><input className="w-full bg-transparent" placeholder="Rechercher" value={search} onChange={(event) => setSearch(event.target.value)} /></form>
            <div className="grid gap-3">{nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-dolphin px-3 py-2 font-semibold hover:bg-mist">{label}</Link>)}</div>
            <div className="mt-6 grid gap-3 border-t pt-4">
              <Link className="btn-primary" to="/panier" onClick={() => setOpen(false)}>Panier ({cartCount})</Link>
              {user?.role === 'SUPER_ADMIN' && <Link className="btn-secondary" to="/developer" onClick={() => setOpen(false)}>Developer</Link>}
              {user ? <button className="btn-secondary" onClick={() => logout().then(() => setOpen(false))}>Sortir</button> : <Link className="btn-secondary" to="/connexion" onClick={() => setOpen(false)}>Connexion</Link>}
            </div>
          </aside>
        </div>
      )}
      <main><Outlet /></main>
      <CheckoutSidePanel open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <FloatingSocialLinks />
      <footer className="mt-16 bg-navy px-4 py-10 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
          <div><img src={logo} alt="DOLPHIN" className="mb-3 h-12 rounded bg-white p-1" /><p>Tout ce qu'il vous faut, au meme endroit.</p></div>
          <FooterBlock title="Boutique" items={['Promotions', 'Nouveautes', 'Best sellers', 'Marques']} />
          <FooterBlock title="Service" items={['Contact', 'FAQ', 'Livraison', 'Retours']} />
          <FooterBlock title="Legal" items={['Confidentialite', 'Conditions', 'Factures', 'Support']} />
        </div>
      </footer>
    </div>
  );
}

function CheckoutSidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-navy/40 backdrop-blur-sm" onClick={onClose}>
      <aside className="ml-auto grid h-full w-full max-w-lg grid-rows-[auto_1fr] bg-[#f6fbfd] shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b bg-white px-4 py-3">
          <div>
            <h2 className="font-heading text-xl font-bold text-navy">Checkout / إتمام الطلب</h2>
            <p className="text-sm text-slate-500">Completez vos informations / كمل معلوماتك</p>
          </div>
          <button className="rounded-full p-2 text-navy hover:bg-mist" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="overflow-y-auto p-4">
          <CheckoutFormPanel onSubmitted={onClose} />
        </div>
      </aside>
    </div>
  );
}

function FloatingSocialLinks() {
  return (
    <div className="fixed bottom-5 right-4 z-40 flex flex-col gap-3 sm:bottom-6 sm:right-6">
      <a
        href="https://www.instagram.com/dolphin.officiel?stkn=MWtjbjgyam9meW9udQ=="
        target="_blank"
        rel="noreferrer"
        aria-label="Instagram Dolphin"
        title="Instagram"
        className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#515bd4] text-white shadow-lg ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2"
      >
        <Instagram className="h-6 w-6" />
      </a>
      <a
        href="https://wa.me/212663336488"
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp Dolphin"
        title="WhatsApp"
        className="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-lg ring-1 ring-white/60 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ocean focus-visible:ring-offset-2"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}

function FooterBlock({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="mb-3 font-heading text-lg">{title}</h3><ul className="grid gap-2 text-white/80">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-8"><h1 className="mb-6 font-heading text-3xl font-bold text-navy">{title}</h1>{children}</section>;
}
