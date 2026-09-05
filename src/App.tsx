import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense, useEffect } from 'react';
import { StoreLayout, AdminLayout } from './components/Layout';
import { useAuth } from './stores/auth';
import { useCart } from './stores/cart';

const AdminDashboard = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminDashboard })));
const AdminTablePage = lazy(() => import('./pages/Admin').then((module) => ({ default: module.AdminTablePage })));
const CartPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.CartPage })));
const CheckoutPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.CheckoutPage })));
const ConfirmationPage = lazy(() => import('./pages/CartCheckout').then((module) => ({ default: module.ConfirmationPage })));
const CatalogPage = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.CatalogPage })));
const ProductDetailsPage = lazy(() => import('./pages/Catalog').then((module) => ({ default: module.ProductDetailsPage })));
const HomePage = lazy(() => import('./pages/Home').then((module) => ({ default: module.HomePage })));
const PromotionsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.PromotionsPage })));
const NewArrivalsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.NewArrivalsPage })));
const BrandsPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.BrandsPage })));
const HelpPage = lazy(() => import('./pages/Home').then((module) => ({ default: module.HelpPage })));
const SimplePage = lazy(() => import('./pages/Home').then((module) => ({ default: module.SimplePage })));
const DeveloperPage = lazy(() => import('./pages/Developer').then((module) => ({ default: module.DeveloperPage })));
const LoginPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./pages/Auth').then((module) => ({ default: module.RegisterPage })));
const CustomerDashboard = lazy(() => import('./pages/Customer').then((module) => ({ default: module.CustomerDashboard })));

function Protected({ children, admin = false, developer = false }: { children: JSX.Element; admin?: boolean; developer?: boolean }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/connexion" replace />;
  if (developer && user.role !== 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (admin && user.role === 'CUSTOMER') return <Navigate to="/" replace />;
  return children;
}

const router = createBrowserRouter([
  {
    element: <StoreLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalogue', element: <CatalogPage /> },
      { path: '/produit/:slug', element: <ProductDetailsPage /> },
      { path: '/panier', element: <CartPage /> },
      { path: '/checkout', element: <CheckoutPage /> },
      { path: '/confirmation/:id', element: <ConfirmationPage /> },
      { path: '/connexion', element: <LoginPage /> },
      { path: '/inscription', element: <RegisterPage /> },
      { path: '/compte/*', element: <Protected><CustomerDashboard /></Protected> },
      { path: '/promotions', element: <PromotionsPage /> },
      { path: '/nouveautes', element: <NewArrivalsPage /> },
      { path: '/marques', element: <BrandsPage /> },
      { path: '/faq', element: <HelpPage /> },
      { path: '*', element: <SimplePage title="Page introuvable" /> },
    ],
  },
  {
    path: '/admin',
    element: <Protected admin><AdminLayout /></Protected>,
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: ':section', element: <AdminTablePage /> },
    ],
  },
  { path: '/developer', element: <Protected developer><DeveloperPage /></Protected> },
  { path: '/developer/:section', element: <Protected developer><DeveloperPage /></Protected> },
]);

export default function App() {
  const boot = useAuth((s) => s.boot);
  const loadCart = useCart((s) => s.load);
  useEffect(() => { boot().catch(() => undefined); loadCart().catch(() => undefined); }, [boot, loadCart]);
  return <Suspense fallback={<div className="mx-auto my-12 h-80 max-w-7xl animate-pulse rounded-dolphin bg-slate-100" />}><RouterProvider router={router} /></Suspense>;
}
