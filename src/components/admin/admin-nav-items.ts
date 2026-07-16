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
  LineChart,
  type LucideIcon,
} from 'lucide-react';

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface AdminNavGroup {
  label?: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Sales Analysis', href: '/admin/sales-analysis', icon: LineChart },
    ],
  },
  {
    label: 'Products',
    items: [
      { label: 'Products', href: '/admin/products', icon: Package },
      { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { label: 'Purchases', href: '/admin/purchases', icon: Truck },
      { label: 'Suppliers', href: '/admin/suppliers', icon: Factory },
      { label: 'Credits', href: '/admin/credits', icon: HandCoins },
    ],
  },
  {
    label: 'Customers',
    items: [
      { label: 'Customer', href: '/admin/dealers', icon: Users },
      { label: 'Payments', href: '/admin/payments', icon: Wallet },
      { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
    ],
  },
  {
    label: 'Investments',
    items: [
      { label: 'Investments', href: '/admin/investments', icon: TrendingUp },
      { label: 'Equity', href: '/admin/equity', icon: PieChart },
      { label: 'Expenses', href: '/admin/expenses', icon: CreditCard },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Activity Log', href: '/admin/activity-log', icon: ClipboardList }],
  },
];
