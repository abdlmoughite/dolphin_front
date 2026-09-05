import { Archive, BarChart3, Boxes, Check, Copy, Download, Edit, PackageCheck, Plus, RotateCcw, Save, Trash2, Truck, Upload, Users, X } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api, Brand, Category, downloadFile, Paginated, Product } from '../lib/api';
import { money } from '../lib/i18n';

type VariantForm = { id?: number; sku: string; stock: number; color: string; size: string; capacity: string; price_override?: string };
type ProductForm = {
  slug?: string;
  name: string;
  sku: string;
  category_id: string;
  brand_id: string;
  regular_price: string;
  promotional_price: string;
  low_stock_threshold: number;
  short_description: string;
  description: string;
  status: string;
  featured: boolean;
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
  const chart = [{ day: 'Lun', ventes: 1200 }, { day: 'Mar', ventes: 2100 }, { day: 'Mer', ventes: 1600 }, { day: 'Jeu', ventes: 2600 }, { day: 'Ven', ventes: 3100 }];
  return (
    <div>
      <h1 className="mb-6 font-heading text-3xl font-bold">Dashboard admin</h1>
      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={<BarChart3 />} label="Revenu mois" value={money(data?.revenue_month || 0)} />
        <Metric icon={<PackageCheck />} label="Commandes" value={data?.total_orders || 0} />
        <Metric icon={<Users />} label="En attente" value={data?.pending_orders || 0} />
        <Metric icon={<Boxes />} label="Stock bas" value={data?.low_stock_products || 0} />
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
  return <GenericAdmin section={section || 'admin'} />;
}

function OrdersAdmin() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<AdminOrder | null>(null);
  const [cancelOrder, setCancelOrder] = useState<AdminOrder | null>(null);
  const query = new URLSearchParams();
  if (search) query.set('search', search);
  if (statusFilter) query.set('status', statusFilter);
  query.set('ordering', '-created_at');
  const orders = useQuery({ queryKey: ['admin-orders', search, statusFilter], queryFn: async () => (await api.get<Paginated<AdminOrder>>(`/orders/?${query}`)).data });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-orders'] });
  const transition = async (order: AdminOrder, nextStatus: string, extra: Record<string, string> = {}) => {
    await api.post(`/orders/${order.id}/transition/`, { status: nextStatus, ...extra });
    toast.success('Statut de commande mis a jour');
    setCancelOrder(null);
    refresh();
  };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Commandes</h1><button className="btn-secondary" onClick={() => downloadFile('/developer/export/orders/', 'dolphin-orders.csv')}><Download className="h-4 w-4" />Export CSV</button></div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher numero, client, telephone" value={search} onChange={(e) => setSearch(e.target.value)} /><select className="input max-w-56" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tous les statuts</option>{orderStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3">Commande</th><th className="p-3">Client</th><th className="p-3">Telephone</th><th className="p-3">Ville</th><th className="p-3">Total</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{orders.data?.results.map((order) => <tr key={order.id} className="border-t"><td className="p-3 font-semibold">{order.order_number}<p className="text-xs font-normal text-slate-500">{new Date(order.created_at).toLocaleString('fr-MA')}</p></td><td className="p-3">{order.shipping_full_name}<p className="text-xs text-slate-500">{order.guest_email}</p></td><td className="p-3">{order.shipping_phone}</td><td className="p-3">{order.shipping_city}</td><td className="p-3 font-semibold">{money(order.total)}</td><td className="p-3"><span className={`badge ${order.status === 'CANCELLED' ? 'bg-coral text-white' : 'bg-ocean/10 text-ocean'}`}>{statusLabel(order.status)}</span></td><td className="min-w-80 p-3"><div className="flex flex-wrap gap-2"><button className="btn-secondary" onClick={() => setEditing(order)}><Edit className="h-4 w-4" />Modifier</button><button className="btn-secondary" disabled={order.status !== 'PENDING'} onClick={() => transition(order, 'CONFIRMED')}><Check className="h-4 w-4" />Confirmer</button><button className="btn-secondary" disabled={!['CONFIRMED', 'PREPARING'].includes(order.status)} onClick={() => transition(order, order.status === 'CONFIRMED' ? 'PREPARING' : 'SHIPPED')}><Truck className="h-4 w-4" />Avancer</button><button className="btn-secondary text-coral" disabled={['CANCELLED', 'DELIVERED', 'RETURNED', 'REFUNDED'].includes(order.status)} onClick={() => setCancelOrder(order)}><X className="h-4 w-4" />Annuler</button></div></td></tr>)}</tbody></table></div>
      </div>
      {editing && <OrderEditModal order={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />}
      {cancelOrder && <CancelOrderModal order={cancelOrder} onClose={() => setCancelOrder(null)} onConfirm={(reason, note) => transition(cancelOrder, 'CANCELLED', { cancellation_reason: reason, note })} />}
    </div>
  );
}

function ProductsAdmin() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const products = useQuery({ queryKey: ['admin-products', search], queryFn: async () => (await api.get<Paginated<Product>>(`/products/?search=${encodeURIComponent(search)}`)).data });
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?is_archived=false')).data });
  const brands = useQuery({ queryKey: ['admin-brands'], queryFn: async () => (await api.get<Paginated<Brand>>('/brands/')).data });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-products'] });
  const bulk = async (action: string) => {
    await api.post('/products/bulk/', { ids: selected, action });
    toast.success('Action appliquee');
    setSelected([]);
    refresh();
  };
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><h1 className="font-heading text-3xl font-bold">Produits</h1><button className="btn-primary" onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" />Nouveau produit</button></div>
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b p-4"><input className="input max-w-sm" placeholder="Rechercher par nom, SKU ou marque" value={search} onChange={(e) => setSearch(e.target.value)} /><button className="btn-secondary" disabled={!selected.length} onClick={() => bulk('activate')}><Check className="h-4 w-4" />Activer</button><button className="btn-secondary" disabled={!selected.length} onClick={() => bulk('archive')}><Archive className="h-4 w-4" />Archiver</button><button className="btn-secondary" disabled={!selected.length} onClick={() => bulk('feature')}><Check className="h-4 w-4" />Vedette</button></div>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-mist"><tr><th className="p-3"></th><th className="p-3">Produit</th><th className="p-3">SKU</th><th className="p-3">Prix</th><th className="p-3">Source</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr></thead><tbody>{products.data?.results.map((product) => <tr key={product.id} className="border-t"><td className="p-3"><input type="checkbox" checked={selected.includes(product.id)} onChange={(e) => setSelected((ids) => e.target.checked ? [...ids, product.id] : ids.filter((id) => id !== product.id))} /></td><td className="p-3 font-semibold">{product.name}</td><td className="p-3">{product.sku}</td><td className="p-3">{money(product.current_price)}</td><td className="p-3">{product.source_type}</td><td className="p-3"><span className="badge bg-ocean/10 text-ocean">{product.status}</span></td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => { setEditing(product); setOpen(true); }}><Edit className="h-4 w-4" /></button><button className="btn-secondary" onClick={() => api.post(`/products/${product.slug}/duplicate/`).then(() => { toast.success('Produit duplique'); refresh(); })}><Copy className="h-4 w-4" /></button><button className="btn-secondary" onClick={() => api.post(`/products/${product.slug}/${product.status === 'ARCHIVED' ? 'restore' : 'archive'}/`).then(refresh)}>{product.status === 'ARCHIVED' ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button><button className="btn-secondary text-coral" onClick={() => api.delete(`/products/${product.slug}/`).then(() => { toast.success('Produit supprime ou archive'); refresh(); })}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>
      </div>
      {open && <ProductModal product={editing} categories={categories.data?.results || []} brands={brands.data?.results || []} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); refresh(); }} />}
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

function ProductModal({ product, categories, brands, onClose, onSaved }: { product: Product | null; categories: Category[]; brands: Brand[]; onClose: () => void; onSaved: () => void }) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [form, setForm] = useState<ProductForm>(() => ({
    slug: product?.slug,
    name: product?.name || '',
    sku: product?.sku || '',
    category_id: product?.category?.id ? String(product.category.id) : '',
    brand_id: product?.brand?.id ? String(product.brand.id) : '',
    regular_price: product?.regular_price || '',
    promotional_price: product?.promotional_price || '',
    low_stock_threshold: product?.low_stock_threshold || 5,
    short_description: product?.short_description || '',
    description: product?.description || '',
    status: product?.status || 'DRAFT',
    featured: Boolean(product?.featured),
    variants_payload: product?.variants?.length ? product.variants.map((v) => ({ id: v.id, sku: v.sku, stock: v.inventory?.quantity || 0, color: v.values[0]?.value || '', size: v.values[1]?.value || '', capacity: v.values[2]?.value || '', price_override: v.price_override || '' })) : [{ sku: product?.sku ? `${product.sku}-DEFAULT` : '', stock: 0, color: '', size: '', capacity: '' }],
  }));
  const set = (key: keyof ProductForm, value: string | number | boolean | VariantForm[]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async (event: FormEvent) => {
    event.preventDefault();
    const payload = { ...form, brand_id: form.brand_id || null, promotional_price: form.promotional_price || null };
    const { data } = product ? await api.patch<Product>(`/products/${product.slug}/`, payload) : await api.post<Product>('/products/', payload);
    if (files?.length) {
      const fd = new FormData();
      Array.from(files).forEach((file) => fd.append('images', file));
      await api.post(`/products/${data.slug}/upload_images/`, fd);
    }
    toast.success('Produit enregistre');
    onSaved();
  };
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy/40 p-4">
      <form className="card mx-auto grid max-w-4xl gap-4 p-6" onSubmit={save}>
        <div className="flex items-center justify-between"><h2 className="font-heading text-2xl font-bold">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2><button type="button" onClick={onClose}><X /></button></div>
        <div className="grid gap-4 md:grid-cols-2"><input required className="input" placeholder="Nom" value={form.name} onChange={(e) => set('name', e.target.value)} /><input required className="input" placeholder="SKU unique" value={form.sku} onChange={(e) => set('sku', e.target.value)} /><select required className="input" value={form.category_id} onChange={(e) => set('category_id', e.target.value)}><option value="">Categorie</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><select className="input" value={form.brand_id} onChange={(e) => set('brand_id', e.target.value)}><option value="">Marque</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><input required className="input" type="number" step="0.01" placeholder="Prix normal" value={form.regular_price} onChange={(e) => set('regular_price', e.target.value)} /><input className="input" type="number" step="0.01" placeholder="Prix promo" value={form.promotional_price || ''} onChange={(e) => set('promotional_price', e.target.value)} /><input className="input" type="number" placeholder="Seuil stock bas" value={form.low_stock_threshold} onChange={(e) => set('low_stock_threshold', Number(e.target.value))} /><select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}><option value="DRAFT">Brouillon</option><option value="ACTIVE">Actif</option><option value="OUT_OF_STOCK">Rupture</option><option value="ARCHIVED">Archive</option></select></div>
        <textarea className="input" placeholder="Description courte" value={form.short_description} onChange={(e) => set('short_description', e.target.value)} /><textarea className="input min-h-28" placeholder="Description" value={form.description} onChange={(e) => set('description', e.target.value)} />
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Produit en vedette</label>
        <div className="grid gap-3"><h3 className="font-heading text-lg font-bold">Variantes et stock</h3>{form.variants_payload.map((variant, index) => <div key={index} className="grid gap-2 rounded-dolphin border p-3 md:grid-cols-6"><input className="input" placeholder="SKU variante" value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value, form, set)} /><input className="input" placeholder="Couleur" value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value, form, set)} /><input className="input" placeholder="Taille" value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value, form, set)} /><input className="input" placeholder="Capacite" value={variant.capacity} onChange={(e) => updateVariant(index, 'capacity', e.target.value, form, set)} /><input className="input" type="number" placeholder="Stock" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', Number(e.target.value), form, set)} /><button type="button" className="btn-secondary text-coral" onClick={() => set('variants_payload', form.variants_payload.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></button></div>)}<button type="button" className="btn-secondary" onClick={() => set('variants_payload', [...form.variants_payload, { sku: `${form.sku}-V${form.variants_payload.length + 1}`, stock: 0, color: '', size: '', capacity: '' }])}><Plus className="h-4 w-4" />Ajouter une variante</button></div>
        <label className="grid gap-1 font-semibold">Images produit<input className="input" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={(e) => setFiles(e.target.files)} /></label>
        <button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button>
      </form>
    </div>
  );
}

function updateVariant(index: number, key: keyof VariantForm, value: string | number, form: ProductForm, set: (key: keyof ProductForm, value: VariantForm[]) => void) {
  set('variants_payload', form.variants_payload.map((variant, i) => i === index ? { ...variant, [key]: value } : variant));
}

function CategoriesAdmin() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: '', name: '', parent: '', display_order: 0, description: '' });
  const categories = useQuery({ queryKey: ['admin-categories-full'], queryFn: async () => (await api.get<Paginated<Category>>('/categories/?ordering=display_order')).data });
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
    qc.invalidateQueries({ queryKey: ['admin-categories-full'] });
  };
  return (
    <AdminCrudShell title="Categories">
      <form className="card mb-6 grid gap-3 p-4 md:grid-cols-5" onSubmit={save}><input required className="input" placeholder="Nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><select className="input" value={form.parent} onChange={(e) => setForm({ ...form, parent: e.target.value })}><option value="">Sans parent</option>{categories.data?.results.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select><input className="input" type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} /><input className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><button className="btn-primary"><Save className="h-4 w-4" />Enregistrer</button></form>
      <Rows rows={categories.data?.results || []} onEdit={(c) => setForm({ slug: c.slug, name: c.name, parent: c.parent ? String(c.parent) : '', display_order: c.display_order || 0, description: c.description || '' })} onArchive={(c) => api.post(`/categories/${c.slug}/${c.is_archived ? 'restore' : 'archive'}/`).then(() => qc.invalidateQueries({ queryKey: ['admin-categories-full'] }))} onDelete={(c) => api.delete(`/categories/${c.slug}/`).then(() => qc.invalidateQueries({ queryKey: ['admin-categories-full'] }))} />
    </AdminCrudShell>
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

function Rows<T extends { id: number; name: string; slug: string; is_archived?: boolean; display_order?: number; parent?: number | null; description?: string }>({ rows, onEdit, onArchive, onDelete }: { rows: T[]; onEdit: (row: T) => void; onArchive?: (row: T) => void; onDelete: (row: T) => void }) {
  return <div className="card overflow-hidden"><table className="w-full text-left"><thead className="bg-mist"><tr><th className="p-3">Nom</th><th className="p-3">Slug</th><th className="p-3">Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t"><td className="p-3 font-semibold">{row.name}</td><td className="p-3">{row.slug}</td><td className="flex gap-2 p-3"><button className="btn-secondary" onClick={() => onEdit(row)}><Edit className="h-4 w-4" /></button>{onArchive && <button className="btn-secondary" onClick={() => onArchive(row)}>{row.is_archived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>}<button className="btn-secondary text-coral" onClick={() => onDelete(row)}><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>;
}

function AdminCrudShell({ title, children }: { title: string; children: JSX.Element | JSX.Element[] }) {
  return <div><h1 className="mb-6 font-heading text-3xl font-bold">{title}</h1>{children}</div>;
}

function GenericAdmin({ section }: { section: string }) {
  return <div><h1 className="mb-6 font-heading text-3xl font-bold capitalize">{section}</h1><div className="card p-6">Section connectee a l'API existante, prete pour les formulaires metier detailles.</div></div>;
}

function Metric({ icon, label, value }: { icon: JSX.Element; label: string; value: string | number }) {
  return <div className="card p-5"><div className="mb-3 text-ocean">{icon}</div><p className="text-sm text-slate-500">{label}</p><strong className="text-2xl">{value}</strong></div>;
}
