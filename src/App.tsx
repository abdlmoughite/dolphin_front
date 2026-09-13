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
import { LoginPage, RegisterPage } from './pages/Auth';
import { CustomerDashboard } from './pages/Customer';

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
      { path: 'orders/:id', element: <AdminOrderDetailPage /> },
      { path: 'products/new', element: <AdminProductNewPage /> },
      { path: 'products/:slug/edit', element: <AdminProductEditPage /> },
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
