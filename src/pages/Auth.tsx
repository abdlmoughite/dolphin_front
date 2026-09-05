import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import logo from '../assets/dolphin-logo.svg';
import { useAuth } from '../stores/auth';

const loginSchema = z.object({ email: z.string().email('Email invalide'), password: z.string().min(8, 'Minimum 8 caracteres') });
const registerSchema = z.object({
  first_name: z.string().min(2, 'Prenom requis'),
  last_name: z.string().min(2, 'Nom requis'),
  username: z.string().min(3, 'Minimum 3 caracteres'),
  email: z.string().email('Email invalide'),
  phone: z.string().regex(/^(\+212|0)[5-7]\d{8}$/, 'Numero marocain invalide').or(z.literal('')),
  password: z.string().min(8, 'Minimum 8 caracteres'),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, { message: 'Les mots de passe ne correspondent pas', path: ['confirmPassword'] });

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const destination = (role: string) => role === 'SUPER_ADMIN' ? '/developer' : role === 'CUSTOMER' ? '/compte' : '/admin/dashboard';
  return <AuthShell title="Connexion"><form className="grid gap-4" onSubmit={handleSubmit((v) => login(v.email, v.password).then((user) => { toast.success('Bienvenue'); navigate(destination(user.role)); }))}><label className="grid gap-1">Email<input className="input" type="email" autoComplete="email" {...register('email')} /></label>{errors.email && <span className="text-sm text-coral">{errors.email.message}</span>}<label className="grid gap-1">Mot de passe<input className="input" type="password" autoComplete="current-password" {...register('password')} /></label>{errors.password && <span className="text-sm text-coral">{errors.password.message}</span>}<button className="btn-primary" disabled={isSubmitting}>Se connecter</button><p className="text-center text-sm text-slate-600">Nouveau client? <Link className="font-bold text-ocean" to="/inscription">Creer un compte</Link></p></form></AuthShell>;
}

export function RegisterPage() {
  const createAccount = useAuth((s) => s.register);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { phone: '' } });
  return <AuthShell title="Creer mon compte"><form className="grid gap-4" onSubmit={handleSubmit(({ confirmPassword: _confirmPassword, ...values }) => createAccount(values).then(() => { toast.success('Compte cree'); navigate('/compte'); }))}><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1">Prenom<input className="input" autoComplete="given-name" {...register('first_name')} /></label><label className="grid gap-1">Nom<input className="input" autoComplete="family-name" {...register('last_name')} /></label></div><label className="grid gap-1">Nom d'utilisateur<input className="input" autoComplete="username" {...register('username')} /></label><label className="grid gap-1">Email<input className="input" type="email" autoComplete="email" {...register('email')} /></label><label className="grid gap-1">Telephone (optionnel)<input className="input" placeholder="06XXXXXXXX" autoComplete="tel" {...register('phone')} /></label><label className="grid gap-1">Mot de passe<input className="input" type="password" autoComplete="new-password" {...register('password')} /></label><label className="grid gap-1">Confirmer le mot de passe<input className="input" type="password" autoComplete="new-password" {...register('confirmPassword')} /></label>{Object.values(errors)[0]?.message && <span className="text-sm text-coral">{String(Object.values(errors)[0]?.message)}</span>}<button className="btn-primary" disabled={isSubmitting}>Creer le compte</button><p className="text-center text-sm text-slate-600">Deja inscrit? <Link className="font-bold text-ocean" to="/connexion">Se connecter</Link></p></form></AuthShell>;
}

function AuthShell({ title, children }: { title: string; children: JSX.Element }) {
  return <section className="grid min-h-[70vh] place-items-center px-4 py-10"><div className="card w-full max-w-md p-6"><img src={logo} alt="DOLPHIN" className="mx-auto mb-5 h-14" /><h1 className="mb-5 text-center font-heading text-2xl font-bold">{title}</h1>{children}</div></section>;
}
