import { CheckCircle, Ticket, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api, Order, Paginated } from '../lib/api';
import { money } from '../lib/i18n';
import { useCart } from '../stores/cart';

export function CartPage() {
  const { cart, load, applyCoupon } = useCart();
  const { register, handleSubmit } = useForm<{ code: string }>();
  return (
    <section className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold">Panier</h1>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-3">{cart?.items?.length ? cart.items.map((item) => <div key={item.id} className="card flex items-center justify-between gap-4 p-4"><div><h2 className="font-bold">{item.variant.sku}</h2><p className="text-slate-600">Quantite: {item.quantity}</p></div><strong>{money(item.line_total)}</strong><button className="rounded-full p-2 text-coral" onClick={() => api.delete('/cart/remove/', { data: { item_id: item.id } }).then(load)}><Trash2 /></button></div>) : <div className="card p-8 text-center">Votre panier est vide.</div>}</div>
        <aside className="card grid gap-4 p-5">
          <h2 className="font-heading text-xl font-bold">Resume</h2>
          <Row label="Sous-total" value={money(cart?.subtotal || 0)} /><Row label="Remise" value={money(cart?.discount_total || 0)} /><Row label="Total" value={money(cart?.total || 0)} strong />
          <form className="flex gap-2" onSubmit={handleSubmit((v) => applyCoupon(v.code).then(() => toast.success('Coupon applique')))}><input className="input" placeholder="Coupon" {...register('code')} /><button className="btn-secondary"><Ticket className="h-4 w-4" /></button></form>
          <Link className="btn-primary" to="/checkout">Commander</Link>
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className={`flex justify-between ${strong ? 'border-t pt-3 text-lg font-bold' : ''}`}><span>{label}</span><span>{value}</span></div>;
}

const schema = z.object({
  guest_email: z.string().email('Email requis'),
  shipping_full_name: z.string().min(2, 'Nom requis'),
  shipping_phone: z.string().min(10, 'Telephone requis'),
  shipping_address: z.string().min(6, 'Adresse requise'),
  delivery_zone_id: z.coerce.number(),
  payment_method: z.enum(['COD', 'BANK_TRANSFER']),
  customer_note: z.string().optional(),
});

type CheckoutForm = z.infer<typeof schema>;

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: async () => (await api.get<Paginated<{ id: number; city: string; shipping_price: string }>>('/delivery-zones/')).data });
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CheckoutForm>({ resolver: zodResolver(schema), defaultValues: { payment_method: 'COD' } });
  const submit = async (values: CheckoutForm) => {
    const zone = zones?.results.find((z) => z.id === Number(values.delivery_zone_id));
    const idempotency_key = crypto.randomUUID();
    const { data } = await api.post<Order>('/checkout/', { ...values, idempotency_key, shipping_city: zone?.city || '' });
    toast.success('Commande creee');
    navigate(`/confirmation/${data.id}`, { state: { order: data } });
  };
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-heading text-3xl font-bold">Checkout</h1>
      <form className="card grid gap-4 p-6" onSubmit={handleSubmit(submit)}>
        <label className="grid gap-1">Email<input className="input" type="email" {...register('guest_email')} />{errors.guest_email && <span className="text-sm text-coral">{errors.guest_email.message}</span>}</label>
        <label className="grid gap-1">Nom complet<input className="input" {...register('shipping_full_name')} />{errors.shipping_full_name && <span className="text-sm text-coral">{errors.shipping_full_name.message}</span>}</label>
        <label className="grid gap-1">Telephone<input className="input" {...register('shipping_phone')} /></label>
        <label className="grid gap-1">Adresse<textarea className="input" {...register('shipping_address')} /></label>
        <label className="grid gap-1">Ville<select className="input" {...register('delivery_zone_id')}><option value="">Choisir</option>{zones?.results.map((z) => <option key={z.id} value={z.id}>{z.city} - {money(z.shipping_price)}</option>)}</select></label>
        <label className="grid gap-1">Paiement<select className="input" {...register('payment_method')}><option value="COD">Paiement a la livraison</option><option value="BANK_TRANSFER">Virement bancaire</option></select></label>
        <label className="grid gap-1">Note<textarea className="input" {...register('customer_note')} /></label>
        <button className="btn-primary" disabled={isSubmitting}>Confirmer la commande</button>
      </form>
    </section>
  );
}

export function ConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const order = (location.state as { order?: Order } | null)?.order;
  return <section className="mx-auto max-w-3xl px-4 py-12"><div className="card p-8 text-center"><CheckCircle className="mx-auto mb-4 h-14 w-14 text-success" /><h1 className="font-heading text-3xl font-bold">Commande confirmee</h1><p className="mt-2 text-slate-600">Numero {order?.order_number || id}</p><p className="mt-2 text-slate-600">L'equipe DOLPHIN vous contactera pour le suivi.</p><Link className="btn-primary mt-6" to="/catalogue">Continuer mes achats</Link></div></section>;
}
