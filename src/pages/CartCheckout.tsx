import { CheckCircle, CreditCard, Download, MapPin, Minus, PackageCheck, Plus, Ticket, Trash2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, downloadFile, mediaUrl, Order, Paginated, readApiError } from '../lib/api';
import { money } from '../lib/i18n';
import { useCart } from '../stores/cart';
import { EmptyState, PageHeader, StatCard } from '../components/ui';

export function CartPage() {
  const { cart, update, remove, applyCoupon } = useCart();
  const { register, handleSubmit } = useForm<{ code: string }>();
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  return (
    <section className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Panier" description="Controlez les quantites avant de passer au checkout." />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="grid gap-4">
          {cart?.items?.length ? cart.items.map((item) => {
            const product = item.product || item.variant?.product;
            const title = item.product_name || product?.name || item.variant?.sku || 'Produit';
            const sku = item.variant?.sku || product?.sku;
            const image = product?.images?.find((img) => img.is_main)?.image || product?.images?.[0]?.image;
            const nextQuantity = Math.max(1, item.quantity - 1);
            return (
              <div key={item.id} className="card grid gap-4 p-4 sm:grid-cols-[112px_1fr] lg:grid-cols-[128px_1fr_auto] lg:items-center">
                <div className="aspect-square overflow-hidden rounded-dolphin bg-mist">
                  {image ? <img className="h-full w-full object-cover" src={mediaUrl(image)} alt={title} /> : <div className="flex h-full w-full items-center justify-center p-3 text-center text-sm font-semibold text-ocean">{title}</div>}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="font-heading text-xl font-bold text-navy">{title}</h2>
                      {sku && <p className="mt-1 text-sm font-semibold text-slate-500">SKU: {sku}</p>}
                    </div>
                    <strong className="text-lg text-navy">{money(item.line_total)}</strong>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <div className="flex items-center overflow-hidden rounded-dolphin border border-slate-200 bg-white">
                      <button type="button" className="grid h-10 w-10 place-items-center text-ocean hover:bg-mist disabled:text-slate-300" disabled={item.quantity <= 1} onClick={() => update(item.id, nextQuantity)} aria-label="Diminuer quantite"><Minus className="h-4 w-4" /></button>
                      <input className="h-10 w-14 border-x border-slate-200 text-center font-bold outline-none" type="number" min={1} value={item.quantity} onChange={(event) => update(item.id, Math.max(1, Number(event.target.value) || 1))} aria-label="Quantite" />
                      <button type="button" className="grid h-10 w-10 place-items-center text-ocean hover:bg-mist" onClick={() => update(item.id, item.quantity + 1)} aria-label="Augmenter quantite"><Plus className="h-4 w-4" /></button>
                    </div>
                    <button className="inline-flex items-center gap-2 rounded-dolphin px-3 py-2 text-sm font-bold text-coral hover:bg-coral/10" onClick={() => remove(item.id)} aria-label="Supprimer"><Trash2 className="h-4 w-4" />Supprimer</button>
                  </div>
                </div>
              </div>
            );
          }) : <EmptyState title="Votre panier est vide" text="Ajoutez un produit depuis le catalogue." />}
        </div>
        <aside className="card grid gap-4 p-5 lg:sticky lg:top-24">
          <div>
            <p className="text-sm font-bold uppercase text-ocean">Commande</p>
            <h2 className="font-heading text-2xl font-bold text-navy">Resume</h2>
            <p className="mt-1 text-sm text-slate-500">{itemCount} article(s) dans votre panier</p>
          </div>
          <div className="grid gap-3 rounded-dolphin bg-mist/70 p-4">
            <Row label="Sous-total" value={money(cart?.subtotal || 0)} />
            <Row label="Remise" value={money(cart?.discount_total || 0)} />
            <Row label="Livraison" value="Gratuite" />
            <Row label="Total" value={money(cart?.total || 0)} strong />
          </div>
          <form className="flex gap-2" onSubmit={handleSubmit((v) => applyCoupon(v.code).then(() => toast.success('Coupon applique')))}><input className="input" placeholder="Coupon" {...register('code')} /><button className="btn-secondary" aria-label="Appliquer coupon"><Ticket className="h-4 w-4" /></button></form>
          <Link className={`btn-primary justify-center ${!cart?.items?.length ? 'pointer-events-none opacity-60' : ''}`} to="/checkout" aria-disabled={!cart?.items?.length}>Commander</Link>
          <Link className="btn-secondary justify-center" to="/catalogue">Continuer mes achats</Link>
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? 'border-t pt-3 text-lg font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>;
}

const schema = z.object({
  shipping_full_name: z.string().min(2, 'Nom requis'),
  shipping_phone: z.string().min(10, 'Telephone requis'),
  shipping_address: z.string().min(6, 'Adresse requise'),
  shipping_city: z.string().min(2, 'Ville requise'),
  payment_method: z.enum(['COD', 'BANK_TRANSFER']),
  customer_note: z.string().optional(),
});

type CheckoutForm = z.infer<typeof schema>;

export function CheckoutPage() {
  const { cart } = useCart();
  if (!cart?.items?.length) return <section className="mx-auto max-w-3xl px-4 py-12"><EmptyState title="Panier vide" text="Ajoutez au moins un produit avant de passer commande." action={<Link className="btn-primary" to="/catalogue">Retour catalogue</Link>} /></section>;
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <PageHeader title="Checkout" description="Completez vos informations. La livraison est gratuite." />
      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <StatCard icon={<UserRound />} label="1. Client / الزبون" value="Coordonnees / المعلومات" />
        <StatCard icon={<MapPin />} label="2. Livraison / التوصيل" value="Ville / المدينة" />
        <StatCard icon={<CreditCard />} label="3. Paiement / الأداء" value="COD / Virement" />
        <StatCard icon={<PackageCheck />} label="4. Validation / التأكيد" value={money(cart.total)} />
      </div>
      <CheckoutFormPanel />
    </section>
  );
}

export function CheckoutFormPanel({ onSubmitted }: { onSubmitted?: () => void }) {
  const navigate = useNavigate();
  const { cart, load, setCheckoutOpen } = useCart();
  const [failed, setFailed] = useState('');
  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: async () => (await api.get<Paginated<{ id: number; city: string }>>('/delivery-zones/?is_active=true')).data });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({ resolver: zodResolver(schema), defaultValues: { payment_method: 'COD' } });
  const submit = async (values: CheckoutForm) => {
    setFailed('');
    const typedCity = values.shipping_city.trim();
    const zone = zones?.results[0];
    if (!zone) {
      setFailed('La commande n a pas pu etre creee. Aucune zone de livraison active.');
      return;
    }
    const idempotency_key = sessionStorage.getItem('dolphin_checkout_key') || crypto.randomUUID();
    sessionStorage.setItem('dolphin_checkout_key', idempotency_key);
    try {
      const guestEmail = `${values.shipping_phone.replace(/\D/g, '') || 'client'}@checkout.dolphin.local`;
      const { data } = await api.post<Order>('/checkout/', { ...values, guest_email: guestEmail, delivery_zone_id: zone.id, idempotency_key, shipping_city: typedCity });
      sessionStorage.setItem(`dolphin_invoice_key_${data.id}`, data.idempotency_key || idempotency_key);
      sessionStorage.removeItem('dolphin_checkout_key');
      toast.success('Commande creee');
      await load();
      setCheckoutOpen(false);
      onSubmitted?.();
      navigate(`/confirmation/${data.id}`, { state: { order: data } });
    } catch (error) {
      setFailed(readApiError(error));
      throw error;
    }
  };
  if (!cart?.items?.length) return <EmptyState title="Panier vide" text="Ajoutez au moins un produit avant de passer commande." action={<Link className="btn-primary" to="/catalogue">Retour catalogue</Link>} />;
  return (
    <form className="card grid gap-5 p-5 sm:p-6" onSubmit={handleSubmit(submit)}>
      {failed && <div className="rounded-dolphin bg-coral/10 p-3 text-sm font-semibold text-coral">{failed}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-navy">
          Nom complet <span className="font-semibold text-slate-500" dir="rtl">الاسم الكامل</span>
          <input className="input min-h-12" placeholder="Votre nom complet" {...register('shipping_full_name')} />
          {errors.shipping_full_name && <span className="text-sm font-semibold text-coral">{errors.shipping_full_name.message}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-navy">
          Telephone <span className="font-semibold text-slate-500" dir="rtl">الهاتف</span>
          <input className="input min-h-12" type="tel" inputMode="tel" placeholder="06 00 00 00 00" {...register('shipping_phone')} />
          {errors.shipping_phone && <span className="text-sm font-semibold text-coral">{errors.shipping_phone.message}</span>}
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-bold text-navy">
        Adresse <span className="font-semibold text-slate-500" dir="rtl">العنوان</span>
        <textarea className="input min-h-24 resize-y" placeholder="Rue, quartier, numero..." {...register('shipping_address')} />
        {errors.shipping_address && <span className="text-sm font-semibold text-coral">{errors.shipping_address.message}</span>}
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-bold text-navy">
          Ville <span className="font-semibold text-slate-500" dir="rtl">المدينة</span>
          <input className="input min-h-12" placeholder="Ex: Casablanca" {...register('shipping_city')} />
          {errors.shipping_city && <span className="text-sm font-semibold text-coral">{errors.shipping_city.message}</span>}
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-navy">
          Paiement <span className="font-semibold text-slate-500" dir="rtl">الأداء</span>
          <select className="input min-h-12" {...register('payment_method')}><option value="COD">Paiement a la livraison / الأداء عند التسليم</option><option value="BANK_TRANSFER">Virement bancaire / تحويل بنكي</option></select>
        </label>
      </div>
      <label className="grid gap-1.5 text-sm font-bold text-navy">
        Note <span className="font-semibold text-slate-500" dir="rtl">ملاحظة</span>
        <textarea className="input min-h-20 resize-y" placeholder="Informations supplementaires..." {...register('customer_note')} />
      </label>
      <button className="btn-primary min-h-12 text-base" disabled={isSubmitting}>{isSubmitting ? 'Creation en cours...' : 'Confirmer la commande / تأكيد الطلب'}</button>
    </form>
  );
}

export function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const order = (location.state as { order?: Order } | null)?.order;
  const orderId = order?.id || id;
  const invoiceKey = order?.idempotency_key || (orderId ? sessionStorage.getItem(`dolphin_invoice_key_${orderId}`) : '');
  const invoiceFilename = `facture-${order?.order_number || orderId}.pdf`;
  return <section className="mx-auto max-w-3xl px-4 py-12"><div className="card p-8 text-center"><CheckCircle className="mx-auto mb-4 h-14 w-14 text-success" /><h1 className="font-heading text-3xl font-bold">Commande confirmee</h1><p className="mt-2 text-slate-600">Numero {order?.order_number || id}</p><p className="mt-2 text-slate-600">L'equipe DOLPHIN vous contactera pour le suivi.</p><div className="mt-6 flex flex-wrap justify-center gap-3">{orderId && invoiceKey && <button className="btn-secondary" onClick={() => downloadFile(`/orders/${orderId}/invoice/?key=${encodeURIComponent(invoiceKey)}`, invoiceFilename)}><Download className="h-4 w-4" />Telecharger facture</button>}<Link className="btn-primary" to="/catalogue">Continuer mes achats</Link></div></div></section>;
}
