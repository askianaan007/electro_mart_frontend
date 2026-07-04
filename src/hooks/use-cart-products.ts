import { useQueries } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';
import { productKeys } from './use-products';
import { useCartStore } from '@/stores/cart-store';

export function useCartProducts() {
  const items = useCartStore((s) => s.items);

  const results = useQueries({
    queries: items.map((item) => ({
      queryKey: productKeys.detail(item.productId),
      queryFn: () => api.products.get(item.productId),
    })),
  });

  const rows = items.map((item, index) => ({
    productId: item.productId,
    quantity: item.quantity,
    product: results[index]?.data,
    isLoading: results[index]?.isLoading ?? false,
  }));

  return { rows, isLoading: results.some((r) => r.isLoading) };
}
