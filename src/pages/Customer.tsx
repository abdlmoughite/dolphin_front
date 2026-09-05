import { Bell, Heart, MapPin, Package, Save, Trash2 } from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, CustomerAddress, CustomerNotification, Order, Paginated, WishlistItem } from '../lib/api';
import { money } from '../lib/i18n';
import { useAuth } from '../stores/auth';

const emptyAddress = { label: 'Maison', full_name: '', phone: '', address_line1: '', address_line2: '', city: '', postal_code: '', is_default: true };

export function CustomerDashboard() {
  const user = useAuth((state) => state.user);
  const boot = useAuth((state) => state.boot);
  const queryClient = useQueryClient();
  const [address, setAddress] = useState(emptyAddress);
  const [profile, setProfile] = useState({ first_name: user?.first_name || '', last_name: user?.last_name || '', phone: user?.phone || '' });
  const orders = useQuery({ queryKey: ['my-orders'], queryFn: async () => (await api.get<Paginated<Order>>('/orders/?ordering=-created_at')).data });
  const wishlist = useQuery({ queryKey: ['my-wishlist'], queryFn: async () => (await api.get<Paginated<WishlistItem>>('/wishlist/')).data });
  const notifications = useQuery({ queryKey: ['my-notifications'], queryFn: async () => (await api.get<Paginated<CustomerNotification>>('/notifications/?ordering=-created_at')).data });
  const addresses = useQuery({ queryKey: ['my-addresses'], queryFn: async () => (await api.get<Paginated<CustomerAddress>>('/addresses/')).data });

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    await api.patch('/auth/me/', profile);
    await boot();
    toast.success('Profil mis a jour');
  };
  const saveAddress = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/addresses/', address);
    setAddress(emptyAddress);
    await queryClient.invalidateQueries({ queryKey: ['my-addresses'] });
    toast.success('Adresse ajoutee');
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6"><p className="text-sm text-slate-500">Bienvenue {user?.first_name || user?.username}</p><h1 className="font-heading text-3xl font-bold">Mon compte</h1></div>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Package />} label="Commandes" value={orders.data?.count || 0} />
        <Metric icon={<Heart />} label="Favoris" value={wishlist.data?.count || 0} />
        <Metric icon={<Bell />} label="Notifications" value={notifications.data?.results.filter((item) => !item.is_read).length || 0} />
        <Metric icon={<MapPin />} label="Adresses" value={addresses.data?.count || 0} />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Historique des commandes"><div className="divide-y">{orders.data?.results.length ? orders.data.results.map((order) => <div key={order.id} className="grid gap-2 py-4 sm:grid-cols-3"><div><strong>{order.order_number}</strong><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></div><span className="badge w-fit bg-ocean/10 text-ocean">{order.status}</span><strong className="sm:text-right">{money(order.total)}</strong></div>) : <Empty text="Aucune commande pour le moment." />}</div></Panel>
        <Panel title="Mes favoris"><div className="divide-y">{wishlist.data?.results.length ? wishlist.data.results.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 py-3"><div><strong>{item.product.name}</strong><p className="text-sm text-ocean">{money(item.product.current_price)}</p></div><button className="rounded-full p-2 text-coral hover:bg-coral/10" aria-label="Supprimer des favoris" onClick={() => api.delete(`/wishlist/${item.id}/`).then(() => queryClient.invalidateQueries({ queryKey: ['my-wishlist'] }))}><Trash2 className="h-4 w-4" /></button></div>) : <Empty text="Votre liste de favoris est vide." />}</div></Panel>
        <Panel title="Mes notifications"><div className="divide-y">{notifications.data?.results.length ? notifications.data.results.map((item) => <button key={item.id} className={`w-full py-3 text-left ${item.is_read ? 'text-slate-500' : 'font-semibold'}`} onClick={() => !item.is_read && api.post(`/notifications/${item.id}/read/`).then(() => queryClient.invalidateQueries({ queryKey: ['my-notifications'] }))}><span>{item.title}</span><p className="text-sm font-normal">{item.message}</p></button>) : <Empty text="Aucune notification." />}</div></Panel>
        <Panel title="Mon profil"><form className="grid gap-3" onSubmit={saveProfile}><div className="grid gap-3 sm:grid-cols-2"><input className="input" value={profile.first_name} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} placeholder="Prenom" /><input className="input" value={profile.last_name} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} placeholder="Nom" /></div><input className="input" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Telephone" /><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form></Panel>
        <Panel title="Mes adresses"><div className="mb-4 grid gap-2">{addresses.data?.results.map((item) => <div key={item.id} className="rounded-dolphin border p-3"><div className="flex justify-between"><strong>{item.label}{item.is_default ? ' · Principale' : ''}</strong><button className="text-coral" aria-label="Supprimer l'adresse" onClick={() => api.delete(`/addresses/${item.id}/`).then(() => queryClient.invalidateQueries({ queryKey: ['my-addresses'] }))}><Trash2 className="h-4 w-4" /></button></div><p className="text-sm text-slate-600">{item.address_line1}, {item.city} · {item.phone}</p></div>)}</div><form className="grid gap-3" onSubmit={saveAddress}><div className="grid gap-3 sm:grid-cols-2"><input required className="input" value={address.label} onChange={(event) => setAddress({ ...address, label: event.target.value })} placeholder="Libelle" /><input required className="input" value={address.full_name} onChange={(event) => setAddress({ ...address, full_name: event.target.value })} placeholder="Nom complet" /><input required className="input" value={address.phone} onChange={(event) => setAddress({ ...address, phone: event.target.value })} placeholder="Telephone" /><input required className="input" value={address.city} onChange={(event) => setAddress({ ...address, city: event.target.value })} placeholder="Ville" /></div><input required className="input" value={address.address_line1} onChange={(event) => setAddress({ ...address, address_line1: event.target.value })} placeholder="Adresse" /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={address.is_default} onChange={(event) => setAddress({ ...address, is_default: event.target.checked })} /> Adresse principale</label><button className="btn-secondary">Ajouter l'adresse</button></form></Panel>
      </div>
    </section>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <div className="card p-5"><h2 className="mb-4 font-heading text-xl font-bold">{title}</h2>{children}</div>;
}

function Empty({ text }: { text: string }) {
  return <p className="py-5 text-center text-slate-500">{text}</p>;
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}
