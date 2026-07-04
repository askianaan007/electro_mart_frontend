import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Boxes,
  Users,
  Truck,
  Factory,
  Receipt,
  Wallet,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavItems: AdminNavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { label: 'Dealers', href: '/admin/dealers', icon: Users },
  { label: 'Purchases', href: '/admin/purchases', icon: Truck },
  { label: 'Suppliers', href: '/admin/suppliers', icon: Factory },
  { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
  { label: 'Payments', href: '/admin/payments', icon: Wallet },
  { label: 'Activity Log', href: '/admin/activity-log', icon: ClipboardList },
];
