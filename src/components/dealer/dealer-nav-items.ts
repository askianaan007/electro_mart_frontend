import { LayoutDashboard, Package, ShoppingCart, ClipboardList, Receipt, type LucideIcon } from 'lucide-react';

export interface DealerNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const dealerNavItems: DealerNavItem[] = [
  { label: 'Dashboard', href: '/dealer/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dealer/products', icon: Package },
  { label: 'Cart', href: '/dealer/cart', icon: ShoppingCart },
  { label: 'Orders', href: '/dealer/orders', icon: ClipboardList },
  { label: 'Invoices', href: '/dealer/invoices', icon: Receipt },
];
