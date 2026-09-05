import { Activity, Bell, Boxes, Check, Download, Edit, FileClock, Gauge, LayoutDashboard, Package, Save, Search, Settings, Shield, ShoppingBag, Tag, Truck, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, downloadFile, Paginated, Product, User } from '../lib/api';
import { money } from '../lib/i18n';

type DeveloperMetrics = {
  revenue_total: string;
  revenue_today: string;
  revenue_month: string;
  total_orders: number;
  new_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  average_order_value: string;
  products_total: number;
  products_active: number;
  out_of_stock_products: number;
  low_stock_products: number;
  customers_total: number;
  customers_new: number;
  unread_notifications: number;
  orders_by_status: Record<string, number>;
  sales_by_day: { day: string; sales: string }[];
  top_products: { id: number; name: string; sku: string; sales_count: number }[];
  latest_orders: { id: number; order_number: string; status: string; shipping_full_name: string; shipping_city: string; total: string; created_at: string }[];
};
type AuditLog = { id: number; actor_email?: string; action: string; entity: string; entity_id: string; created_at: string; ip_address?: string };
type InventoryRow = { variant_id: number; product: string; sku: string; status: string; quantity: number; reserved_quantity: number; low_stock_threshold: number; is_low_stock: boolean };
type OrderRow = {
  id: number;
  order_number: string;
  guest_email: string;
  status: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  total: string;
  payment_method: string;
  customer_note: string;
  internal_note: string;
  tracking_number: string;
  created_at: string;
  items: { id: number; product_name: string; variant_label: string; sku: string; unit_price: string; quantity: number; total: string }[];
  status_history: { id: number; from_status: string; to_status: string; note: string; created_at: string }[];
};
type SystemInfo = { backend_status: string; api_status: string; database_status: string; environment: string; server_time: string; python_version: string; django_version: string; media_root_exists: boolean; counts: Record<string, number>; last_activity?: { action: string; entity: string; created_at: string } };

const sections = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['products', 'Produits', Package],
  ['orders', 'Commandes', ShoppingBag],
  ['users', 'Utilisateurs', Users],
  ['inventory', 'Stock', Boxes],
  ['promotions', 'Promotions', Tag],
  ['settings', 'Settings', Settings],
  ['logs', 'Audit logs', FileClock],
  ['system', 'System', Activity],
];

export function DeveloperPage() {
  const { section = 'dashboard' } = useParams();
  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <aside className="bg-navy p-4 text-white md:min-h-screen md:w-72">
        <div className="mb-6 flex items-center gap-3 rounded-dolphin bg-white/10 p-3"><Shield className="h-8 w-8 text-sky-200" /><div><p className="font-heading text-lg font-bold">Developer</p><p className="text-xs text-white/70">Super Admin Panel</p></div></div>
        <nav className="grid gap-2">{sections.map(([key, label, Icon]) => <NavLink key={key as string} to={`/developer/${key}`} className={({ isActive }) => `flex items-center gap-2 rounded-dolphin px-3 py-2 font-semibold ${isActive || section === key ? 'bg-ocean' : 'hover:bg-white/10'}`}><Icon className="h-4 w-4" />{label as string}</NavLink>)}</nav>
      </aside>
      <main className="flex-1">
        <div className="sticky top-0 z-20 border-b bg-white/95 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-slate-500">Developer / {section}</span><div className="ml-auto flex items-center gap-2 rounded-dolphin border px-3 py-2"><Search className="h-4 w-4 text-ocean" /><input className="bg-transparent text-sm" placeholder="Search dashboard" /></div><Bell className="h-5 w-5 text-ocean" /></div>
        </div>
        <div className="p-4 md:p-8"><DeveloperSection section={section} /></div>
      </main>
    </div>
  );
}

function DeveloperSection({ section }: { section: string }) {
  if (section === 'products') return <DeveloperProducts />;
  if (section === 'orders') return <DeveloperOrders />;
  if (section === 'users') return <DeveloperUsers />;
  if (section === 'inventory') return <DeveloperInventory />;
  if (section === 'promotions') return <DeveloperPromotions />;
  if (section === 'settings') return <DeveloperSettings />;
  if (section === 'logs') return <DeveloperLogs />;
  if (section === 'system') return <DeveloperSystem />;
  return <DeveloperDashboard />;
}

function DeveloperDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ['developer-dashboard'], queryFn: async () => (await api.get<DeveloperMetrics>('/developer/dashboard/')).data });
  if (isLoading) return <div className="skeleton h-96" />;
  const statusData = Object.entries(data?.orders_by_status || {}).map(([name, value]) => ({ name, value }));
  return (
    <div className="grid gap-6">
      <h1 className="font-heading text-3xl font-bold">Developer dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Ventes totales" value={money(data?.revenue_total || 0)} icon={<Gauge />} />
        <Stat label="Ventes aujourd'hui" value={money(data?.revenue_today || 0)} icon={<Activity />} />
        <Stat label="Commandes" value={data?.total_orders || 0} icon={<ShoppingBag />} />
        <Stat label="Stock bas" value={data?.low_stock_products || 0} icon={<Boxes />} />
        <Stat label="Produits actifs" value={data?.products_active || 0} icon={<Package />} />
        <Stat label="Clients" value={data?.customers_total || 0} icon={<Users />} />
        <Stat label="Annulees" value={data?.cancelled_orders || 0} icon={<Tag />} />
        <Stat label="Panier moyen" value={money(data?.average_order_value || 0)} icon={<Gauge />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Ventes des 7 derniers jours"><ResponsiveContainer width="100%" height={280}><AreaChart data={data?.sales_by_day || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area type="monotone" dataKey="sales" stroke="#0077B6" fill="#48CAE4" /></AreaChart></ResponsiveContainer></Panel>
        <Panel title="Commandes par statut"><ResponsiveContainer width="100%" height={280}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={95}>{statusData.map((_, i) => <Cell key={i} fill={['#0077B6', '#48CAE4', '#FF7A59', '#0B1F33', '#94A3B8'][i % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Panel>
      </div>
      <div className="grid gap-6 xl:grid-cols-2"><SimpleTable title="Top produits" rows={data?.top_products || []} columns={['name', 'sku', 'sales_count']} /><SimpleTable title="Dernieres commandes" rows={data?.latest_orders || []} columns={['order_number', 'status', 'shipping_city', 'total']} /></div>
    </div>
  );
}

function DeveloperProducts() {
  const products = useQuery({ queryKey: ['developer-products'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?ordering=-created_at')).data });
  return <ResourcePage title="Produits" exportKind="products"><SimpleTable rows={products.data?.results || []} columns={['name', 'sku', 'status', 'current_price', 'source_type']} /></ResourcePage>;
}

function DeveloperOrders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<OrderRow | null>(null);
  const [cancelOrder, setCancelOrder] = useState<OrderRow | null>(null);
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (statusFilter) params.set('status', statusFilter);
  params.set('ordering', '-created_at');
  const orders = useQuery({ queryKey: ['developer-orders', search, statusFilter], queryFn: async () => (await api.get<Paginated<OrderRow>>(`/orders/?${params}`)).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ['developer-orders'] });
  const transition = async (order: OrderRow, status: string, extra: Record<string, string> = {}) => {
    await api.post(`/orders/${order.id}/transition/`, { status, ...extra });
    toast.success('Statut mis a jour');
    setCancelOrder(null);
    refresh();
  };
  return (
    <ResourcePage title="Commandes" exportKind="orders">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher commande, client, telephone" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input max-w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tous les statuts</option>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Commande</th><th className="p-3">Client</th><th className="p-3">Telephone</th><th className="p-3">Ville</th><th className="p-3">Total</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{orders.data?.results.map((order) => <tr key={order.id} className="border-t"><td className="p-3 font-semibold">{order.order_number}<p className="text-xs font-normal text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></td><td className="p-3">{order.shipping_full_name}<p className="text-xs text-slate-500">{order.guest_email}</p></td><td className="p-3">{order.shipping_phone}</td><td className="p-3">{order.shipping_city}</td><td className="p-3 font-semibold">{money(order.total)}</td><td className="p-3"><span className={`badge ${order.status === 'CANCELLED' ? 'bg-coral text-white' : 'bg-ocean/10 text-ocean'}`}>{statusLabel(order.status)}</span></td><td className="min-w-80 p-3"><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setEditing(order)}><Edit className="h-4 w-4" />Modifier</button><button className="btn-secondary" disabled={order.status !== 'PENDING'} onClick={() => transition(order, 'CONFIRMED')}><Check className="h-4 w-4" />Confirmer</button><button className="btn-secondary" disabled={!['CONFIRMED', 'PREPARING'].includes(order.status)} onClick={() => transition(order, order.status === 'CONFIRMED' ? 'PREPARING' : 'SHIPPED')}><Truck className="h-4 w-4" />Avancer</button><button className="btn-secondary text-coral" disabled={['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(order.status)} onClick={() => setCancelOrder(order)}><X className="h-4 w-4" />Annuler</button></div></td></tr>)}</tbody></table></div>
        {!orders.data?.results.length && <div className="p-6 text-center text-slate-500">Aucune commande.</div>}
        {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
        {cancelOrder && <CancelOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={(reason, note) => transition(cancelOrder, 'CANCELLED', { cancellation_reason: reason, note })} />}
      </div>
    </ResourcePage>
  );
}

const orderStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];
const cancelReasons = [
  ['NO_RESPONSE_1', 'Pas reponse 1'],
  ['NO_RESPONSE_2', 'Pas reponse 2'],
  ['NO_RESPONSE_3', 'Pas reponse 3'],
  ['VOICEMAIL', 'Boite vocale'],
  ['REFUSED', 'Refuse'],
  ['OTHER', 'Autre raison'],
];

function statusLabel(status: string) {
  return ({
    PENDING: 'En attente',
    CONFIRMED: 'Confirmee',
    PREPARING: 'Preparation',
    SHIPPED: 'Expediee',
    OUT_FOR_DELIVERY: 'En livraison',
    DELIVERED: 'Livree',
    CANCELLED: 'Annulee',
    RETURN_REQUESTED: 'Retour demande',
    RETURNED: 'Retournee',
    REFUNDED: 'Remboursee',
  } as Record<string, string>)[status] || status;
}

function OrderEditModal({ order, onClose, onSaved }: { order: OrderRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    shipping_full_name: order.shipping_full_name || '',
    shipping_phone: order.shipping_phone || '',
    shipping_address: order.shipping_address || '',
    shipping_city: order.shipping_city || '',
    guest_email: order.guest_email || '',
    tracking_number: order.tracking_number || '',
    customer_note: order.customer_note || '',
    internal_note: order.internal_note || '',
  });
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    await api.patch(`/orders/${order.id}/update_details/`, form);
    toast.success('Commande modifiee');
    onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4">
      <form className="card mx-auto grid max-w-4xl gap-4 p-6" onSubmit={save}>
        <div className="flex items-center justify-between"><div><h2 className="font-heading text-2xl font-bold">Modifier commande</h2><p className="text-sm text-slate-500">{order.order_number} - {statusLabel(order.status)}</p></div><button type="button" onClick={onClose}><X /></button></div>
        <div className="grid gap-4 md:grid-cols-2"><input className="input" placeholder="Nom client" value={form.shipping_full_name} onChange={(e) => set('shipping_full_name', e.target.value)} /><input className="input" placeholder="Telephone" value={form.shipping_phone} onChange={(e) => set('shipping_phone', e.target.value)} /><input className="input" placeholder="Email invite" value={form.guest_email} onChange={(e) => set('guest_email', e.target.value)} /><input className="input" placeholder="Ville" value={form.shipping_city} onChange={(e) => set('shipping_city', e.target.value)} /><input className="input md:col-span-2" placeholder="Adresse" value={form.shipping_address} onChange={(e) => set('shipping_address', e.target.value)} /><input className="input md:col-span-2" placeholder="Tracking number" value={form.tracking_number} onChange={(e) => set('tracking_number', e.target.value)} /></div>
        <div className="grid gap-4 md:grid-cols-2"><textarea className="input min-h-28" placeholder="Note client" value={form.customer_note} onChange={(e) => set('customer_note', e.target.value)} /><textarea className="input min-h-28" placeholder="Note interne admin" value={form.internal_note} onChange={(e) => set('internal_note', e.target.value)} /></div>
        <div className="card bg-mist p-4"><h3 className="mb-3 font-heading text-lg font-bold">Produits</h3><div className="grid gap-2">{order.items.map((item) => <div key={item.id} className="grid gap-2 rounded-dolphin bg-white p-3 text-sm md:grid-cols-[1fr_auto_auto]"><span>{item.product_name} <span className="text-slate-500">{item.variant_label}</span></span><span>Qty: {item.quantity}</span><strong>{money(item.total)}</strong></div>)}</div></div>
        <div className="card bg-mist p-4"><h3 className="mb-3 font-heading text-lg font-bold">Historique status</h3><div className="grid gap-2">{order.status_history.map((event) => <div key={event.id} className="rounded-dolphin bg-white p-3 text-sm"><strong>{statusLabel(event.to_status)}</strong><span className="text-slate-500"> - {new Date(event.created_at).toLocaleString('fr-MA')}</span>{event.note && <p className="mt-1 text-slate-600">{event.note}</p>}</div>)}</div></div>
        <button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button>
      </form>
    </div>
  );
}

function CancelOrderModal({ order, onClose, onConfirm }: { order: OrderRow; onClose: () => void; onConfirm: (reason: string, note: string) => void }) {
  const [reason, setReason] = useState('NO_RESPONSE_1');
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
      <div className="card grid w-full max-w-lg gap-4 p-6">
        <div className="flex items-center justify-between"><div><h2 className="font-heading text-2xl font-bold">Annuler commande</h2><p className="text-sm text-slate-500">{order.order_number}</p></div><button onClick={onClose}><X /></button></div>
        <label className="grid gap-1 font-semibold">Raison<select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>{cancelReasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <textarea className="input min-h-28" placeholder="Commentaire interne optionnel" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={onClose}>Fermer</button><button className="btn-primary bg-coral" onClick={() => onConfirm(reason, note)}>Confirmer annulation</button></div>
      </div>
    </div>
  );
}

function DeveloperUsers() {
  const qc = useQueryClient();
  const users = useQuery({ queryKey: ['developer-users'], queryFn: async () => (await api.get<Paginated<User>>('/admin/staff/?ordering=-date_joined')).data });
  const update = async (id: number, patch: Partial<User>) => {
    await api.patch(`/admin/staff/${id}/`, patch);
    toast.success('Utilisateur mis a jour');
    qc.invalidateQueries({ queryKey: ['developer-users'] });
  };
  return (
    <ResourcePage title="Utilisateurs" exportKind="customers">
      <div className="card overflow-hidden"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Email</th><th className="p-3">Nom</th><th className="p-3">Role</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{users.data?.results.map((user) => <tr key={user.id} className="border-t"><td className="p-3">{user.email}</td><td className="p-3">{user.first_name} {user.last_name}</td><td className="p-3">{user.role}</td><td className="p-3">{user.status}</td><td className="flex gap-2 p-3"><select className="input" value={user.role} onChange={(e) => update(user.id, { role: e.target.value })}><option value="CUSTOMER">CUSTOMER</option><option value="MANAGER">MANAGER</option><option value="ORDER_OPERATOR">ORDER_OPERATOR</option><option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option><option value="SUPER_ADMIN">SUPER_ADMIN</option></select><button className="btn-secondary" onClick={() => update(user.id, { status: user.status === 'ACTIVE' ? 'BLOCKED' : 'ACTIVE' })}>{user.status === 'ACTIVE' ? 'Bloquer' : 'Activer'}</button></td></tr>)}</tbody></table></div>
    </ResourcePage>
  );
}

function DeveloperInventory() {
  const inventory = useQuery({ queryKey: ['developer-inventory'], queryFn: async () => (await api.get<{ count: number; results: InventoryRow[] }>('/developer/inventory/')).data });
  return <ResourcePage title="Inventory"><SimpleTable rows={inventory.data?.results || []} columns={['product', 'sku', 'quantity', 'reserved_quantity', 'low_stock_threshold', 'is_low_stock']} /></ResourcePage>;
}

function DeveloperPromotions() {
  const products = useQuery({ queryKey: ['developer-promotions'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?promotion=true')).data });
  return <ResourcePage title="Promotions"><SimpleTable rows={products.data?.results || []} columns={['name', 'sku', 'regular_price', 'current_price', 'discount_percent']} /></ResourcePage>;
}

function DeveloperSettings() {
  return <ResourcePage title="Settings"><div className="grid gap-4 md:grid-cols-2"><InfoCard title="Store" rows={['Nom: DOLPHIN', 'Devise: MAD', 'Pays: Maroc']} /><InfoCard title="Securite" rows={['Secrets masques', 'JWT actif', 'Media local configurable']} /></div></ResourcePage>;
}

function DeveloperLogs() {
  const logs = useQuery({ queryKey: ['developer-logs'], queryFn: async () => (await api.get<Paginated<AuditLog>>('/developer/audit-logs/')).data });
  return <ResourcePage title="Audit logs"><SimpleTable rows={logs.data?.results || []} columns={['created_at', 'actor_email', 'action', 'entity', 'entity_id', 'ip_address']} /></ResourcePage>;
}

function DeveloperSystem() {
  const system = useQuery({ queryKey: ['developer-system'], queryFn: async () => (await api.get<SystemInfo>('/developer/system/')).data });
  return <ResourcePage title="System status"><div className="grid gap-4 md:grid-cols-3"><InfoCard title="Backend" rows={[`Status: ${system.data?.backend_status}`, `Django: ${system.data?.django_version}`, `Python: ${system.data?.python_version}`]} /><InfoCard title="Database" rows={[`Status: ${system.data?.database_status}`, `API: ${system.data?.api_status}`, `Env: ${system.data?.environment}`]} /><InfoCard title="Storage" rows={[`Media: ${system.data?.media_root_exists ? 'ready' : 'missing'}`, `Server time: ${system.data?.server_time ? new Date(system.data.server_time).toLocaleString('fr-MA') : ''}`, `Last: ${system.data?.last_activity?.action || 'none'}`]} /></div></ResourcePage>;
}

function ResourcePage({ title, exportKind, children }: { title: string; exportKind?: string; children: JSX.Element }) {
  return <div><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">{title}</h1>{exportKind && <button className="btn-secondary" onClick={() => downloadFile(`/developer/export/${exportKind}/`, `dolphin-${exportKind}.csv`)}><Download className="h-4 w-4" />Export CSV</button>}</div>{children}</div>;
}

function Stat({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}

function Panel({ title, children }: { title: string; children: JSX.Element }) {
  return <div className="card p-5"><h2 className="mb-4 font-heading text-xl font-bold">{title}</h2>{children}</div>;
}

function SimpleTable<T extends Record<string, unknown>>({ title, rows, columns }: { title?: string; rows: T[]; columns: string[] }) {
  return <div className="card overflow-hidden">{title && <h2 className="border-b p-4 font-heading text-xl font-bold">{title}</h2>}<div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr>{columns.map((column) => <th key={column} className="p-3 capitalize">{column.replace(/_/g, ' ')}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={String(row.id || row.variant_id || index)} className="border-t">{columns.map((column) => <td key={column} className="p-3">{formatCell(row[column])}</td>)}</tr>)}</tbody></table></div>{!rows.length && <div className="p-6 text-center text-slate-500">Aucune donnee.</div>}</div>;
}

function InfoCard({ title, rows }: { title: string; rows: string[] }) {
  return <div className="card p-5"><h2 className="mb-4 font-heading text-xl font-bold">{title}</h2><div className="grid gap-2 text-sm text-slate-700">{rows.map((row) => <p key={row}>{row}</p>)}</div></div>;
}

function formatCell(value: unknown) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Date(value).toLocaleString('fr-MA');
  return String(value);
}
