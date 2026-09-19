import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import { StoreLayout, AdminLayout } from './components/Layout';
import { useAuth } from './stores/auth';
import { useCart } from './stores/cart';
import { AdminDashboard, AdminOrderDetailPage, AdminProductEditPage, AdminProductNewPage, AdminTablePage } from './pages/Admin';
import { CartPage, CheckoutPage, ConfirmationPage } from './pages/CartCheckout';
import { CatalogPage, ProductDetailsPage } from './pages/Catalog';
import { BrandsPage, HelpPage, HomePage, NewArrivalsPage, PromotionsPage, SimplePage } from './pages/Home';
import { DeveloperPage } from './pages/Developer';
import { LoginPage, PasswordResetPage, RegisterPage, UnauthorizedPage } from './pages/Auth';
import { CustomerDashboard } from './pages/Customer';
import { canAccessAdminPage } from './lib/adminPermissions';

function Protected({ children, admin = false, developer = false, page }: { children: JSX.Element; admin?: boolean; developer?: boolean; page?: string }) {
  const { user, booted } = useAuth();
  if (!booted) return <div className="grid min-h-screen place-items-center bg-mist text-sm font-semibold text-slate-600">Chargement de la session...</div>;
  if (!user) return <Navigate to="/connexion" replace />;
  if (developer && user.role !== 'SUPER_ADMIN') return <Navigate to="/unauthorized" replace />;
  if (admin && user.role === 'CUSTOMER') return <Navigate to="/unauthorized" replace />;
  if (admin && page && !canAccessAdminPage(user, page)) return <Navigate to="/unauthorized" replace />;
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
      { path: '/mot-de-passe-oublie', element: <PasswordResetPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
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
      { path: 'dashboard', element: <Protected admin page="dashboard"><AdminDashboard /></Protected> },
      { path: 'orders/:id', element: <Protected admin page="orders"><AdminOrderDetailPage /></Protected> },
      { path: 'products/new', element: <Protected admin page="products"><AdminProductNewPage /></Protected> },
      { path: 'products/:slug/edit', element: <Protected admin page="products"><AdminProductEditPage /></Protected> },
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
  return <RouterProvider router={router} />;
}
