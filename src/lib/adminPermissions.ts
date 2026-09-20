export const adminPages = [
  ['dashboard', 'Dashboard'],
  ['products', 'Produits'],
  ['categories', 'Categories'],
  ['brands', 'Marques'],
  ['imports', 'Imports'],
  ['orders', 'Commandes'],
  ['ozon-parcels', 'Ozon colis'],
  ['ozon-tracking', 'Ozon tracking'],
  ['ozon-settings', 'Ozon settings'],
  ['customers', 'Clients'],
  ['staff', 'Comptes equipe'],
  ['promotions', 'Promotions'],
  ['coupons', 'Coupons'],
  ['delivery-zones', 'Zones de livraison'],
  ['banners', 'Bannieres'],
  ['home-sections', 'Sections homepage'],
  ['support', 'Support'],
  ['returns', 'Retours'],
  ['suppliers', 'Fournisseurs'],
  ['expenses', 'Depenses'],
  ['settings', 'Settings'],
  ['reports', 'Rapports'],
  ['audit-logs', 'Audit logs'],
] as const;

export type AdminPageKey = (typeof adminPages)[number][0];
export const allAdminPageKeys = adminPages.map(([key]) => key);

export function canAccessAdminPage(user: { role?: string; page_permissions?: string[] | null } | null | undefined, page: string) {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return Boolean(user.page_permissions?.includes(page));
}
