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
  TrendingUp,
  CreditCard,
  PieChart,
  HandCoins,
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
  { label: 'Credits', href: '/admin/credits', icon: HandCoins },
  { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
  { label: 'Payments', href: '/admin/payments', icon: Wallet },
  { label: 'Investments', href: '/admin/investments', icon: TrendingUp },
  { label: 'Expenses', href: '/admin/expenses', icon: CreditCard },
  { label: 'Equity', href: '/admin/equity', icon: PieChart },
  { label: 'Activity Log', href: '/admin/activity-log', icon: ClipboardList },
];
