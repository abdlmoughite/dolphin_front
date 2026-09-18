import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import logo from '../assets/dolphin-logo.jpeg';
import { useAuth } from '../stores/auth';
import { api, readApiError } from '../lib/api';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const resetSchema = z.object({ email: z.string().email() });
const registerSchema = loginSchema.extend({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string().optional(),
});

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return <AuthShell title="Connexion"><form className="grid gap-4" onSubmit={handleSubmit((v) => login(v.email, v.password).then((user) => { toast.success('Bienvenue'); navigate(user.role === 'CUSTOMER' ? '/compte' : user.role === 'SUPER_ADMIN' ? '/developer' : '/admin/dashboard'); }))}><label className="grid gap-1 font-semibold">Email<input className="input" placeholder="Email" {...register('email')} /></label><label className="grid gap-1 font-semibold">Mot de passe<input className="input" type="password" placeholder="Mot de passe" {...register('password')} /></label>{errors.email && <span className="text-sm text-coral">Email invalide</span>}<button className="btn-primary" disabled={isSubmitting}>Se connecter</button></form></AuthShell>;
}

export function RegisterPage() {
  const registerCustomer = useAuth((s) => s.registerCustomer);
  const navigate = useNavigate();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  return <AuthShell title="Creer mon compte"><form className="grid gap-4" onSubmit={handleSubmit(async (v) => { setFormError(''); try { await registerCustomer({ ...v, username: v.email.split('@')[0] }); toast.success('Compte cree'); navigate('/compte'); } catch (error) { setFormError(readApiError(error)); } })}><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 font-semibold">Prenom<input className="input" {...register('first_name')} /></label><label className="grid gap-1 font-semibold">Nom<input className="input" {...register('last_name')} /></label></div><label className="grid gap-1 font-semibold">Telephone<input className="input" {...register('phone')} /></label><label className="grid gap-1 font-semibold">Email<input className="input" type="email" {...register('email')} /></label><label className="grid gap-1 font-semibold">Mot de passe<input className="input" type="password" {...register('password')} /></label>{Object.keys(errors).length > 0 && <span className="text-sm text-coral">Verifiez les informations du formulaire.</span>}{formError && <span className="text-sm font-semibold text-coral">{formError}</span>}<button className="btn-primary" disabled={isSubmitting}>Creer le compte</button><Link className="text-center text-sm font-semibold text-ocean" to="/connexion">J'ai deja un compte</Link></form></AuthShell>;
}

export function PasswordResetPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema) });
  return <AuthShell title="Mot de passe oublie"><form className="grid gap-4" onSubmit={handleSubmit((v) => api.post('/auth/password/reset/', v).then(() => toast.success('Si le compte existe, un email sera envoye.')))}><label className="grid gap-1 font-semibold">Email<input className="input" type="email" {...register('email')} /></label>{errors.email && <span className="text-sm text-coral">Email invalide</span>}<button className="btn-primary" disabled={isSubmitting}>Envoyer</button><Link className="text-center text-sm font-semibold text-ocean" to="/connexion">Retour connexion</Link></form></AuthShell>;
}

export function UnauthorizedPage() {
  return <AuthShell title="Acces non autorise"><div className="grid gap-4 text-center"><p className="text-slate-600">Votre role ne permet pas d'ouvrir cette interface.</p><Link className="btn-primary" to="/">Retour boutique</Link></div></AuthShell>;
}

function AuthShell({ title, children }: { title: string; children: JSX.Element }) {
  return <section className="grid min-h-[70vh] place-items-center px-4 py-10"><div className="card w-full max-w-md p-6"><img src={logo} alt="DOLPHIN" className="mx-auto mb-5 h-14" /><h1 className="mb-5 text-center font-heading text-2xl font-bold">{title}</h1>{children}</div></section>;
}
