import { Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { ReactNode, useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import logo from '../assets/dolphin-logo.svg';
import { useAuth } from '../stores/auth';
import { useCart } from '../stores/cart';

const nav = [
  ['Accueil', '/'],
  ['Catalogue', '/catalogue'],
  ['Promotions', '/promotions'],
  ['Nouveautes', '/nouveautes'],
  ['Marques', '/marques'],
  ['Aide', '/faq'],
];

export function StoreLayout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const cartCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return (
    <div className="min-h-screen bg-mist">
      <div className="bg-coral px-4 py-2 text-center text-sm font-bold text-white">Livraison gratuite des 600 DH selon la ville</div>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button className="md:hidden" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
          <Link to="/" className="shrink-0"><img src={logo} alt="DOLPHIN" className="h-12 w-auto" /></Link>
          <nav className="hidden items-center gap-5 md:flex">
            {nav.map(([label, to]) => <NavLink key={to} to={to} className={({ isActive }) => `font-semibold ${isActive ? 'text-ocean' : 'text-navy'}`}>{label}</NavLink>)}
          </nav>
          <form className="ml-auto hidden min-w-64 max-w-md flex-1 items-center gap-2 rounded-dolphin border border-slate-200 px-3 py-2 lg:flex">
            <Search className="h-5 w-5 text-ocean" /><input className="w-full bg-transparent" placeholder="Rechercher un produit" />
          </form>
          <Link to="/panier" aria-label="Panier" className="relative rounded-full p-2 hover:bg-mist"><ShoppingCart /><span className="absolute -right-1 -top-1 rounded-full bg-coral px-1.5 text-xs font-bold text-white">{cartCount}</span></Link>
          {user?.role === 'CUSTOMER' && <Link to="/compte" aria-label="Mon compte" className="rounded-full p-2 hover:bg-mist"><User /></Link>}
          {user && user.role !== 'CUSTOMER' && <><Link className="btn-secondary hidden sm:inline-flex" to={user.role === 'SUPER_ADMIN' ? '/developer' : '/admin/dashboard'}>Admin</Link><button className="btn-secondary hidden sm:inline-flex" onClick={logout}>Sortir</button></>}
          {!user && <Link to="/connexion" aria-label="Connexion" className="rounded-full p-2 hover:bg-mist"><User /></Link>}
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-navy/40 md:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-80 bg-white p-4" onClick={(e) => e.stopPropagation()}>
            <button className="mb-4 ml-auto block" onClick={() => setOpen(false)} aria-label="Fermer"><X /></button>
            <img src={logo} alt="DOLPHIN" className="mb-6 h-12" />
            <div className="grid gap-3">{nav.map(([label, to]) => <Link key={to} to={to} onClick={() => setOpen(false)} className="rounded-dolphin px-3 py-2 font-semibold hover:bg-mist">{label}</Link>)}</div>
          </aside>
        </div>
      )}
      <main><Outlet /></main>
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

function FooterBlock({ title, items }: { title: string; items: string[] }) {
  return <div><h3 className="mb-3 font-heading text-lg">{title}</h3><ul className="grid gap-2 text-white/80">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

export function AdminLayout() {
  const links = ['dashboard', 'products', 'categories', 'brands', 'imports', 'orders', 'inventory', 'customers', 'promotions', 'coupons', 'delivery-zones', 'banners', 'reviews', 'support', 'returns', 'settings', 'reports', 'audit-logs'];
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="bg-navy p-4 text-white md:min-h-screen md:w-64">
        <img src={logo} alt="DOLPHIN" className="mb-8 h-12 rounded bg-white p-1" />
        <nav className="grid gap-2">{links.map((link) => <NavLink key={link} to={`/admin/${link}`} className={({ isActive }) => `rounded-dolphin px-3 py-2 capitalize ${isActive ? 'bg-ocean' : 'hover:bg-white/10'}`}>{link}</NavLink>)}</nav>
      </aside>
      <section className="flex-1 p-4 md:p-8"><Outlet /></section>
    </div>
  );
}

export function PageShell({ title, children }: { title: string; children: ReactNode }) {
  return <section className="mx-auto max-w-7xl px-4 py-8"><h1 className="mb-6 font-heading text-3xl font-bold text-navy">{title}</h1>{children}</section>;
}
