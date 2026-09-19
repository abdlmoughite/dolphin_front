import { Activity, BarChart3, Bell, CalendarDays, Check, Download, Edit, FileClock, Gauge, Info, LayoutDashboard, MapPin, Package, Percent, RefreshCw, Save, Search, Shield, ShoppingBag, Tag, Truck, Users, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, Category, downloadFile, Paginated, Product, User } from '../lib/api';
import { money } from '../lib/i18n';
import { CategoriesAdmin, HomeSectionsAdmin, OrdersAdmin, ProductsAdmin, StaffAdmin } from './Admin';

type DeveloperMetrics = {
  revenue_total: string;
  revenue_today: string;
  revenue_month: string;
  filtered_revenue: string;
  filtered_expenses: string;
  gross_profit: string;
  net_profit: string;
  filtered_orders: number;
  total_orders: number;
  new_orders: number;
  confirmed_orders: number;
  preparing_orders: number;
  shipped_orders: number;
  delivered_orders: number;
  pending_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  delivery_rate: number;
  average_order_value: string;
  products_total: number;
  products_active: number;
  customers_total: number;
  customers_new: number;
  unread_notifications: number;
  orders_by_status: Record<string, number>;
  sales_by_day: { day: string; sales: string; orders: number }[];
  top_products: { product_name: string; sku: string; sales_count: number; revenue: string }[];
  latest_orders: { id: number; order_number: string; status: string; shipping_full_name: string; shipping_city: string; total: string; created_at: string }[];
  city_breakdown: { shipping_city: string; order_count: number; revenue: string }[];
  cities: string[];
  status_options: { value: string; label: string }[];
  filters: { date_from: string; date_to: string; city: string; status: string; search: string };
};
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
type CustomerRow = Omit<User, 'id'> & { id: number | string; username?: string; date_joined?: string; last_login?: string | null; order_count?: number; total_spent?: string; source?: 'ACCOUNT' | 'GUEST' };
type PromotionRow = { id: number; name: string; discount_type: 'PERCENT' | 'FIXED'; value: string; minimum_amount: string; starts_at: string; ends_at: string; is_active: boolean; products: number[]; categories: number[] };
type PromotionForm = { name: string; discount_type: 'PERCENT' | 'FIXED'; value: string; minimum_amount: string; starts_at: string; ends_at: string; is_active: boolean; products: number[]; categories: number[] };
type DeveloperAnalytics = {
  filters: { date_from: string; date_to: string; city: string; search: string };
  cities: string[];
  orders: {
    created: number;
    confirmed: number;
    delivered: number;
    cancelled: number;
    confirmation_rate: number;
    delivery_rate: number;
    cancel_rate: number;
    avg_delivery_hours: number;
    delivered_revenue: string;
  };
  daily: { day: string; created: number; confirmed: number; delivered: number; cancelled: number }[];
  cancellation_reasons: { reason: string; count: number }[];
  city_breakdown: { shipping_city: string; order_count: number; revenue: string }[];
  margins: {
    revenue: string;
    cost: string;
    gross_profit: string;
    expenses: string;
    profit: string;
    units: number;
    margin_rate: number;
    products: { product_name: string; sku: string; quantity: number; revenue: string; cost: string; profit: string; margin_rate: number }[];
  };
  expenses: {
    total: string;
    count: number;
    by_category: { category: string; amount: string; count: number }[];
    latest: ExpenseRow[];
  };
};
type ExpenseRow = { id: number; category: string; amount: string; date: string; supplier?: number | null; reference: string; receipt?: string | null; notes: string; created_by_email?: string };

const sections = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['products', 'Produits', Package],
  ['categories', 'Categories', Tag],
  ['orders', 'Commandes', ShoppingBag],
  ['orders-analytics', 'Orders analytics', BarChart3],
  ['margins', 'Profit margins', Percent],
  ['expenses', 'Depenses', FileClock],
  ['users', 'Clients', Users],
  ['staff', 'Comptes equipe', Shield],
  ['promotions', 'Promotions', Tag],
  ['home-sections', 'Home sections', LayoutDashboard],
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
  if (section === 'products') return <ProductsAdmin />;
  if (section === 'categories') return <CategoriesAdmin />;
  if (section === 'orders') return <OrdersAdmin />;
  if (section === 'orders-analytics') return <OrdersAnalytics />;
  if (section === 'margins') return <ProfitMargins />;
  if (section === 'expenses') return <DeveloperExpenses />;
  if (section === 'users') return <DeveloperUsers />;
  if (section === 'staff') return <StaffAdmin />;
  if (section === 'promotions') return <DeveloperPromotions />;
  if (section === 'home-sections') return <HomeSectionsAdmin />;
  return <DeveloperDashboard />;
}

function DeveloperDashboard() {
  const [filters, setFilters] = useState(() => ({ date_from: dateInput(daysAgo(13)), date_to: dateInput(new Date()), status: '', city: '', search: '' }));
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const { data, isLoading, isFetching, refetch } = useQuery({ queryKey: ['developer-dashboard', filters], queryFn: async () => (await api.get<DeveloperMetrics>(`/developer/dashboard/?${query}`)).data });
  if (isLoading) return <div className="skeleton h-96" />;
  const statusData = Object.entries(data?.orders_by_status || {}).map(([name, value]) => ({ name: statusLabel(name), value }));
  const salesData = (data?.sales_by_day || []).map((row) => ({ ...row, sales: Number(row.sales || 0), label: new Date(row.day).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' }) }));
  const clearFilters = () => setFilters({ date_from: dateInput(daysAgo(13)), date_to: dateInput(new Date()), status: '', city: '', search: '' });
  const setQuickRange = (days: number) => setFilters((current) => ({ ...current, date_from: dateInput(daysAgo(days - 1)), date_to: dateInput(new Date()) }));
  return (
    <div className="grid gap-6">
      <section className="rounded-dolphin bg-navy p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-aqua">Pilotage reel</p>
            <h1 className="mt-1 font-heading text-3xl font-bold">Developer dashboard</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/70">Suivi dynamique des commandes, ventes livrees, clients et produits avec filtres par periode, ville, statut et recherche.</p>
          </div>
          <button className="btn-secondary border-0 bg-white/10 text-white ring-white/20 hover:bg-white/15" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Actualiser</button>
        </div>
      </section>

      <section className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
          <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-ocean" />Du</span><input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-ocean" />Au</span><input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><Tag className="h-4 w-4 text-ocean" />Statut</span><select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Tous les statuts</option>{(data?.status_options || orderStatuses.map((value) => ({ value, label: statusLabel(value) }))).map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-ocean" />Ville</span><select className="input" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}><option value="">Toutes les villes</option>{(data?.cities || []).map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          <div className="flex items-end"><button className="btn-secondary w-full" onClick={clearFilters}><X className="h-4 w-4" />Reset</button></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {[7, 14, 30].map((days) => <button key={days} className="btn-secondary min-h-9 px-3 py-1.5" onClick={() => setQuickRange(days)}>{days} jours</button>)}
          <form className="ml-auto flex min-w-64 flex-1 items-center gap-2 rounded-dolphin border border-slate-200 px-3 py-2 lg:max-w-md" onSubmit={(e) => e.preventDefault()}>
            <Search className="h-4 w-4 text-ocean" />
            <input className="w-full bg-transparent text-sm" placeholder="Commande, client, telephone, tracking" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          </form>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="CA filtre livre" value={money(data?.filtered_revenue || 0)} icon={<Gauge />} />
        <Stat label="Depenses filtrees" value={money(data?.filtered_expenses || 0)} icon={<FileClock />} />
        <Stat label="Profit net estime" value={money(data?.net_profit || 0)} icon={<Percent />} />
        <Stat label="Commandes filtrees" value={data?.filtered_orders || 0} icon={<ShoppingBag />} />
        <Stat label="Livrees" value={data?.delivered_orders || 0} icon={<Check />} />
        <Stat label="Taux livraison" value={`${data?.delivery_rate || 0}%`} icon={<Activity />} />
        <Stat label="En attente" value={data?.new_orders || data?.pending_orders || 0} icon={<FileClock />} />
        <Stat label="En livraison" value={data?.shipped_orders || 0} icon={<Truck />} />
        <Stat label="Annulees" value={data?.cancelled_orders || 0} icon={<X />} />
        <Stat label="Retours / remboursements" value={data?.returned_orders || 0} icon={<RefreshCw />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Panel title="Ventes livrees par jour"><ResponsiveContainer width="100%" height={300}><AreaChart data={salesData}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(value) => money(value as number)} /><Area type="monotone" dataKey="sales" stroke="#0077B6" fill="#48CAE4" fillOpacity={0.35} /></AreaChart></ResponsiveContainer></Panel>
        <Panel title="Commandes par statut"><ResponsiveContainer width="100%" height={300}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={100} paddingAngle={2}>{statusData.map((_, i) => <Cell key={i} fill={['#0077B6', '#48CAE4', '#FF7A59', '#0B1F33', '#22C55E', '#A855F7', '#F59E0B'][i % 7]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SimpleTable title="Top produits commandes" rows={(data?.top_products || []).map((product) => ({ ...product, revenue: money(product.revenue || 0) }))} columns={['product_name', 'sku', 'sales_count', 'revenue']} />
        <SimpleTable title="Dernieres commandes" rows={(data?.latest_orders || []).map((order) => ({ ...order, status: statusLabel(order.status), total: money(order.total) }))} columns={['order_number', 'status', 'shipping_city', 'total']} />
        <SimpleTable title="Villes actives" rows={(data?.city_breakdown || []).map((city) => ({ ...city, revenue: money(city.revenue || 0) }))} columns={['shipping_city', 'order_count', 'revenue']} />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="CA total livre" value={money(data?.revenue_total || 0)} icon={<Gauge />} />
        <Stat label="CA aujourd'hui" value={money(data?.revenue_today || 0)} icon={<Activity />} />
        <Stat label="Produits actifs" value={data?.products_active || 0} icon={<Package />} />
        <Stat label="Clients" value={data?.customers_total || 0} icon={<Users />} />
      </div>
    </div>
  );
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function dateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function useAnalyticsData() {
  const [filters, setFilters] = useState(() => ({ date_from: dateInput(daysAgo(29)), date_to: dateInput(new Date()), city: '', search: '' }));
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const query = useQuery({ queryKey: ['developer-analytics', filters], queryFn: async () => (await api.get<DeveloperAnalytics>(`/developer/analytics/?${params}`)).data });
  return { ...query, filters, setFilters };
}

function AnalyticsFilters({ data, filters, setFilters }: { data?: DeveloperAnalytics; filters: { date_from: string; date_to: string; city: string; search: string }; setFilters: (filters: { date_from: string; date_to: string; city: string; search: string }) => void }) {
  return (
    <div className="card p-4">
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
        <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-ocean" />Du</span><input className="input" type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
        <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><CalendarDays className="h-4 w-4 text-ocean" />Au</span><input className="input" type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
        <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><MapPin className="h-4 w-4 text-ocean" />Ville</span><select className="input" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })}><option value="">Toutes les villes</option>{(data?.cities || []).map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
        <label className="grid gap-1 text-sm font-semibold text-slate-600"><span className="flex items-center gap-1"><Search className="h-4 w-4 text-ocean" />Recherche</span><input className="input" placeholder="Commande, client, telephone" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} /></label>
        <div className="flex items-end"><button className="btn-secondary w-full" onClick={() => setFilters({ date_from: dateInput(daysAgo(29)), date_to: dateInput(new Date()), city: '', search: '' })}><X className="h-4 w-4" />Reset</button></div>
      </div>
    </div>
  );
}

function OrdersAnalytics() {
  const { data, isLoading, filters, setFilters } = useAnalyticsData();
  if (isLoading) return <div className="skeleton h-96" />;
  const daily = (data?.daily || []).map((row) => ({ ...row, label: new Date(row.day).toLocaleDateString('fr-MA', { day: '2-digit', month: 'short' }) }));
  const reasons = data?.cancellation_reasons || [];
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase text-ocean">Commandes</p>
        <h1 className="font-heading text-3xl font-bold">Orders analytics</h1>
      </div>
      <AnalyticsFilters data={data} filters={filters} setFilters={setFilters} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Stat label="Commandes creees" value={data?.orders.created || 0} icon={<ShoppingBag />} />
        <Stat label="Confirmees" value={`${data?.orders.confirmed || 0} (${data?.orders.confirmation_rate || 0}%)`} icon={<Check />} />
        <Stat label="Livrees" value={`${data?.orders.delivered || 0} (${data?.orders.delivery_rate || 0}%)`} icon={<Truck />} />
        <Stat label="Annulees" value={`${data?.orders.cancelled || 0} (${data?.orders.cancel_rate || 0}%)`} icon={<X />} />
        <Stat label="CA livre" value={money(data?.orders.delivered_revenue || 0)} icon={<Gauge />} />
        <Stat label="Delai livraison moyen" value={`${data?.orders.avg_delivery_hours || 0}h`} icon={<Activity />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="Flux commandes"><ResponsiveContainer width="100%" height={320}><BarChart data={daily}><CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" /><XAxis dataKey="label" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="created" name="Creees" fill="#0077B6" /><Bar dataKey="confirmed" name="Confirmees" fill="#48CAE4" /><Bar dataKey="delivered" name="Livrees" fill="#22C55E" /><Bar dataKey="cancelled" name="Annulees" fill="#FF7A59" /></BarChart></ResponsiveContainer></Panel>
        <Panel title="Raisons annulation"><ResponsiveContainer width="100%" height={320}><PieChart><Pie data={reasons} dataKey="count" nameKey="reason" innerRadius={55} outerRadius={105}>{reasons.map((_, index) => <Cell key={index} fill={['#FF7A59', '#0B1F33', '#F59E0B', '#94A3B8', '#0077B6'][index % 5]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></Panel>
      </div>
      <SimpleTable title="Villes par commandes" rows={(data?.city_breakdown || []).map((city) => ({ ...city, revenue: money(city.revenue || 0) }))} columns={['shipping_city', 'order_count', 'revenue']} />
    </div>
  );
}

function ProfitMargins() {
  const { data, isLoading, filters, setFilters } = useAnalyticsData();
  if (isLoading) return <div className="skeleton h-96" />;
  const products = (data?.margins.products || []).map((product) => ({ ...product, revenue: money(product.revenue || 0), cost: money(product.cost || 0), profit: money(product.profit || 0), margin_rate: `${product.margin_rate}%` }));
  const expensesByCategory = (data?.expenses.by_category || []).map((row) => ({ ...row, amount: money(row.amount || 0) }));
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-sm font-bold uppercase text-ocean">Finance</p>
        <h1 className="font-heading text-3xl font-bold">Profit margins</h1>
      </div>
      <AnalyticsFilters data={data} filters={filters} setFilters={setFilters} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Stat label="CA livre" value={money(data?.margins.revenue || 0)} icon={<Gauge />} />
        <Stat label="Cout produits" value={money(data?.margins.cost || 0)} icon={<Package />} />
        <Stat label="Profit brut estime" value={money(data?.margins.gross_profit || 0)} icon={<Activity />} />
        <Stat label="Depenses" value={money(data?.margins.expenses || 0)} icon={<FileClock />} />
        <Stat label="Profit net estime" value={money(data?.margins.profit || 0)} icon={<Percent />} />
        <Stat label="Marge nette" value={`${data?.margins.margin_rate || 0}%`} icon={<Percent />} />
        <Stat label="Unites vendues" value={data?.margins.units || 0} icon={<ShoppingBag />} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <SimpleTable title="Profit par produit livre" rows={products} columns={['product_name', 'sku', 'quantity', 'revenue', 'cost', 'profit', 'margin_rate']} />
        <div className="grid gap-6">
          <SimpleTable title="Depenses par categorie" rows={expensesByCategory} columns={['category', 'count', 'amount']} />
          <InfoCard title="Note calcul" rows={['Profit brut = total ligne livree - cost_price x quantite.', 'Profit net estime = profit brut - depenses de la periode.', 'Les produits sans cost_price utilisent 0 MAD de cout.']} />
        </div>
      </div>
    </div>
  );
}

function DeveloperExpenses() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ category: '', amount: '', date: dateInput(new Date()), reference: '', notes: '' });
  const [search, setSearch] = useState('');
  const params = new URLSearchParams({ ordering: '-date' });
  if (search) params.set('search', search);
  const expenses = useQuery({ queryKey: ['developer-expenses', search], queryFn: async () => (await api.get<Paginated<ExpenseRow>>(`/developer/expenses/?${params}`)).data });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    await api.post('/developer/expenses/', form);
    toast.success('Depense ajoutee');
    setForm({ category: '', amount: '', date: dateInput(new Date()), reference: '', notes: '' });
    qc.invalidateQueries({ queryKey: ['developer-expenses'] });
    qc.invalidateQueries({ queryKey: ['developer-analytics'] });
    qc.invalidateQueries({ queryKey: ['developer-dashboard'] });
  };
  const remove = async (expense: ExpenseRow) => {
    await api.delete(`/developer/expenses/${expense.id}/`);
    toast.success('Depense supprimee');
    qc.invalidateQueries({ queryKey: ['developer-expenses'] });
    qc.invalidateQueries({ queryKey: ['developer-analytics'] });
    qc.invalidateQueries({ queryKey: ['developer-dashboard'] });
  };
  const rows = (expenses.data?.results || []).map((expense) => ({ ...expense, amount: money(expense.amount), notes: expense.notes || '-', reference: expense.reference || '-' }));
  return (
    <ResourcePage title="Depenses" exportKind="expenses">
      <div className="grid gap-6">
        <form className="card grid gap-4 p-5" onSubmit={save}>
          <div className="grid gap-4 md:grid-cols-5">
            <label className="grid gap-1 font-semibold">Categorie<input className="input" required placeholder="Transport, Ads, Emballage..." value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Montant<input className="input" required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Date<input className="input" required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Reference<input className="input" placeholder="Facture, bon..." value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></label>
            <div className="flex items-end"><button className="btn-primary w-full"><Save className="h-4 w-4" />Ajouter</button></div>
          </div>
          <textarea className="input min-h-24" placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </form>
        <div className="card overflow-hidden">
          <div className="flex flex-wrap gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher categorie, reference, notes" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <SimpleTable rows={rows} columns={['date', 'category', 'amount', 'reference', 'notes', 'created_by_email']} />
          <div className="border-t p-4 text-right text-sm text-slate-500">Suppression rapide: cliquez sur X dans la liste ci-dessous.</div>
          <div className="grid gap-2 p-4 pt-0">{(expenses.data?.results || []).slice(0, 8).map((expense) => <div key={expense.id} className="flex flex-wrap items-center justify-between gap-3 rounded-dolphin border p-3 text-sm"><span><strong>{expense.category}</strong> - {money(expense.amount)} <span className="text-slate-500">({expense.date})</span></span><button className="btn-secondary text-coral" onClick={() => remove(expense)}><X className="h-4 w-4" />Supprimer</button></div>)}</div>
        </div>
      </div>
    </ResourcePage>
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
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [status, setStatus] = useState('');
  const [minOrders, setMinOrders] = useState('');
  const params = new URLSearchParams({ ordering: '-date_joined' });
  if (search) params.set('search', search);
  if (source) params.set('source', source);
  if (status) params.set('status', status);
  if (minOrders) params.set('min_orders', minOrders);
  const users = useQuery({ queryKey: ['developer-customers', search, source, status, minOrders], queryFn: async () => (await api.get<Paginated<CustomerRow>>(`/admin/customers/?${params}`)).data });
  return (
    <ResourcePage title="Clients" exportKind="customers">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher client, telephone, email" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input max-w-44" value={source} onChange={(e) => setSource(e.target.value)}><option value="">Tous clients</option><option value="ACCOUNT">Avec compte</option><option value="GUEST">Guest checkout</option></select><select className="input max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option><option value="ACTIVE">Actif</option><option value="PENDING">En attente</option><option value="BLOCKED">Bloque</option><option value="GUEST">Guest</option></select><input className="input w-40" type="number" min={0} placeholder="Min commandes" value={minOrders} onChange={(e) => setMinOrders(e.target.value)} /><button className="btn-secondary" onClick={() => { setSearch(''); setSource(''); setStatus(''); setMinOrders(''); }}>Reinitialiser</button></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Client</th><th className="p-3">Telephone</th><th className="p-3">Source</th><th className="p-3">Commandes</th><th className="p-3">Total depense</th><th className="p-3">Statut</th><th className="p-3">Inscription</th><th className="p-3">Actions</th></tr></thead><tbody>{users.data?.results.map((user) => <tr key={user.id} className="border-t"><td className="p-3"><strong>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</strong><p className="text-xs text-slate-500">{user.email}</p></td><td className="p-3">{user.phone || '-'}</td><td className="p-3"><span className={`badge ${user.source === 'GUEST' ? 'bg-amber-100 text-amber-800' : 'bg-ocean/10 text-ocean'}`}>{user.source === 'GUEST' ? 'Guest' : 'Compte'}</span></td><td className="p-3 font-semibold">{user.order_count || 0}</td><td className="p-3 font-semibold">{money(user.total_spent || 0)}</td><td className="p-3"><span className={`badge ${user.status === 'ACTIVE' ? 'bg-ocean/10 text-ocean' : user.status === 'GUEST' ? 'bg-amber-100 text-amber-800' : 'bg-coral text-white'}`}>{user.status}</span></td><td className="p-3">{user.date_joined ? new Date(user.date_joined).toLocaleDateString('fr-MA') : '-'}</td><td className="p-3"><button className="btn-secondary" onClick={() => setSelected(user)}><Info className="h-4 w-4" />Info</button></td></tr>)}</tbody></table></div>
        {!users.data?.results.length && <div className="p-6 text-center text-slate-500">Aucun client.</div>}
        {selected && <CustomerInfoModal customer={selected} onClose={() => setSelected(null)} />}
      </div>
    </ResourcePage>
  );
}

function CustomerInfoModal({ customer, onClose }: { customer: CustomerRow; onClose: () => void }) {
  const orders = useQuery({ queryKey: ['developer-customer-orders', customer.id], queryFn: async () => (await api.get<OrderRow[]>(`/admin/customers/${customer.id}/orders/`)).data });
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4">
      <div className="card mx-auto grid max-w-5xl gap-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold">Informations client</h2>
            <p className="text-sm text-slate-500">{customer.email}</p>
          </div>
          <button className="rounded-full p-2 hover:bg-mist" onClick={onClose} aria-label="Fermer"><X /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <InfoCard title="Client" rows={[`${customer.first_name || ''} ${customer.last_name || ''}`.trim() || '-', `Telephone: ${customer.phone || '-'}`, `Statut: ${customer.status}`]} />
          <InfoCard title="Compte" rows={[`Email: ${customer.email}`, `Username: ${customer.username || '-'}`, `Inscrit: ${customer.date_joined ? new Date(customer.date_joined).toLocaleString('fr-MA') : '-'}`]} />
          <InfoCard title="Commandes" rows={[`Nombre: ${customer.order_count || 0}`, `Total: ${money(customer.total_spent || 0)}`, `Derniere connexion: ${customer.last_login ? new Date(customer.last_login).toLocaleString('fr-MA') : '-'}`]} />
          <InfoCard title="Resume" rows={[`Commandes affichees: ${orders.data?.length || 0}`, `Total historique: ${money(customer.total_spent || 0)}`, `Role: ${customer.role}`]} />
        </div>
        <div className="card overflow-hidden bg-white">
          <h3 className="border-b p-4 font-heading text-xl font-bold">Commandes du client</h3>
          {orders.isLoading ? <div className="p-6 text-slate-500">Chargement des commandes...</div> : orders.data?.length ? <div className="grid gap-4 p-4">{orders.data.map((order) => <div key={order.id} className="rounded-dolphin border border-slate-200 p-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><strong className="text-ocean">{order.order_number}</strong><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></div><div className="flex flex-wrap items-center gap-2"><span className="badge bg-ocean/10 text-ocean">{statusLabel(order.status)}</span><strong>{money(order.total)}</strong></div></div><div className="grid gap-2 text-sm text-slate-600 md:grid-cols-3"><p><strong>Nom:</strong> {order.shipping_full_name}</p><p><strong>Tel:</strong> {order.shipping_phone}</p><p><strong>Ville:</strong> {order.shipping_city}</p><p className="md:col-span-3"><strong>Adresse:</strong> {order.shipping_address}</p>{order.customer_note && <p className="md:col-span-3"><strong>Note client:</strong> {order.customer_note}</p>}</div><div className="mt-3 grid gap-2">{order.items.map((item) => <div key={item.id} className="grid gap-2 rounded-dolphin bg-mist p-3 text-sm md:grid-cols-[1fr_auto_auto_auto]"><span><strong>{item.product_name}</strong><p className="text-xs text-slate-500">{item.variant_label || item.sku}</p></span><span>Qte {item.quantity}</span><span>{money(item.unit_price)}</span><strong>{money(item.total)}</strong></div>)}</div></div>)}</div> : <div className="p-6 text-center text-slate-500">Aucune commande pour ce client.</div>}
        </div>
      </div>
    </div>
  );
}

function DeveloperPromotions() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PromotionRow | null>(null);
  const [deleting, setDeleting] = useState<PromotionRow | null>(null);
  const [form, setForm] = useState<PromotionForm>(() => emptyPromotionForm());
  const promotions = useQuery({ queryKey: ['developer-promotions'], queryFn: async () => (await api.get<Paginated<PromotionRow>>('/promotions/?ordering=-created_at')).data });
  const products = useQuery({ queryKey: ['developer-promotion-products'], queryFn: async () => (await api.get<Paginated<Product>>('/products/?status=ACTIVE&ordering=name')).data });
  const categories = useQuery({ queryKey: ['developer-promotion-categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_active=true&ordering=name')).data });
  const productName = (id: number) => products.data?.results.find((product) => product.id === id)?.name || `Produit #${id}`;
  const categoryName = (id: number) => categories.data?.results.find((category) => category.id === id)?.name || `Categorie #${id}`;
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, value: form.value || '0', minimum_amount: form.minimum_amount || '0', starts_at: new Date(form.starts_at).toISOString(), ends_at: new Date(form.ends_at).toISOString() };
    if (editing) {
      await api.patch(`/promotions/${editing.id}/`, payload);
    } else {
      await api.post('/promotions/', payload);
    }
    toast.success('Promotion enregistree');
    setEditing(null);
    setForm(emptyPromotionForm());
    qc.invalidateQueries({ queryKey: ['developer-promotions'] });
  };
  const edit = (promotion: PromotionRow) => {
    setEditing(promotion);
    setForm({
      name: promotion.name,
      discount_type: promotion.discount_type,
      value: promotion.value,
      minimum_amount: promotion.minimum_amount,
      starts_at: toDatetimeLocal(promotion.starts_at),
      ends_at: toDatetimeLocal(promotion.ends_at),
      is_active: promotion.is_active,
      products: promotion.products || [],
      categories: promotion.categories || [],
    });
  };
  const remove = async () => {
    if (!deleting) return;
    await api.delete(`/promotions/${deleting.id}/`);
    toast.success('Promotion supprimee');
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ['developer-promotions'] });
  };
  return (
    <ResourcePage title="Promotions">
      <div className="grid gap-6">
        <form className="card grid gap-4 p-5" onSubmit={save}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1 font-semibold">Nom<input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Type<select className="input" value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value as PromotionForm['discount_type'] })}><option value="PERCENT">Pourcentage</option><option value="FIXED">Montant fixe</option></select></label>
            <label className="grid gap-1 font-semibold">Valeur<input className="input" required type="number" step="0.01" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Minimum commande<input className="input" type="number" step="0.01" value={form.minimum_amount} onChange={(e) => setForm({ ...form, minimum_amount: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Debut<input className="input" required type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></label>
            <label className="grid gap-1 font-semibold">Fin<input className="input" required type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></label>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <MultiSelect label="Produits concernes" values={form.products} options={(products.data?.results || []).map((product) => ({ id: product.id, label: `${product.name} - ${product.sku}` }))} onChange={(values) => setForm({ ...form, products: values })} />
            <MultiSelect label="Categories concernees" values={form.categories} options={(categories.data?.results || []).map((category) => ({ id: category.id, label: category.name }))} onChange={(values) => setForm({ ...form, categories: values })} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />Actif</label>
            <button className="btn-primary"><Save className="h-4 w-4" />{editing ? 'Modifier' : 'Creer'} promotion</button>
            {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(emptyPromotionForm()); }}>Annuler</button>}
          </div>
        </form>
        <div className="card overflow-hidden">
          <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Promotion</th><th className="p-3">Reduction</th><th className="p-3">Periode</th><th className="p-3">Cibles</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{promotions.data?.results.map((promotion) => <tr key={promotion.id} className="border-t"><td className="p-3"><strong>{promotion.name}</strong><p className="text-xs text-slate-500">Minimum {money(promotion.minimum_amount || 0)}</p></td><td className="p-3 font-semibold">{promotion.discount_type === 'PERCENT' ? `${Number(promotion.value)}%` : money(promotion.value)}</td><td className="p-3"><p>{new Date(promotion.starts_at).toLocaleString('fr-MA')}</p><p className="text-xs text-slate-500">{new Date(promotion.ends_at).toLocaleString('fr-MA')}</p></td><td className="p-3"><div className="grid gap-1">{promotion.products?.length ? <span>{promotion.products.length} produit(s): {promotion.products.slice(0, 2).map(productName).join(', ')}</span> : null}{promotion.categories?.length ? <span>{promotion.categories.length} categorie(s): {promotion.categories.slice(0, 2).map(categoryName).join(', ')}</span> : null}{!promotion.products?.length && !promotion.categories?.length && <span>Toute la boutique</span>}</div></td><td className="p-3"><span className={`badge ${promotion.is_active && new Date(promotion.starts_at) <= new Date() && new Date(promotion.ends_at) >= new Date() ? 'bg-ocean/10 text-ocean' : 'bg-slate-200 text-slate-600'}`}>{promotionStatus(promotion)}</span></td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => edit(promotion)}><Edit className="h-4 w-4" /></button><button className="btn-secondary text-coral" onClick={() => setDeleting(promotion)}><X className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
          {!promotions.data?.results.length && <div className="p-6 text-center text-slate-500">Aucune promotion.</div>}
        </div>
        {deleting && <ConfirmMini title="Supprimer promotion ?" text={deleting.name} onCancel={() => setDeleting(null)} onConfirm={remove} />}
      </div>
    </ResourcePage>
  );
}

function emptyPromotionForm(): PromotionForm {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return { name: '', discount_type: 'PERCENT', value: '', minimum_amount: '0', starts_at: toDatetimeLocal(now.toISOString()), ends_at: toDatetimeLocal(end.toISOString()), is_active: true, products: [], categories: [] };
}

function toDatetimeLocal(value: string) {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function promotionStatus(promotion: PromotionRow) {
  const now = new Date();
  if (!promotion.is_active) return 'Inactive';
  if (new Date(promotion.starts_at) > now) return 'Planifiee';
  if (new Date(promotion.ends_at) < now) return 'Expiree';
  return 'Active';
}

function MultiSelect({ label, values, options, onChange }: { label: string; values: number[]; options: { id: number; label: string }[]; onChange: (values: number[]) => void }) {
  return (
    <label className="grid gap-1 font-semibold">
      {label}
      <select className="input min-h-32" multiple value={values.map(String)} onChange={(event) => onChange(Array.from(event.currentTarget.selectedOptions).map((option) => Number(option.value)))}>
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <span className="text-xs font-normal text-slate-500">Ctrl/Cmd + clic pour choisir plusieurs elements.</span>
    </label>
  );
}

function ConfirmMini({ title, text, onCancel, onConfirm }: { title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4">
      <div className="card grid w-full max-w-md gap-4 p-6">
        <h2 className="font-heading text-2xl font-bold">{title}</h2>
        <p className="text-slate-600">{text}</p>
        <div className="flex justify-end gap-3"><button className="btn-secondary" onClick={onCancel}>Annuler</button><button className="btn-danger" onClick={onConfirm}>Supprimer</button></div>
      </div>
    </div>
  );
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
