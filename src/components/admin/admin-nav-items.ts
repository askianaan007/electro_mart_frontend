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
  Undo2,
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
    label: 'Products',
    items: [
      { label: 'Inventory', href: '/admin/inventory', icon: Boxes },
      { label: 'Products', href: '/admin/products', icon: Package },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Sales Analysis', href: '/admin/sales-analysis', icon: LineChart },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Sales Returns', href: '/admin/sales-returns', icon: Undo2 },
    ],
  },
    {
    label: 'Customers',
    items: [
      { label: 'Customer', href: '/admin/dealers', icon: Users },
      { label: 'Invoices', href: '/admin/invoices', icon: Receipt },
      { label: 'Payments', href: '/admin/payments', icon: Wallet },
    ],
  },
 
  {
    label: 'Purchasing',
    items: [
      { label: 'Suppliers', href: '/admin/suppliers', icon: Factory },
      { label: 'Purchases', href: '/admin/purchases', icon: Truck },
      { label: 'Credits', href: '/admin/credits', icon: HandCoins },
    ],
  },

  {
    label: 'Investments',
    items: [
      { label: 'Investments', href: '/admin/investments', icon: TrendingUp },
      { label: 'Expenses', href: '/admin/expenses', icon: CreditCard },
      { label: 'Equity', href: '/admin/equity', icon: PieChart },
    ],
  },
  {
    label: 'System',
    items: [{ label: 'Activity Log', href: '/admin/activity-log', icon: ClipboardList }],
  },
];
