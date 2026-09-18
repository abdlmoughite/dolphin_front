import { QueryClient } from '@tanstack/react-query';

export const productQueryKeys = {
  all: ['products'] as const,
  home: ['home-products'] as const,
  catalog: (query: string) => ['products', 'catalog', query] as const,
  detail: (slug?: string) => ['products', 'detail', slug] as const,
  similar: (categoryId?: number) => ['products', 'similar', categoryId] as const,
  admin: (query: string) => ['products', 'admin', query] as const,
  promotions: ['products', 'promotions'] as const,
  newest: ['products', 'newest'] as const,
  brands: ['products', 'brands'] as const,
};

export function invalidateProductQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: productQueryKeys.all });
  queryClient.invalidateQueries({ queryKey: ['home-products'] });
  queryClient.invalidateQueries({ queryKey: ['categories'] });
  queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
  queryClient.invalidateQueries({ queryKey: ['admin-categories-full'] });
  queryClient.invalidateQueries({ queryKey: ['my-wishlist'] });
  queryClient.invalidateQueries({ queryKey: ['cart'] });
}
