import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { StoreLayout } from './components/Layout';
import { useAuth } from './stores/auth';
import { useCart } from './stores/cart';

const HomePage = lazy(() => import('./pages/Home').then((module) => ({ default: module.HomePage })));
const PromotionsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.PromotionsPage })));
const NewArrivalsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.NewArrivalsPage })));
const BrandsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.BrandsPage })));
const HelpPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.HelpPage })));
const SimplePage = lazy(() => import('./pages/Home').then((module) => ({ default: module.SimplePage })));
const CatalogPage = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.CatalogPage })));
const ProductDetailsPage = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.ProductDetailsPage })));
const CartPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.CheckoutPage })));
const ConfirmationPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.ConfirmationPage })));
const DeveloperPage = lazy(() => import('./pages/Developer').then((module) => ({ default: module.DeveloperPage })));
const LoginPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.RegisterPage })));
const PasswordResetPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.PasswordResetPage })));
const UnauthorizedPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.UnauthorizedPage })));
const CustomerDashboard = lazy(() => import('./pages/Customer').then((module) => ({ default: module.CustomerDashboard })));

function PageLoader() {
  return <div className="grid min-h-[50vh] place-items-center bg-mist text-sm font-semibold text-slate-600">Chargement...</div>;
}

function LazyPage({ children }: { children: JSX.Element }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function Protected({ children, developer = false }: { children: JSX.Element; developer?: boolean }) {
  const { user, booted } = useAuth();
  if (!booted) return <div className="grid min-h-screen place-items-center bg-mist text-sm font-semibold text-slate-600">Chargement de la session...</div>;
  if (!user) return <Navigate to="/connexion" replace />;
  if (developer && user.role !== 'SUPER_ADMIN') return <Navigate to="/unauthorized" replace />;
  return <LazyPage>{children}</LazyPage>;
}

const router = createBrowserRouter([
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <LazyPage><HomePage /></LazyPage> },
      { path: '/catalogue', element: <LazyPage><CatalogPage /></LazyPage> },
      { path: '/produit/:slug', element: <LazyPage><ProductDetailsPage /></LazyPage> },
      { path: '/panier', element: <LazyPage><CartPage /></LazyPage> },
      { path: '/checkout', element: <LazyPage><CheckoutPage /></LazyPage> },
      { path: '/confirmation/:id', element: <LazyPage><ConfirmationPage /></LazyPage> },
      { path: '/connexion', element: <LazyPage><LoginPage /></LazyPage> },
      { path: '/inscription', element: <LazyPage><RegisterPage /></LazyPage> },
      { path: '/mot-de-passe-oublie', element: <LazyPage><PasswordResetPage /></LazyPage> },
      { path: '/unauthorized', element: <LazyPage><UnauthorizedPage /></LazyPage> },
      { path: '/compte/*', element: <Protected><CustomerDashboard /></Protected> },
      { path: '/promotions', element: <LazyPage><PromotionsPage /></LazyPage> },
      { path: '/nouveautes', element: <LazyPage><NewArrivalsPage /></LazyPage> },
      { path: '/marques', element: <LazyPage><BrandsPage /></LazyPage> },
      { path: '/faq', element: <LazyPage><HelpPage /></LazyPage> },
      { path: '*', element: <LazyPage><SimplePage title="Page introuvable" /></LazyPage> },
    ],
  },
  { path: '/developer', element: <Protected developer><DeveloperPage /></Protected> },
  { path: '/developer/:section', element: <Protected developer><DeveloperPage /></Protected> },
]);

export default function App() {
  const boot = useAuth((s) => s.boot);
  const loadCart = useCart((s) => s.load);
  useEffect(() => { boot().catch(() => undefined); loadCart().catch(() => undefined); }, [boot, loadCart]);
  return <RouterProvider router={router} />;
}
