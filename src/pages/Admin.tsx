import { Archive, BarChart3, Check, Copy, Download, Edit, PackageCheck, Plus, RotateCcw, Save, Trash2, Upload, Users, X } from 'lucide-react';
import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, Brand, Category, downloadFile, mediaUrl, Paginated, Product } from '../lib/api';
import { money } from '../lib/i18n';
import { invalidateProductQueries, productQueryKeys } from '../lib/queryKeys';
import { Breadcrumb, ConfirmDialog, EmptyState, ErrorState, FormField, ImageUploader, Pagination, SearchInput, SelectField, StatusBadge } from '../components/ui';

type VariantForm = { id?: number; sku: string; color: string; size: string; capacity: string; price_override?: string };
type ProductForm = {
  slug?: string;
  name: string;
  sku: string;
  category_id: string;
  brand_id: string;
  regular_price: string;
  promotional_price: string;
  short_description: string;
  description: string;
  status: string;
  featured: boolean;
  new_arrival: boolean;
  bestseller: boolean;
  variants_payload: VariantForm[];
};
type ImportJob = {
  id: number;
  filename: string;
  status: string;
  total_rows: number;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  failed_count: number;
  rows: { id: number; row_number: number; normalized_data: Record<string, unknown>; errors: string[]; duplicate_sku: boolean }[];
  created_at: string;
};
type AdminOrder = {
  id: number;
  order_number: string;
  guest_email: string;
  status: string;
  payment_method: string;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  subtotal: string;
  discount_total: string;
  shipping_total: string;
  total: string;
  customer_note: string;
  internal_note: string;
  tracking_number: string;
  created_at: string;
  items: { id: number; product_name: string; variant_label: string; sku: string; unit_price: string; quantity: number; total: string }[];
  status_history: { id: number; from_status: string; to_status: string; note: string; created_at: string }[];
};

export function AdminDashboard() {
  const { data } = useQuery({ queryKey: ['admin-dashboard'], queryFn: async () => (await api.get('/admin/dashboard/')).data });
  const chart = (data?.sales_by_day || []).map((row: { day: string; sales: string | number }) => ({ day: new Date(row.day).toLocaleDateString('fr-MA', { weekday: 'short' }), ventes: Number(row.sales || 0) }));
  return (
    <div>
      <h1 className="mb-6 font-heading text-3xl font-bold">Dashboard admin</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<BarChart3 />} label="Revenu mois" value={money(data?.revenue_month || 0)} />
        <Metric icon={<PackageCheck />} label="Commandes" value={data?.total_orders || 0} />
        <Metric icon={<Users />} label="En attente" value={data?.pending_orders || 0} />
        <Metric icon={<PackageCheck />} label="Produits actifs" value={data?.active_products || 0} />
      </div>
      <div className="card mt-6 h-80 p-4"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="day" /><YAxis /><Tooltip /><Area type="monotone" dataKey="ventes" stroke="#0077B6" fill="#48CAE4" /></AreaChart></ResponsiveContainer></div>
    </div>
  );
}

export function AdminTablePage() {
  const { section } = useParams();
  if (section === 'products') return <ProductsAdmin />;
  if (section === 'categories') return <CategoriesAdmin />;
  if (section === 'brands') return <BrandsAdmin />;
  if (section === 'imports') return <ProductImportAdmin />;
  if (section === 'orders') return <OrdersAdmin />;
  if (section === 'customers') return <CustomersAdmin />;
  if (section === 'staff') return <StaffAdmin />;
  if (section === 'coupons') return <ResourceAdmin title="Coupons" endpoint="/coupons/" fields={couponFields} />;
  if (section === 'promotions') return <ResourceAdmin title="Promotions" endpoint="/promotions/" fields={promotionFields} />;
  if (section === 'delivery-zones') return <ResourceAdmin title="Zones de livraison" endpoint="/delivery-zones/" fields={deliveryZoneFields} />;
  if (section === 'banners') return <ResourceAdmin title="Bannieres homepage" endpoint="/banners/" fields={bannerFields} />;
  if (section === 'reviews') return <ModerationAdmin title="Avis produits" endpoint="/reviews/" />;
  if (section === 'support') return <ModerationAdmin title="Support client" endpoint="/support/" />;
  if (section === 'returns') return <ModerationAdmin title="Retours" endpoint="/returns/" />;
  if (section === 'suppliers') return <ResourceAdmin title="Fournisseurs" endpoint="/developer/suppliers/" fields={supplierFields} />;
  if (section === 'expenses') return <ResourceAdmin title="Depenses" endpoint="/developer/expenses/" fields={expenseFields} />;
  if (section === 'settings') return <DesignSettingsAdmin />;
  if (section === 'reports') return <ReportsAdmin />;
  if (section === 'audit-logs') return <AuditLogsAdmin />;
  return <NavigateBack />;
}

export function OrdersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editing, setEditing] = useState<AdminOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null);
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (statusFilter) query.set('status', statusFilter);
  if (dateFrom) query.set('date_from', dateFrom);
  if (dateTo) query.set('date_to', dateTo);
  query.set('ordering', '-created_at');
  const orders = useQuery({ queryKey: ['admin-orders', search, statusFilter, dateFrom, dateTo], queryFn: async () => (await api.get<Paginated<AdminOrder>>(`/orders/?${query}`)).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-orders'] });
  const transition = async (order: AdminOrder, nextStatus: string, extra: Record<string, string> = {}) => {
    try {
      await api.post(`/orders/${order.id}/transition/`, { status: nextStatus, ...extra });
      toast.success('Statut de commande mis a jour');
      setCancelOrder(null);
      refresh();
    } catch {
      toast.error('Transition de statut non autorisee');
    }
  };
  const selectOrderStatus = (order: AdminOrder, nextStatus: string) => {
    if (!nextStatus || nextStatus === order.status) return;
    if (nextStatus === 'CANCELLED') {
      setCancelOrder(order);
      return;
    }
    transition(order, nextStatus);
  };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Commandes</h1><button className="btn-secondary" onClick={() => downloadFile('/developer/export/orders/', 'dolphin-orders.csv')}><Download className="h-4 w-4" />Export CSV</button></div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher numero, client, telephone" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input max-w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tous les statuts</option>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select><label className="grid gap-1 text-xs font-bold text-slate-500">Du<input className="input min-w-40" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></label><label className="grid gap-1 text-xs font-bold text-slate-500">Au<input className="input min-w-40" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></label><button className="btn-secondary" type="button" onClick={() => { setSearch(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); }}>Reinitialiser</button></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-mist">
              <tr><th className="p-3">Commande</th><th className="p-3">Client</th><th className="p-3">Telephone</th><th className="p-3">Ville</th><th className="p-3">Total</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr>
            </thead>
            <tbody>
              {orders.data?.results.map((order) => (
                <tr key={order.id} className="border-t">
                  <td className="p-3 font-semibold"><Link className="text-ocean" to={`/admin/orders/${order.id}`}>{order.order_number}</Link><p className="text-xs font-normal text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></td>
                  <td className="p-3">{order.shipping_full_name}<p className="text-xs text-slate-500">{order.guest_email}</p></td>
                  <td className="p-3">{order.shipping_phone}</td>
                  <td className="p-3">{order.shipping_city}</td>
                  <td className="p-3 font-semibold">{money(order.total)}</td>
                  <td className="p-3"><span className={`badge ${statusTone(order.status)}`}>{statusLabel(order.status)}</span></td>
                  <td className="min-w-80 p-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => setEditing(order)}><Edit className="h-4 w-4" />Modifier</button>
                      <button className="btn-secondary" onClick={() => downloadFile(`/orders/${order.id}/invoice/`, `facture-${order.order_number}.pdf`)}><Download className="h-4 w-4" />Facture</button>
                      <select className="input max-w-52" value={order.status} onChange={(event) => selectOrderStatus(order, event.target.value)}>
                        {orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {cancelOrder && <CancelOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={(reason, note) => transition(cancelOrder, 'CANCELLED', { cancellation_reason: reason, note })} />}
    </div>
  );
}

export function ProductsAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (statusFilter) query.set('status', statusFilter);
  if (categoryFilter) query.set('category', categoryFilter);
  if (brandFilter) query.set('brand', brandFilter);
  query.set('ordering', ordering);
  query.set('page', String(page));
  const queryString = query.toString();
  const products = useQuery({ queryKey: productQueryKeys.admin(queryString), queryFn: async () => (await api.get<Paginated<Product>>(`/products/?${queryString}`)).data });
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_archived=false')).data });
  const brands = useQuery({ queryKey: ['admin-brands'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const pageIds = products.data?.results.map((product) => product.id) || [];
  const selectedCount = allFilteredSelected ? products.data?.count || 0 : selected.length;
  const refresh = () => invalidateProductQueries(queryClient);
  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    setSelected([]);
    setAllFilteredSelected(false);
  };
  const setFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
    setSelected([]);
    setAllFilteredSelected(false);
  };
  const selectPage = (checked: boolean) => {
    setAllFilteredSelected(false);
    setSelected(checked ? pageIds : []);
  };
  const bulk = async (action: string) => {
    await api.post('/products/bulk/', { ids: selected, all_results: allFilteredSelected, search, status: statusFilter, category_id: categoryFilter, brand_id: brandFilter, action });
    toast.success(action === 'archive' ? 'Produits masques de la boutique' : 'Action appliquee');
    setSelected([]);
    setAllFilteredSelected(false);
    refresh();
  };
  return (
    <div>
      <Breadcrumb items={[{ label: 'Admin', to: '/admin/dashboard' }, { label: 'Produits' }]} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Gestion des produits</h1><button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Nouveau produit</button></div>
      <div className="card overflow-hidden">
        <div className="grid gap-3 border-b p-4">
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput value={search} onChange={updateSearch} placeholder="Rechercher par nom, SKU ou marque" />
            <select className="input max-w-48" value={statusFilter} onChange={(e) => setFilter(setStatusFilter, e.target.value)}><option value="">Tous statuts</option><option value="ACTIVE">Actif</option><option value="DRAFT">Brouillon</option><option value="ARCHIVED">Archive</option></select>
            <select className="input max-w-56" value={categoryFilter} onChange={(e) => setFilter(setCategoryFilter, e.target.value)}><option value="">Toutes categories</option>{categories.data?.results.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
            <select className="input max-w-56" value={brandFilter} onChange={(e) => setFilter(setBrandFilter, e.target.value)}><option value="">Toutes marques</option>{brands.data?.results.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}</select>
            <select className="input max-w-48" value={ordering} onChange={(e) => setFilter(setOrdering, e.target.value)}><option value="-created_at">Plus recents</option><option value="name">Nom A-Z</option><option value="regular_price">Prix croissant</option><option value="-regular_price">Prix decroissant</option><option value="-sales_count">Ventes</option></select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-secondary" disabled={!selectedCount} onClick={() => bulk('activate')}><Check className="h-4 w-4" />Activer</button>
            <button className="btn-secondary" disabled={!selectedCount} onClick={() => bulk('archive')}><Archive className="h-4 w-4" />Masquer de la boutique</button>
            <button className="btn-secondary text-coral" disabled={!selectedCount} onClick={() => setBulkDeleteOpen(true)}><Trash2 className="h-4 w-4" />Supprimer tous les produits</button>
            {!!products.data?.count && !allFilteredSelected && selected.length === pageIds.length && <button className="btn-secondary" onClick={() => setAllFilteredSelected(true)}>Selectionner les {products.data.count} resultats filtres</button>}
            {!!selectedCount && <span className="text-sm font-semibold text-slate-500">{selectedCount} selectionne(s)</span>}
          </div>
        </div>
        {products.isLoading ? <div className="p-4"><EmptyState title="Chargement" text="Les produits sont en cours de chargement." /></div> : products.isError ? <div className="p-4"><ErrorState onRetry={() => products.refetch()} /></div> : products.data?.results.length ? <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3"><input aria-label="Selectionner la page" type="checkbox" checked={pageIds.length > 0 && selected.length === pageIds.length && !allFilteredSelected} onChange={(e) => selectPage(e.target.checked)} /></th><th className="p-3">Image</th><th className="p-3">Produit</th><th className="p-3">SKU</th><th className="p-3">Categorie</th><th className="p-3">Marque</th><th className="p-3">Prix</th><th className="p-3">Prix promo</th><th className="p-3">Variantes</th><th className="p-3">Statut</th><th className="p-3">Date</th><th className="p-3">Actions</th></tr></thead><tbody>{products.data.results.map((product) => {
          const mainImage = product.images?.find((image) => image.is_main)?.image || product.images?.[0]?.image;
          return <tr key={product.id} className="border-t"><td className="p-3"><input type="checkbox" checked={allFilteredSelected || selected.includes(product.id)} onChange={(e) => { setAllFilteredSelected(false); setSelected((ids) => e.target.checked ? [...new Set([...ids, product.id])] : ids.filter((id) => id !== product.id)); }} /></td><td className="p-3">{mainImage ? <img className="h-12 w-12 rounded-dolphin object-cover" src={mediaUrl(mainImage)} alt={product.name} /> : <div className="h-12 w-12 rounded-dolphin bg-mist" />}</td><td className="p-3 font-semibold">{product.name}</td><td className="p-3">{product.sku}</td><td className="p-3">{product.category?.name || '-'}</td><td className="p-3">{product.brand?.name || '-'}</td><td className="p-3">{money(product.regular_price)}</td><td className="p-3">{product.promotional_price ? money(product.promotional_price) : '-'}</td><td className="p-3">{product.variants.length}</td><td className="p-3"><span className="badge bg-ocean/10 text-ocean">{product.status}</span></td><td className="p-3">{product.created_at ? new Date(product.created_at).toLocaleDateString('fr-MA') : '-'}</td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => { setEditing(product); setOpen(true); }}><Edit className="h-4 w-4" /></button><button className="btn-secondary" onClick={() => api.post(`/products/${product.slug}/duplicate/`).then(() => { toast.success('Produit duplique'); refresh(); })}><Copy className="h-4 w-4" /></button><button className="btn-secondary" onClick={() => api.post(`/products/${product.slug}/${product.status === 'ARCHIVED' ? 'restore' : 'archive'}/`).then(refresh)}>{product.status === 'ARCHIVED' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button><button className="btn-secondary text-coral" onClick={() => setDeleting(product)}><Trash2 className="h-4 w-4" /></button></td></tr>;
        })}</tbody></table></div><div className="p-4"><Pagination count={products.data.count} page={page} onPage={(nextPage) => { setPage(nextPage); setSelected([]); setAllFilteredSelected(false); }} pageSize={12} /></div></> : <div className="p-4"><EmptyState title="Aucun produit disponible pour le moment." text="" /></div>}
      </div>
      {open && <ProductModal product={editing} categories={categories.data?.results || []} brands={brands.data?.results || []} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
      {deleting && <ConfirmDialog title="Supprimer ce produit ?" description={`Cette action supprimera ou archivera ${deleting.name} selon les contraintes commandes.`} confirmLabel="Supprimer" onCancel={() => setDeleting(null)} onConfirm={async () => { await api.delete(`/products/${deleting.slug}/`); toast.success('Produit supprime ou archive'); setDeleting(null); refresh(); }} />}
      {bulkDeleteOpen && <BulkDeleteDialog count={selectedCount} onCancel={() => setBulkDeleteOpen(false)} onConfirm={async (confirmation) => {
        const { data } = await api.post('/products/bulk_delete/', { ids: selected, all_results: allFilteredSelected, search, status: statusFilter, category_id: categoryFilter, brand_id: brandFilter, confirmation });
        toast.success(`${data.count} produit(s) traite(s)`);
        setBulkDeleteOpen(false);
        setSelected([]);
        setAllFilteredSelected(false);
        refresh();
      }} />}
    </div>
  );
}

function BulkDeleteDialog({ count, onCancel, onConfirm }: { count: number; onCancel: () => void; onConfirm: (confirmation: string) => Promise<void> }) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const expected = 'SUPPRIMER TOUS LES PRODUITS';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/50 p-4 backdrop-blur-sm">
      <div className="card grid w-full max-w-lg gap-4 p-6">
        <h2 className="font-heading text-2xl font-bold text-navy">Supprimer tous les produits</h2>
        <p className="text-slate-600">Cette action traitera {count} produit(s). Les produits lies a un historique seront archives pour conserver les commandes.</p>
        <FormField label="Confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" disabled={busy} onClick={onCancel}>Annuler</button>
          <button type="button" className="btn-danger" disabled={busy || confirmation !== expected} onClick={async () => { setBusy(true); try { await onConfirm(confirmation); } finally { setBusy(false); } }}>Supprimer</button>
        </div>
      </div>
    </div>
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

function statusTone(status: string) {
  return ({
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-sky-100 text-sky-800',
    PREPARING: 'bg-indigo-100 text-indigo-800',
    SHIPPED: 'bg-blue-100 text-blue-800',
    OUT_FOR_DELIVERY: 'bg-cyan-100 text-cyan-800',
    DELIVERED: 'bg-success/10 text-success',
    CANCELLED: 'bg-coral text-white',
    RETURN_REQUESTED: 'bg-purple-100 text-purple-800',
    RETURNED: 'bg-slate-200 text-slate-700',
    REFUNDED: 'bg-emerald-100 text-emerald-800',
  } as Record<string, string>)[status] || 'bg-ocean/10 text-ocean';
}

function OrderEditModal({ order, onClose, onSaved }: { order: AdminOrder; onClose: () => void; onSaved: () => void }) {
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

function CancelOrderModal({ order, onClose, onConfirm }: { order: AdminOrder; onClose: () => void; onConfirm: (reason: string, note: string) => void }) {
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

function ProductModal({ product, categories, brands, onClose, onSaved, embedded = false }: { product: Product | null; categories: Category[]; brands: Brand[]; onClose: () => void; onSaved: () => void; embedded?: boolean }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [formError, setFormError] = useState('');
  const [currentProduct, setCurrentProduct] = useState<Product | null>(product);
  const [imageBusy, setImageBusy] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(() => ({
    slug: product?.slug,
    name: product?.name || '',
    sku: product?.sku || '',
    category_id: product?.category?.id ? String(product.category.id) : '',
    brand_id: product?.brand?.id ? String(product.brand.id) : '',
    regular_price: product?.regular_price || '',
    promotional_price: product?.promotional_price || '',
    short_description: product?.short_description || '',
    description: product?.description || '',
    status: product?.status || 'DRAFT',
    featured: Boolean(product?.featured),
    new_arrival: Boolean(product?.new_arrival),
    bestseller: Boolean(product?.bestseller),
    variants_payload: product?.variants?.length ? product.variants.map((v) => ({ id: v.id, sku: v.sku, color: v.values[0]?.value || '', size: v.values[1]?.value || '', capacity: v.values[2]?.value || '', price_override: v.price_override || '' })) : [],
  }));
  useEffect(() => {
    setCurrentProduct(product);
  }, [product]);
  const set = (key: keyof ProductForm, value: string | number | boolean | VariantForm[]) => setForm((current) => ({ ...current, [key]: value }));
  const savedProduct = currentProduct || product;
  const productImages = savedProduct?.images || [];
  const setMainImage = async (imageId: number) => {
    if (!savedProduct) return;
    setImageBusy(imageId);
    setFormError('');
    try {
      const { data } = await api.post<Product>(`/products/${savedProduct.slug}/set_main_image/`, { image_id: imageId });
      setCurrentProduct(data);
      toast.success('Image principale mise a jour');
    } catch (error) {
      setFormError(readBackendError(error));
    } finally {
      setImageBusy(null);
    }
  };
  const deleteImage = async (imageId: number) => {
    if (!savedProduct) return;
    setImageBusy(imageId);
    setFormError('');
    try {
      await api.delete(`/products/${savedProduct.slug}/delete_image/`, { data: { image_id: imageId } });
      setCurrentProduct({
        ...savedProduct,
        images: productImages.filter((image) => image.id !== imageId),
      });
      toast.success('Image supprimee');
    } catch (error) {
      setFormError(readBackendError(error));
    } finally {
      setImageBusy(null);
    }
  };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    setFormError('');
    try {
      const payload = { ...form, brand_id: form.brand_id || null, promotional_price: form.promotional_price || null };
      const { data } = product ? await api.patch<Product>(`/products/${product.slug}/`, payload) : await api.post<Product>('/products/', payload);
      if (files?.length) {
        const fd = new FormData();
        Array.from(files).forEach((file) => fd.append('images', file));
        await api.post(`/products/${data.slug}/upload_images/`, fd);
      }
      toast.success('Produit enregistre');
      onSaved();
    } catch (error) {
      setFormError(readBackendError(error));
    }
  };
  const formNode = (
      <form className="card mx-auto grid max-w-4xl gap-4 p-6" onSubmit={save}>
        <div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-bold">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2><button type="button" onClick={onClose}><X /></button></div>
        {formError && <div className="rounded-dolphin bg-coral/10 p-3 text-sm font-semibold text-coral">{formError}</div>}
        <div className="grid gap-4 md:grid-cols-2"><FormField required label="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} /><FormField required label="SKU unique" value={form.sku} onChange={(e) => set('sku', e.target.value)} /><SelectField required label="Categorie" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Categorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</SelectField><SelectField label="Marque" value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}><option value="">Marque</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</SelectField><FormField required label="Prix normal" type="number" step="0.01" value={form.regular_price} onChange={(e) => set('regular_price', e.target.value)} /><FormField label="Prix promo" type="number" step="0.01" value={form.promotional_price || ''} onChange={(e) => set('promotional_price', e.target.value)} /><SelectField label="Statut" value={form.status} onChange={(e) => set('status', e.target.value)}><option value="DRAFT">Brouillon</option><option value="ACTIVE">Actif</option><option value="ARCHIVED">Archive</option></SelectField></div>
        <textarea className="input" placeholder="Description courte" value={form.short_description} onChange={(e) => set('short_description', e.target.value)} /><textarea className="input min-h-28" placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3"><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Vedette</label><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.new_arrival} onChange={(e) => set('new_arrival', e.target.checked)} /> Nouveaute</label><label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.bestseller} onChange={(e) => set('bestseller', e.target.checked)} /> Bestseller</label></div>
        <div className="grid gap-3"><h3 className="font-heading text-lg font-bold">Variantes</h3>{form.variants_payload.map((variant, index) => <div key={index} className="grid gap-2 rounded-dolphin border p-3 md:grid-cols-6"><input className="input" placeholder="SKU variante" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value, form, set)} /><input className="input" placeholder="Couleur" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value, form, set)} /><input className="input" placeholder="Taille" value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value, form, set)} /><input className="input" placeholder="Capacite" value={variant.capacity} onChange={(e) => updateVariant(index, 'capacity', e.target.value, form, set)} /><input className="input" type="number" step="0.01" placeholder="Prix propre" value={variant.price_override || ''} onChange={(e) => updateVariant(index, 'price_override', e.target.value, form, set)} /><button type="button" className="btn-secondary text-coral" onClick={() => set('variants_payload', form.variants_payload.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" className="btn-secondary" onClick={() => set('variants_payload', [...form.variants_payload, { sku: `${form.sku}-V${form.variants_payload.length + 1}`, color: '', size: '', capacity: '', price_override: '' }])}><Plus className="h-4 w-4" />Ajouter une variante</button></div>
        <div className="grid gap-3"><ImageUploader label="Ajouter des images produit" files={files} onChange={setFiles} />{productImages.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{productImages.map((image) => <div key={image.id} className="rounded-dolphin border p-2"><img className="aspect-square w-full rounded-dolphin object-cover" src={mediaUrl(image.image)} alt={image.alt_text || savedProduct?.name || 'Produit'} /><div className="mt-2 grid gap-2"><button type="button" className="btn-secondary" disabled={imageBusy === image.id || image.is_main} onClick={() => setMainImage(image.id)}>{image.is_main ? 'Principale' : 'Definir principale'}</button><button type="button" className="btn-secondary text-coral" disabled={imageBusy === image.id} onClick={() => deleteImage(image.id)}>Supprimer</button></div></div>)}</div> : null}</div>
        <button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button>
      </form>
  );
  if (embedded) return formNode;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4">
      {formNode}
    </div>
  );
}

function updateVariant(index: number, key: keyof VariantForm, value: string | number, form: ProductForm, set: (key: keyof ProductForm, value: VariantForm[]) => void) {
  set('variants_payload', form.variants_payload.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
}

export function CategoriesAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: '', name: '', parent: '', display_order: 0, description: '' });
  const [statusFilter, setStatusFilter] = useState('');
  const [confirming, setConfirming] = useState<Category | null>(null);
  const [busyCategory, setBusyCategory] = useState<number | null>(null);
  const [productsCategory, setProductsCategory] = useState<Category | null>(null);
  const categoryQuery = `/categories/?ordering=display_order${statusFilter ? `&is_active=${statusFilter}` : ''}`;
  const categories = useQuery({ queryKey: ['admin-categories-full', statusFilter], queryFn: async () => (await api.get<Paginated<Category>>(categoryQuery)).data });
  const invalidateCategories = () => {
    qc.invalidateQueries({ queryKey: ['admin-categories-full'] });
    qc.invalidateQueries({ queryKey: ['admin-categories'] });
    invalidateProductQueries(qc);
  };
  const save = async (e: FormEvent) => {
    e.preventDefault();
    const payload = { name: form.name, parent: form.parent || null, display_order: form.display_order, description: form.description };
    if (form.slug) {
      await api.patch(`/categories/${form.slug}/`, payload);
    } else {
      await api.post('/categories/', payload);
    }
    toast.success('Categorie enregistree');
    setForm({ slug: '', name: '', parent: '', display_order: 0, description: '' });
    invalidateCategories();
  };
  const toggleCategory = async (category: Category) => {
    setBusyCategory(category.id);
    try {
      await api.post(`/categories/${category.slug}/${category.is_active ? 'deactivate' : 'activate'}/`);
      toast.success(category.is_active ? 'Categorie desactivee' : 'Categorie activee');
      setConfirming(null);
      invalidateCategories();
    } catch {
      toast.error('Action impossible sur cette categorie');
    } finally {
      setBusyCategory(null);
    }
  };
  return (
    <AdminCrudShell title="Categories">
      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {categories.data?.results.map((category) => (
          <div key={category.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{category.name}</p>
              <p className="text-sm text-slate-500">{category.product_count || 0} produit(s)</p>
            </div>
            <button className="btn-secondary" onClick={() => setProductsCategory(category)}><PackageCheck className="h-4 w-4" />Voir produits</button>
          </div>
        ))}
      </div>
      {productsCategory && <CategoryProductsModal category={productsCategory} onClose={() => setProductsCategory(null)} />}
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-5" onSubmit={save}><input required className="input" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><select className="input" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}><option value="">Sans parent</option>{categories.data?.results.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /><input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form>
      <div className="card overflow-hidden">
        <div className="border-b p-4"><select className="input max-w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Toutes</option><option value="true">Actives</option><option value="false">Inactives</option></select></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Nom</th><th className="p-3">Slug</th><th className="p-3">Produits</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{categories.data?.results.map((category) => <tr key={category.id} className="border-t"><td className="p-3 font-semibold">{category.name}</td><td className="p-3">{category.slug}</td><td className="p-3">{category.product_count || 0}</td><td className="p-3"><StatusBadge status={category.is_active ? 'ACTIVE' : 'INACTIVE'} /></td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => setForm({ slug: category.slug, name: category.name, parent: category.parent ? String(category.parent) : '', display_order: category.display_order || 0, description: category.description || '' })}><Edit className="h-4 w-4" /></button><button className="btn-secondary" disabled={busyCategory === category.id} onClick={() => setConfirming(category)}>{category.is_active ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}{category.is_active ? 'Desactiver' : 'Activer'}</button><button className="btn-secondary text-coral" onClick={() => api.delete(`/categories/${category.slug}/`).then(() => { toast.success('Categorie supprimee'); invalidateCategories(); })}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
      </div>
      {confirming && <ConfirmDialog title={confirming.is_active ? 'Desactiver cette categorie ?' : 'Activer cette categorie ?'} description={confirming.is_active ? 'Désactiver cette catégorie masquera également tous ses produits dans la boutique. Les produits et l’historique des commandes ne seront pas supprimés.' : 'Cette categorie et ses produits actifs reapparaitront dans la boutique.'} confirmLabel={confirming.is_active ? 'Desactiver' : 'Activer'} tone={confirming.is_active ? 'danger' : 'primary'} onCancel={() => setConfirming(null)} onConfirm={() => toggleCategory(confirming)} />}
    </AdminCrudShell>
  );
}

function CategoryProductsModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const products = useQuery({
    queryKey: ['category-products', category.id],
    queryFn: async () => (await api.get<Paginated<Product>>(`/products/?category=${category.id}&ordering=-created_at&page_size=1000`)).data,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/50 p-4">
      <div className="mx-auto mt-10 max-w-5xl overflow-hidden rounded-lg bg-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b p-5">
          <div>
            <h2 className="font-heading text-2xl font-bold">Produits: {category.name}</h2>
            <p className="text-sm text-slate-500">{products.data?.count ?? category.product_count ?? 0} produit(s) dans cette categorie</p>
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}><X className="h-4 w-4" />Fermer</button>
        </div>

        {products.isLoading && <div className="p-6 text-slate-500">Chargement des produits...</div>}
        {products.isError && <div className="p-6 text-coral">Impossible de charger les produits de cette categorie.</div>}
        {!products.isLoading && !products.isError && !products.data?.results.length && <EmptyState title="Aucun produit" text="Cette categorie ne contient aucun produit pour le moment." />}

        {!!products.data?.results.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-mist">
                <tr><th className="p-3">Produit</th><th className="p-3">SKU</th><th className="p-3">Prix</th><th className="p-3">Statut</th></tr>
              </thead>
              <tbody>
                {products.data.results.map((product) => {
                  const mainImage = product.images?.find((image) => image.is_main)?.image || product.images?.[0]?.image;
                  return (
                    <tr key={product.id} className="border-t">
                      <td className="flex items-center gap-3 p-3">
                        <div className="h-14 w-14 overflow-hidden rounded-md bg-mist">
                          {mainImage ? <img className="h-full w-full object-cover" src={mediaUrl(mainImage)} alt={product.name} /> : <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Image</div>}
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{product.name}</p>
                          <p className="line-clamp-1 text-xs text-slate-500">{product.short_description}</p>
                        </div>
                      </td>
                      <td className="p-3">{product.sku || '-'}</td>
                      <td className="p-3 font-semibold">{money(product.current_price || product.regular_price)}</td>
                      <td className="p-3"><StatusBadge status={product.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function BrandsAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: '', name: '' });
  const brands = useQuery({ queryKey: ['admin-brands-full'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (form.slug) {
      await api.patch(`/brands/${form.slug}/`, { name: form.name });
    } else {
      await api.post('/brands/', { name: form.name });
    }
    toast.success('Marque enregistree');
    setForm({ slug: '', name: '' });
    qc.invalidateQueries({ queryKey: ['admin-brands-full'] });
  };
  return <AdminCrudShell title="Marques"><form className="card mb-6 flex gap-3 p-4" onSubmit={save}><input required className="input max-w-sm" placeholder="Nom de marque" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form><Rows rows={brands.data?.results || []} onEdit={(b) => setForm({ slug: b.slug, name: b.name })} onDelete={(b) => api.delete(`/brands/${b.slug}/`).then(() => qc.invalidateQueries({ queryKey: ['admin-brands-full'] }))} /></AdminCrudShell>;
}

function ProductImportAdmin() {
  const qc = useQueryClient();
  const [job, setJob] = useState<ImportJob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [updateExisting, setUpdateExisting] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);
  const history = useQuery({ queryKey: ['import-history'], queryFn: async () => (await api.get<Paginated<ImportJob>>('/admin/product-imports/')).data });
  const preview = async () => {
    if (!file) {
      toast.error('Choisissez un fichier');
      return;
    }
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post<ImportJob>('/admin/product-imports/preview/', fd);
    setJob(data);
    qc.invalidateQueries({ queryKey: ['import-history'] });
  };
  const commit = async () => {
    if (!job) return;
    const { data } = await api.post<ImportJob>(`/admin/product-imports/${job.id}/commit/`, { update_existing: updateExisting, skip_duplicates: !updateExisting, create_missing_relations: createMissing });
    setJob(data);
    toast.success('Import termine');
    qc.invalidateQueries({ queryKey: ['import-history'] });
  };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Importation des produits</h1><button className="btn-secondary" onClick={() => downloadFile('/admin/product-imports/template/', 'dolphin_product_import_template.xlsx')}><Download className="h-4 w-4" />Template Excel</button></div>
      <div className="card grid gap-4 p-5"><input className="input" type="file" accept=".csv,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} /><div className="flex flex-wrap gap-4"><label className="flex gap-2"><input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} /> Mettre a jour les SKU existants</label><label className="flex gap-2"><input type="checkbox" checked={createMissing} onChange={(e) => setCreateMissing(e.target.checked)} /> Creer categories et marques manquantes</label></div><div className="flex gap-3"><button className="btn-primary" onClick={preview}><Upload className="h-4 w-4" />Previsualiser</button><button className="btn-secondary" disabled={!job} onClick={commit}><Check className="h-4 w-4" />Importer</button>{job && <button className="btn-secondary" onClick={() => downloadFile(`/admin/product-imports/${job.id}/errors/`, `import-errors-${job.id}.csv`)}><Download className="h-4 w-4" />Rapport erreurs</button>}</div></div>
      {job && <div className="card mt-6 overflow-hidden"><div className="grid gap-2 border-b p-4 md:grid-cols-5"><strong>Lignes: {job.total_rows}</strong><span>Crees: {job.created_count}</span><span>Mis a jour: {job.updated_count}</span><span>Ignores: {job.skipped_count}</span><span>Erreurs: {job.failed_count}</span></div><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Ligne</th><th className="p-3">SKU</th><th className="p-3">Nom</th><th className="p-3">Etat</th></tr></thead><tbody>{job.rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.row_number}</td><td className="p-3">{String(row.normalized_data.sku || '')}</td><td className="p-3">{String(row.normalized_data.name || '')}</td><td className="p-3">{row.errors.length ? <span className="text-coral">{row.errors.join(' | ')}</span> : row.duplicate_sku ? 'SKU existant' : 'Valide'}</td></tr>)}</tbody></table></div></div>}
      <div className="card mt-6 p-5"><h2 className="mb-3 font-heading text-xl font-bold">Historique</h2>{history.data?.results.map((item) => <button key={item.id} className="grid w-full gap-2 border-t py-3 text-left md:grid-cols-5" onClick={() => setJob(item)}><span>{item.filename}</span><span>{item.status}</span><span>{new Date(item.created_at).toLocaleString('fr-MA')}</span><span>{item.created_count} crees</span><span>{item.failed_count} erreurs</span></button>)}</div>
    </div>
  );
}

export function AdminProductNewPage() {
  const navigate = useNavigate();
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_archived=false')).data });
  const brands = useQuery({ queryKey: ['admin-brands'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Nouveau produit</h1><Link className="btn-secondary" to="/admin/products">Retour</Link></div>
      <ProductModal product={null} categories={categories.data?.results || []} brands={brands.data?.results || []} onClose={() => navigate('/admin/products')} onSaved={() => navigate('/admin/products')} embedded />
    </div>
  );
}

export function AdminProductEditPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_archived=false')).data });
  const brands = useQuery({ queryKey: ['admin-brands'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const product = useQuery({ queryKey: ['admin-product', slug], enabled: Boolean(slug), queryFn: async () => (await api.get<Product>(`/products/${slug}/`)).data });
  if (product.isLoading) return <AdminCrudShell title="Produit"><div className="card p-6">Chargement du produit...</div></AdminCrudShell>;
  if (!product.data) return <AdminCrudShell title="Produit"><div className="card p-6 text-coral">Produit introuvable.</div></AdminCrudShell>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Modifier produit</h1><Link className="btn-secondary" to="/admin/products">Retour</Link></div>
      <ProductModal product={product.data} categories={categories.data?.results || []} brands={brands.data?.results || []} onClose={() => navigate('/admin/products')} onSaved={() => navigate('/admin/products')} embedded />
    </div>
  );
}

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const [editing, setEditing] = useState<AdminOrder | null>(null);
  const order = useQuery({ queryKey: ['admin-order', id], enabled: Boolean(id), queryFn: async () => (await api.get<AdminOrder>(`/orders/${id}/`)).data });
  if (order.isLoading) return <AdminCrudShell title="Commande"><div className="card p-6">Chargement de la commande...</div></AdminCrudShell>;
  if (!order.data) return <AdminCrudShell title="Commande"><div className="card p-6 text-coral">Commande introuvable.</div></AdminCrudShell>;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-heading text-3xl font-bold">{order.data.order_number}</h1><p className="text-sm text-slate-500">{new Date(order.data.created_at).toLocaleString('fr-MA')} - {statusLabel(order.data.status)}</p></div><div className="flex gap-2"><Link className="btn-secondary" to="/admin/orders">Retour</Link><button className="btn-primary" onClick={() => setEditing(order.data)}><Edit className="h-4 w-4" />Modifier</button></div></div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="card overflow-hidden"><h2 className="border-b p-4 font-heading text-xl font-bold">Articles</h2>{order.data.items.map((item) => <div key={item.id} className="grid gap-2 border-b p-4 text-sm md:grid-cols-[1fr_auto_auto_auto]"><span><strong>{item.product_name}</strong><p className="text-slate-500">{item.variant_label || item.sku}</p></span><span>Qte {item.quantity}</span><span>{money(item.unit_price)}</span><strong>{money(item.total)}</strong></div>)}<div className="grid gap-2 p-4 text-sm md:ml-auto md:w-80"><MoneyRow label="Sous-total" value={money(order.data.subtotal)} /><MoneyRow label="Remise" value={money(order.data.discount_total)} /><MoneyRow label="Livraison" value="Gratuite" /><MoneyRow label="Total" value={money(order.data.total)} strong /></div></div>
        <aside className="grid gap-6"><div className="card p-5"><h2 className="mb-3 font-heading text-xl font-bold">Client</h2><p className="font-semibold">{order.data.shipping_full_name}</p><p>{order.data.shipping_phone}</p><p>{order.data.guest_email}</p><p className="mt-3 text-slate-600">{order.data.shipping_address}, {order.data.shipping_city}</p></div><div className="card p-5"><h2 className="mb-3 font-heading text-xl font-bold">Timeline</h2><div className="grid gap-3">{order.data.status_history.map((event) => <div key={event.id} className="border-l-2 border-ocean pl-3"><strong>{statusLabel(event.to_status)}</strong><p className="text-xs text-slate-500">{new Date(event.created_at).toLocaleString('fr-MA')}</p>{event.note && <p className="text-sm text-slate-600">{event.note}</p>}</div>)}</div></div></aside>
      </div>
      {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); order.refetch(); }} />}
    </div>
  );
}

type ResourceField = { key: string; label: string; type?: 'text' | 'number' | 'date' | 'datetime-local' | 'checkbox' | 'select'; options?: string[]; required?: boolean };
type ResourceRow = Record<string, string | number | boolean | null | undefined> & { id: number };

const couponFields: ResourceField[] = [
  { key: 'code', label: 'Code', required: true },
  { key: 'discount_type', label: 'Type', type: 'select', options: ['PERCENT', 'FIXED', 'FREE_DELIVERY'], required: true },
  { key: 'value', label: 'Valeur', type: 'number' },
  { key: 'minimum_amount', label: 'Minimum', type: 'number' },
  { key: 'starts_at', label: 'Debut', type: 'datetime-local', required: true },
  { key: 'ends_at', label: 'Fin', type: 'datetime-local', required: true },
  { key: 'max_usage', label: 'Limite globale', type: 'number' },
  { key: 'max_usage_per_customer', label: 'Limite/client', type: 'number' },
  { key: 'first_order_only', label: 'Premiere commande', type: 'checkbox' },
  { key: 'is_active', label: 'Actif', type: 'checkbox' },
];
const promotionFields: ResourceField[] = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'discount_type', label: 'Type', type: 'select', options: ['PERCENT', 'FIXED'], required: true },
  { key: 'value', label: 'Valeur', type: 'number' },
  { key: 'minimum_amount', label: 'Minimum', type: 'number' },
  { key: 'starts_at', label: 'Debut', type: 'datetime-local', required: true },
  { key: 'ends_at', label: 'Fin', type: 'datetime-local', required: true },
  { key: 'is_active', label: 'Actif', type: 'checkbox' },
];
const deliveryZoneFields: ResourceField[] = [
  { key: 'city', label: 'Ville', required: true },
  { key: 'estimated_delivery_time', label: 'Delai' },
  { key: 'cash_on_delivery_available', label: 'COD', type: 'checkbox' },
  { key: 'is_active', label: 'Actif', type: 'checkbox' },
];
const bannerFields: ResourceField[] = [
  { key: 'title', label: 'Titre', required: true },
  { key: 'subtitle', label: 'Sous-titre' },
  { key: 'cta_label', label: 'CTA' },
  { key: 'cta_url', label: 'URL CTA' },
  { key: 'starts_at', label: 'Debut', type: 'datetime-local' },
  { key: 'ends_at', label: 'Fin', type: 'datetime-local' },
  { key: 'is_active', label: 'Actif', type: 'checkbox' },
];
const supplierFields: ResourceField[] = [
  { key: 'name', label: 'Nom', required: true },
  { key: 'base_url', label: 'URL source' },
  { key: 'percentage_margin', label: 'Marge %', type: 'number' },
  { key: 'fixed_cost', label: 'Cout fixe', type: 'number' },
  { key: 'minimum_profit', label: 'Profit minimum', type: 'number' },
  { key: 'is_active', label: 'Actif', type: 'checkbox' },
];
const expenseFields: ResourceField[] = [
  { key: 'category', label: 'Categorie', required: true },
  { key: 'amount', label: 'Montant', type: 'number', required: true },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'reference', label: 'Reference' },
  { key: 'notes', label: 'Notes' },
];

function emptyForm(fields: ResourceField[]) {
  return Object.fromEntries(fields.map((field) => [field.key, field.type === 'checkbox' ? true : '']));
}

function ResourceAdmin({ title, endpoint, fields }: { title: string; endpoint: string; fields: ResourceField[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [deleting, setDeleting] = useState<ResourceRow | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<Record<string, string | boolean | number>>(emptyForm(fields));
  const listUrl = endpointWithParams(endpoint, { search, page: String(page) });
  const query = useQuery({ queryKey: ['resource', endpoint, search, page], queryFn: async () => (await api.get<Paginated<ResourceRow>>(listUrl)).data });
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const payload = Object.fromEntries(fields.map((field) => [field.key, normalizeField(field, form[field.key])]));
    if (editing) {
      await api.patch(`${endpoint}${editing.id}/`, payload);
    } else {
      await api.post(endpoint, payload);
    }
    toast.success('Enregistre');
    setEditing(null);
    setForm(emptyForm(fields));
    qc.invalidateQueries({ queryKey: ['resource', endpoint] });
  };
  const edit = (row: ResourceRow) => {
    setEditing(row);
    setForm(Object.fromEntries(fields.map((field) => [field.key, field.type === 'datetime-local' ? toInputDate(row[field.key]) : row[field.key] ?? (field.type === 'checkbox' ? false : '')])));
  };
  return (
    <AdminCrudShell title={title}>
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-3" onSubmit={save}>
        {fields.map((field) => <FieldInput key={field.key} field={field} value={form[field.key]} onChange={(value) => setForm((current) => ({ ...current, [field.key]: value }))} />)}
        <div className="flex gap-2"><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button>{editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm(fields)); }}>Annuler</button>}</div>
      </form>
      <div className="mb-4 max-w-sm"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder={`Rechercher dans ${title.toLowerCase()}`} /></div>
      <DataTable rows={query.data?.results || []} fields={fields.slice(0, 5)} loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} onEdit={edit} onDelete={setDeleting} />
      {query.data && <div className="mt-4"><Pagination count={query.data.count} page={page} onPage={setPage} /></div>}
      {deleting && <ConfirmDialog title="Supprimer cet element ?" description="Cette action appelle l'endpoint de suppression backend pour la ressource selectionnee." confirmLabel="Supprimer" onCancel={() => setDeleting(null)} onConfirm={async () => { await api.delete(`${endpoint}${deleting.id}/`); toast.success('Element supprime'); setDeleting(null); qc.invalidateQueries({ queryKey: ['resource', endpoint] }); }} />}
    </AdminCrudShell>
  );
}

function FieldInput({ field, value, onChange }: { field: ResourceField; value: string | number | boolean | undefined; onChange: (value: string | number | boolean) => void }) {
  if (field.type === 'checkbox') return <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />{field.label}</label>;
  if (field.type === 'select') return <label className="grid gap-1 font-semibold">{field.label}<select required={field.required} className="input" value={String(value || '')} onChange={(event) => onChange(event.target.value)}><option value="">Choisir</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
  return <label className="grid gap-1 font-semibold">{field.label}<input required={field.required} className="input" type={field.type || 'text'} step={field.type === 'number' ? '0.01' : undefined} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)} /></label>;
}

function normalizeField(field: ResourceField, value: string | number | boolean | undefined) {
  if (field.type === 'number') return value === '' || value === undefined ? null : value;
  if (field.type === 'datetime-local') return value ? new Date(String(value)).toISOString() : null;
  return value;
}

function toInputDate(value: unknown) {
  if (!value) return '';
  return new Date(String(value)).toISOString().slice(0, 16);
}

function DataTable({ rows, fields, loading, error, onRetry, onEdit, onDelete }: { rows: ResourceRow[]; fields: ResourceField[]; loading?: boolean; error?: boolean; onRetry?: () => void; onEdit?: (row: ResourceRow) => void; onDelete?: (row: ResourceRow) => void }) {
  if (loading) return <EmptyState title="Chargement" text="Les donnees sont en cours de chargement." />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (!rows.length) return <EmptyState title="Aucun resultat" text="Aucune donnee disponible pour cette section." />;
  return <div className="card overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="bg-mist"><tr>{fields.map((field) => <th key={field.key} className="p-3">{field.label}</th>)}<th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t">{fields.map((field) => <td key={field.key} className="p-3">{formatCell(row[field.key])}</td>)}<td className="flex gap-2 p-3">{onEdit && <button className="btn-secondary" onClick={() => onEdit(row)}><Edit className="h-4 w-4" /></button>}{onDelete && <button className="btn-secondary text-coral" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4" /></button>}</td></tr>)}</tbody></table></div>;
}

function endpointWithParams(endpoint: string, params: Record<string, string>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const query = search.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

function formatCell(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'string' && value.includes('T')) return new Date(value).toLocaleString('fr-MA');
  return String(value ?? '');
}

function readBackendError(error: unknown) {
  const response = (error as { response?: { data?: unknown } }).response?.data;
  if (!response) return 'Erreur backend pendant l enregistrement.';
  if (typeof response === 'string') return response;
  if (Array.isArray(response)) return response.join(' ');
  if (typeof response === 'object') {
    return Object.entries(response as Record<string, unknown>)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(' ') : String(value)}`)
      .join(' | ');
  }
  return 'Erreur backend pendant l enregistrement.';
}

function CustomersAdmin() {
  const qc = useQueryClient();
  const customers = useQuery({ queryKey: ['customers'], queryFn: async () => (await api.get<Paginated<ResourceRow>>('/admin/customers/')).data });
  const updateStatus = async (row: ResourceRow, status: string) => {
    await api.patch(`/admin/customers/${row.id}/status/`, { status });
    toast.success('Client mis a jour');
    qc.invalidateQueries({ queryKey: ['customers'] });
  };
  return <AdminCrudShell title="Clients"><div className="card overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Email</th><th className="p-3">Nom</th><th className="p-3">Commandes</th><th className="p-3">Depense</th><th className="p-3">Statut</th></tr></thead><tbody>{customers.data?.results.map((row) => <tr key={row.id} className="border-t"><td className="p-3">{row.email}</td><td className="p-3">{row.first_name} {row.last_name}</td><td className="p-3">{row.order_count}</td><td className="p-3">{money(Number(row.total_spent || 0))}</td><td className="p-3"><select className="input max-w-40" value={String(row.status)} onChange={(event) => updateStatus(row, event.target.value)}><option value="ACTIVE">Actif</option><option value="BLOCKED">Bloque</option><option value="PENDING">En attente</option></select></td></tr>)}</tbody></table></div></AdminCrudShell>;
}

function StaffAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<ResourceRow | null>(null);
  const staff = useQuery({ queryKey: ['staff', search, page], queryFn: async () => (await api.get<Paginated<ResourceRow>>(endpointWithParams('/admin/staff/', { search, page: String(page) }))).data });
  const update = async (row: ResourceRow, patch: Record<string, string | boolean>) => {
    await api.patch(`/admin/staff/${row.id}/`, patch);
    toast.success('Staff mis a jour');
    qc.invalidateQueries({ queryKey: ['staff'] });
  };
  return (
    <AdminCrudShell title="Staff">
      <div className="mb-4 max-w-sm"><SearchInput value={search} onChange={(value) => { setSearch(value); setPage(1); }} placeholder="Rechercher un membre staff" /></div>
      <div className="hidden md:block">
        <DataTable
          rows={staff.data?.results || []}
          fields={[{ key: 'email', label: 'Email' }, { key: 'first_name', label: 'Prenom' }, { key: 'last_name', label: 'Nom' }, { key: 'role', label: 'Role' }, { key: 'status', label: 'Statut' }]}
          loading={staff.isLoading}
          error={staff.isError}
          onRetry={() => staff.refetch()}
          onDelete={setDeleting}
          onEdit={(row) => update(row, { is_staff: !row.is_staff })}
        />
      </div>
      <div className="mt-4 grid gap-3">
        {staff.data?.results.map((row) => (
          <div key={row.id} className="card grid gap-3 p-4 md:grid-cols-[1fr_220px_180px_auto] md:items-center">
            <div className="min-w-0"><strong className="break-all">{row.email}</strong><p className="text-sm text-slate-500">{row.first_name} {row.last_name}</p></div>
            <SelectField label="Role" value={String(row.role || '')} onChange={(event) => update(row, { role: event.target.value })}>
              <option value="MANAGER">MANAGER</option>
              <option value="ORDER_OPERATOR">ORDER_OPERATOR</option>
              <option value="CUSTOMER_SUPPORT">CUSTOMER_SUPPORT</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
            </SelectField>
            <SelectField label="Statut" value={String(row.status || '')} onChange={(event) => update(row, { status: event.target.value })}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="PENDING">PENDING</option>
            </SelectField>
            <button className="btn-secondary text-coral" onClick={() => setDeleting(row)}><Trash2 className="h-4 w-4" />Supprimer</button>
          </div>
        ))}
      </div>
      {staff.data && <div className="mt-4"><Pagination count={staff.data.count} page={page} onPage={setPage} /></div>}
      {deleting && <ConfirmDialog title="Supprimer ce compte staff ?" description={`Suppression du compte ${deleting.email}. Le backend bloque la suppression du dernier SUPER_ADMIN actif et l'auto-suppression.`} confirmLabel="Supprimer" onCancel={() => setDeleting(null)} onConfirm={async () => { await api.delete(`/admin/staff/${deleting.id}/`); toast.success('Compte staff supprime'); setDeleting(null); qc.invalidateQueries({ queryKey: ['staff'] }); }} />}
    </AdminCrudShell>
  );
}

function ModerationAdmin({ title, endpoint }: { title: string; endpoint: string }) {
  const query = useQuery({ queryKey: ['moderation', endpoint], queryFn: async () => (await api.get<Paginated<ResourceRow>>(endpoint)).data });
  const sample = query.data?.results[0];
  const fields = Object.keys(sample || { id: 0, status: '', created_at: '' }).filter((key) => !['messages', 'images'].includes(key)).slice(0, 6).map((key) => ({ key, label: key.replace(/_/g, ' ') }));
  return <AdminCrudShell title={title}><DataTable rows={query.data?.results || []} fields={fields} /></AdminCrudShell>;
}

function DesignSettingsAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['design-settings'], queryFn: async () => (await api.get<Record<string, string>>('/settings/design/')).data });
  const [form, setForm] = useState<Record<string, string>>({});
  const current = { ...(data || {}), ...form };
  const save = async (event: FormEvent) => {
    event.preventDefault();
    await api.patch('/settings/design/', current);
    toast.success('Design mis a jour');
    setForm({});
    qc.invalidateQueries({ queryKey: ['design-settings'] });
  };
  return <AdminCrudShell title="Parametres boutique"><form className="card grid gap-3 p-4 md:grid-cols-2" onSubmit={save}>{['store_name', 'tagline', 'announcement', 'hero_eyebrow', 'primary_color', 'accent_color', 'logo_url', 'footer_text'].map((key) => <label key={key} className="grid gap-1 font-semibold">{key.replace(/_/g, ' ')}<input className="input" type={key.includes('color') ? 'color' : 'text'} value={current[key] || ''} onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))} /></label>)}<button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form></AdminCrudShell>;
}

function ReportsAdmin() {
  const exports = ['orders', 'products', 'customers', 'staff', 'coupons', 'expenses', 'margins', 'suppliers'];
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const suffix = (format = 'csv') => {
    const params = new URLSearchParams();
    if (format !== 'csv') params.set('file_format', format);
    if (dateFrom) params.set('date_from', dateFrom);
    if (dateTo) params.set('date_to', dateTo);
    const query = params.toString();
    return query ? `?${query}` : '';
  };
  return <AdminCrudShell title="Rapports"><div className="card mb-6 grid gap-3 p-4 md:grid-cols-3"><label className="grid gap-1 font-semibold">Du<input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} /></label><label className="grid gap-1 font-semibold">Au<input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} /></label><div className="grid content-end text-sm text-slate-600">Les filtres de periode sont envoyes aux rapports compatibles.</div></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{exports.map((kind) => <div key={kind} className="card grid gap-2 p-4"><strong className="capitalize">{kind}</strong><button className="btn-secondary" onClick={() => downloadFile(`/reports/export/${kind}/${suffix()}`, `dolphin-${kind}.csv`)}><Download className="h-4 w-4" />CSV</button><button className="btn-secondary" onClick={() => downloadFile(`/reports/export/${kind}/${suffix('xlsx')}`, `dolphin-${kind}.xlsx`)}><Download className="h-4 w-4" />Excel</button><button className="btn-secondary" onClick={() => downloadFile(`/reports/export/${kind}/${suffix('pdf')}`, `dolphin-${kind}.pdf`)}><Download className="h-4 w-4" />PDF</button></div>)}</div></AdminCrudShell>;
}

function AuditLogsAdmin() {
  const logs = useQuery({ queryKey: ['audit-logs'], queryFn: async () => (await api.get<Paginated<ResourceRow>>('/developer/audit-logs/')).data });
  return <AdminCrudShell title="Audit logs"><DataTable rows={logs.data?.results || []} fields={[{ key: 'created_at', label: 'Date' }, { key: 'actor_email', label: 'Acteur' }, { key: 'action', label: 'Action' }, { key: 'entity', label: 'Entite' }, { key: 'entity_id', label: 'ID' }]} /></AdminCrudShell>;
}

function Rows<T extends { id: number; name: string; slug: string; is_archived?: boolean; display_order?: number; parent?: number | null; description?: string }>({ rows, onEdit, onArchive, onDelete }: { rows: T[]; onEdit: (row: T) => void; onArchive?: (row: T) => void; onDelete: (row: T) => void }) {
  return <div className="card overflow-hidden"><table className="w-full text-left"><thead className="bg-mist"><tr><th className="p-3">Nom</th><th className="p-3">Slug</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.slug}</td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => onEdit(row)}><Edit className="h-4 w-4" /></button>{onArchive && <button className="btn-secondary" onClick={() => onArchive(row)}>{row.is_archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>}<button className="btn-secondary text-coral" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>;
}

function AdminCrudShell({ title, children }: { title: string; children: ReactNode }) {
  return <div><h1 className="mb-6 font-heading text-3xl font-bold">{title}</h1>{children}</div>;
}

function NavigateBack() {
  return <div><h1 className="mb-6 font-heading text-3xl font-bold">Module inconnu</h1><div className="card p-6">Cette section Admin n'existe pas.</div></div>;
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}

function MoneyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? 'border-t pt-3 text-lg font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>;
}
