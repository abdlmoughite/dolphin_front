import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import logo from '../assets/dolphin-logo.svg';
import { useAuth } from '../stores/auth';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return <AuthShell title="Connexion admin"><form className="grid gap-4" onSubmit={handleSubmit((v) => login(v.email, v.password).then((user) => { toast.success('Bienvenue'); navigate(user.role === 'SUPER_ADMIN' ? '/developer' : '/admin/dashboard'); }))}><input className="input" placeholder="Email" {...register('email')} /><input className="input" type="password" placeholder="Mot de passe" {...register('password')} />{errors.email && <span className="text-sm text-coral">Email invalide</span>}<button className="btn-primary" disabled={isSubmitting}>Se connecter</button></form></AuthShell>;
}

export function RegisterPage() {
  return <AuthShell title="Comptes client desactives"><div className="grid gap-4 text-center text-slate-600"><p>Les clients commandent sans compte. Les comptes sont reserves a l'administration DOLPHIN.</p><Link className="btn-primary" to="/checkout">Passer commande</Link></div></AuthShell>;
}

function AuthShell({ title, children }: { title: string; children: JSX.Element }) {
  return <section className="grid min-h-[70vh] place-items-center px-4 py-10"><div className="card w-full max-w-md p-6"><img src={logo} alt="DOLPHIN" className="mx-auto mb-5 h-14" /><h1 className="mb-5 text-center font-heading text-2xl font-bold">{title}</h1>{children}</div></section>;
}
