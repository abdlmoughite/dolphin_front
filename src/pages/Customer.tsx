import { Bell, Heart, Package, RotateCcw, UserRound } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, Order, Paginated } from '../lib/api';
import { money } from '../lib/i18n';

export function CustomerDashboard() {
  const { data: orders } = useQuery({ queryKey: ['my-orders'], queryFn: async () => (await api.get<Paginated<Order>>('/orders/')).data });
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold">Mon compte</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Package />} label="Commandes" value={orders?.count || 0} />
        <Metric icon={<Heart />} label="Wishlist" value="-" />
        <Metric icon={<Bell />} label="Notifications" value="-" />
        <Metric icon={<UserRound />} label="Profil" value="Actif" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <h2 className="border-b p-4 font-heading text-xl font-bold">Historique commandes</h2>
          {orders?.results.map((order) => <div key={order.id} className="grid gap-2 border-b p-4 md:grid-cols-4"><strong>{order.order_number}</strong><span>{order.status}</span><span>{money(order.total)}</span><button className="btn-secondary"><RotateCcw className="h-4 w-4" />Recommander</button></div>)}
        </div>
        <aside className="card p-5"><h2 className="font-heading text-xl font-bold">Adresse et support</h2><p className="mt-2 text-slate-600">Gestion des adresses, tickets, retours, avis et coupons connectee aux endpoints proteges.</p></aside>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}

