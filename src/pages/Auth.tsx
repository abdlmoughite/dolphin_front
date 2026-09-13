import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import toast from 'react-hot-toast';
import logo from '../assets/dolphin-logo.svg';
import { useAuth } from '../stores/auth';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = loginSchema.extend({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  phone: z.string().optional(),
});

export function LoginPage() {
  const login = useAuth((s) => s.login);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  return <AuthShell title="Connexion"><form className="grid gap-4" onSubmit={handleSubmit((v) => login(v.email, v.password).then((user) => { toast.success('Bienvenue'); navigate(user.role === 'CUSTOMER' ? '/compte' : user.role === 'SUPER_ADMIN' ? '/developer' : '/admin/dashboard'); }))}><input className="input" placeholder="Email" {...register('email')} /><input className="input" type="password" placeholder="Mot de passe" {...register('password')} />{errors.email && <span className="text-sm text-coral">Email invalide</span>}<button className="btn-primary" disabled={isSubmitting}>Se connecter</button><Link className="text-center text-sm font-semibold text-ocean" to="/inscription">Creer un compte client</Link></form></AuthShell>;
}

export function RegisterPage() {
  const registerCustomer = useAuth((s) => s.registerCustomer);
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema) });
  return <AuthShell title="Creer mon compte"><form className="grid gap-4" onSubmit={handleSubmit((v) => registerCustomer({ ...v, username: v.email.split('@')[0] }).then(() => { toast.success('Compte cree'); navigate('/compte'); }))}><div className="grid gap-3 sm:grid-cols-2"><input className="input" placeholder="Prenom" {...register('first_name')} /><input className="input" placeholder="Nom" {...register('last_name')} /></div><input className="input" placeholder="Telephone" {...register('phone')} /><input className="input" type="email" placeholder="Email" {...register('email')} /><input className="input" type="password" placeholder="Mot de passe" {...register('password')} />{Object.keys(errors).length > 0 && <span className="text-sm text-coral">Verifiez les informations du formulaire.</span>}<button className="btn-primary" disabled={isSubmitting}>Creer le compte</button><Link className="text-center text-sm font-semibold text-ocean" to="/connexion">J'ai deja un compte</Link></form></AuthShell>;
}

function AuthShell({ title, children }: { title: string; children: JSX.Element }) {
  return <section className="grid min-h-[70vh] place-items-center px-4 py-10"><div className="card w-full max-w-md p-6"><img src={logo} alt="DOLPHIN" className="mx-auto mb-5 h-14" /><h1 className="mb-5 text-center font-heading text-2xl font-bold">{title}</h1>{children}</div></section>;
}
