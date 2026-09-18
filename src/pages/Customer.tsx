import { Bell, Heart, LogOut, MapPin, Package, RotateCcw, Save, Shield, UserRound } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, Order, Paginated, ReturnRequest } from '../lib/api';
import { money } from '../lib/i18n';
import { useAuth } from '../stores/auth';
import { Modal, PageHeader, StatusBadge } from '../components/ui';

type CustomerRow = Record<string, unknown> & { id: number };

export function CustomerDashboard() {
  const qc = useQueryClient();
  const { user, logout } = useAuth();
  const [ticketSubject, setTicketSubject] = useState('');
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [active, setActive] = useState('commandes');
  const [returnOrder, setReturnOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});
  const { data: orders } = useQuery({ queryKey: ['my-orders'], queryFn: async () => (await api.get<Paginated<Order>>('/orders/')).data });
  const { data: addresses } = useQuery({ queryKey: ['my-addresses'], queryFn: async () => (await api.get<Paginated<CustomerRow>>('/addresses/')).data });
  const { data: wishlist } = useQuery({ queryKey: ['my-wishlist'], queryFn: async () => (await api.get<Paginated<CustomerRow>>('/wishlist/')).data });
  const { data: notifications } = useQuery({ queryKey: ['my-notifications'], queryFn: async () => (await api.get<Paginated<CustomerRow>>('/notifications/')).data });
  const { data: tickets } = useQuery({ queryKey: ['my-support'], queryFn: async () => (await api.get<Paginated<CustomerRow>>('/support/')).data });
  const { data: returns } = useQuery({ queryKey: ['my-returns'], queryFn: async () => (await api.get<Paginated<ReturnRequest>>('/returns/')).data });
  const createTicket = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/support/', { subject: ticketSubject });
    toast.success('Ticket cree');
    setTicketSubject('');
    qc.invalidateQueries({ queryKey: ['my-support'] });
  };
  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/auth/password/change/', passwords);
    toast.success('Mot de passe modifie');
    setPasswords({ current_password: '', new_password: '' });
  };
  const createReturn = async (event: FormEvent) => {
    event.preventDefault();
    if (!returnOrder) return;
    const items_payload = returnOrder.items
      .map((item) => ({ order_item: item.id, quantity: returnQuantities[item.id] || 0 }))
      .filter((item) => item.quantity > 0);
    await api.post('/returns/', { order: returnOrder.id, reason: returnReason, items_payload });
    toast.success('Demande de retour creee');
    setReturnOrder(null);
    setReturnReason('');
    setReturnQuantities({});
    qc.invalidateQueries({ queryKey: ['my-returns'] });
  };
  const nav = ['commandes', 'profil', 'adresses', 'wishlist', 'notifications', 'retours', 'support', 'securite'];
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <PageHeader title="Mon compte" description={user?.email} actions={<button className="btn-secondary" onClick={() => logout().then(() => window.location.assign('/'))}><LogOut className="h-4 w-4" />Logout</button>} />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<Package />} label="Commandes" value={orders?.count || 0} />
        <Metric icon={<Heart />} label="Wishlist" value={wishlist?.count || 0} />
        <Metric icon={<Bell />} label="Notifications" value={notifications?.results.filter((row) => !row.is_read).length || 0} />
        <Metric icon={<UserRound />} label="Profil" value={user?.status || 'Actif'} />
      </div>
      <nav className="mt-8 flex gap-2 overflow-x-auto pb-2">{nav.map((item) => <button key={item} className={`btn-secondary shrink-0 capitalize ${active === item ? 'bg-mist' : ''}`} onClick={() => setActive(item)}>{item}</button>)}</nav>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        {active === 'commandes' && <div className="card overflow-hidden">
          <h2 className="border-b p-4 font-heading text-xl font-bold">Historique commandes</h2>
          {orders?.results.length ? orders.results.map((order) => <div key={order.id} className="grid gap-3 border-b p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center"><div><strong>{order.order_number}</strong><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></div><StatusBadge status={order.status} /><span>{money(order.total)}</span><button className="btn-secondary" disabled={order.status !== 'DELIVERED'} onClick={() => setReturnOrder(order)}><RotateCcw className="h-4 w-4" />Retour</button></div>) : <p className="p-4 text-slate-600">Aucune commande pour le moment.</p>}
        </div>}
        {active === 'retours' && <div className="card overflow-hidden"><h2 className="border-b p-4 font-heading text-xl font-bold">Retours</h2>{returns?.results.length ? returns.results.map((row) => <div key={row.id} className="border-b p-4"><div className="flex items-center justify-between gap-3"><strong>Retour #{row.id}</strong><StatusBadge status={row.status} /></div><p className="mt-2 text-sm text-slate-600">{row.reason}</p><div className="mt-3 grid gap-2">{row.items.map((item) => <p key={item.id} className="rounded-dolphin bg-mist p-2 text-sm">{item.product_name} - {item.quantity}/{item.ordered_quantity}</p>)}</div>{row.history?.length ? <p className="mt-2 text-xs text-slate-500">Dernier statut: {row.history[row.history.length - 1].to_status}</p> : null}</div>) : <p className="p-4 text-slate-600">Aucune demande de retour.</p>}</div>}
        {active === 'profil' && <div className="card p-5"><h2 className="font-heading text-xl font-bold">Profil</h2><div className="mt-4 grid gap-2 text-slate-700"><p>{user?.first_name} {user?.last_name}</p><p>{user?.phone || 'Telephone non renseigne'}</p><p>{user?.status}</p></div></div>}
        {active === 'adresses' && <Panel icon={<MapPin />} title="Adresses" rows={addresses?.results || []} columns={['label', 'full_name', 'city', 'phone']} />}
        {active === 'wishlist' && <Panel icon={<Heart />} title="Wishlist" rows={wishlist?.results || []} columns={['id', 'created_at']} />}
        {active === 'notifications' && <Panel icon={<Bell />} title="Notifications" rows={notifications?.results || []} columns={['title', 'message', 'is_read']} />}
        {active === 'support' && <div className="card p-5"><h2 className="mb-3 font-heading text-xl font-bold">Tickets support</h2><form className="mb-4 flex gap-2" onSubmit={createTicket}><input className="input" placeholder="Sujet du ticket" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} required /><button className="btn-primary"><Save className="h-4 w-4" />Creer</button></form><Panel icon={<Shield />} title="Historique support" rows={tickets?.results || []} columns={['subject', 'status', 'priority']} /></div>}
        {active === 'securite' && <form className="card grid gap-3 p-5" onSubmit={changePassword}><h2 className="font-heading text-xl font-bold">Mot de passe</h2><input className="input" type="password" placeholder="Mot de passe actuel" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} required /><input className="input" type="password" placeholder="Nouveau mot de passe" value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} required /><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form>}
        <aside className="grid gap-6">
          <Panel icon={<MapPin />} title="Adresses" rows={addresses?.results || []} columns={['label', 'city', 'phone']} />
          <Panel icon={<Bell />} title="Notifications" rows={notifications?.results || []} columns={['title', 'is_read']} />
          <Panel icon={<RotateCcw />} title="Retours" rows={returns?.results || []} columns={['order', 'status', 'reason']} />
          <form className="card grid gap-3 p-5" onSubmit={createTicket}>
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold"><Shield className="h-5 w-5 text-ocean" />Support</h2>
            <input className="input" placeholder="Sujet du ticket" value={ticketSubject} onChange={(event) => setTicketSubject(event.target.value)} required />
            <button className="btn-primary"><Save className="h-4 w-4" />Creer</button>
            <p className="text-sm text-slate-500">{tickets?.count || 0} ticket(s)</p>
          </form>
          <form className="card grid gap-3 p-5" onSubmit={changePassword}>
            <h2 className="font-heading text-xl font-bold">Mot de passe</h2>
            <input className="input" type="password" placeholder="Mot de passe actuel" value={passwords.current_password} onChange={(event) => setPasswords((current) => ({ ...current, current_password: event.target.value }))} required />
            <input className="input" type="password" placeholder="Nouveau mot de passe" value={passwords.new_password} onChange={(event) => setPasswords((current) => ({ ...current, new_password: event.target.value }))} required />
            <button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button>
          </form>
        </aside>
      </div>
      {returnOrder && <Modal title={`Retour ${returnOrder.order_number}`} onClose={() => setReturnOrder(null)}><form className="grid gap-4" onSubmit={createReturn}><textarea className="input min-h-28" placeholder="Motif du retour" value={returnReason} onChange={(event) => setReturnReason(event.target.value)} required />{returnOrder.items.map((item) => <label key={item.id} className="grid gap-1 font-semibold">{item.product_name}<input className="input" type="number" min={0} max={item.quantity} value={returnQuantities[item.id] || 0} onChange={(event) => setReturnQuantities((current) => ({ ...current, [item.id]: Number(event.target.value) }))} /></label>)}<button className="btn-primary">Envoyer la demande</button></form></Modal>}
    </section>
  );
}

function Panel({ icon, title, rows, columns }: { icon: JSX.Element; title: string; rows: CustomerRow[]; columns: string[] }) {
  return (
    <div className="card p-5">
      <h2 className="mb-3 flex items-center gap-2 font-heading text-xl font-bold">{icon}{title}</h2>
      <div className="grid gap-2 text-sm">
        {rows.length ? rows.slice(0, 3).map((row) => <div key={row.id} className="rounded-dolphin bg-mist p-3">{columns.map((column) => <p key={column}>{String(row[column] ?? '')}</p>)}</div>) : <p className="text-slate-600">Aucun element.</p>}
      </div>
    </div>
  );
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}

