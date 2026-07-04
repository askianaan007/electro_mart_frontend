export type Role = 'ADMIN' | 'DEALER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PACKED' | 'DELIVERED' | 'COMPLETED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
export type PaymentMode = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
export type InventoryLogType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface ApiErrorShape {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export interface AuthUser {
  id: string;
  role: Role;
  name?: string;
  email?: string;
  businessName?: string;
  username?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email?: string;
  username?: string;
  iat: number;
  exp: number;
}

export interface Dealer {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  district: string | null;
  username: string;
  creditLimit: string;
  outstandingBalance: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DealerDetail extends Dealer {
  summary: {
    totalOrders: number;
    totalInvoices: number;
    lifetimeCompletedValue: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface Product {
  id: string;
  productCode: string;
  sku: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  category: string | null;
  model: string | null;
  description: string | null;
  imageUrl: string | null;
  costPrice?: string;
  wholesalePrice: string;
  sellingPrice: string;
  currentStock: number;
  minimumStock: number;
  warranty: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  isLowStock: boolean;
}

export interface InventoryStockRow {
  id: string;
  productCode: string;
  name: string;
  currentStock: number;
  minimumStock: number;
  updatedAt: string;
  status: StockStatus;
}

export interface InventoryLog {
  id: string;
  productId: string;
  type: InventoryLogType;
  quantityIn: number;
  quantityOut: number;
  balanceAfter: number;
  reference: string | null;
  createdAt: string;
}

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
  product?: Product;
}

export interface Purchase {
  id: string;
  supplierId: string;
  supplier: Supplier;
  invoiceNumber: string;
  purchaseDate: string;
  totalValue: string;
  adminId: string;
  admin?: { id: string; name: string; email: string };
  createdAt: string;
  items: PurchaseItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  dealerId: string;
  dealer: Dealer;
  status: OrderStatus;
  subtotal: string;
  discount: string;
  totalAmount: string;
  rejectReason: string | null;
  approvedByAdminId: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  packedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  invoice: Invoice | null;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  order?: Order;
  dealerId: string;
  dealer?: Dealer;
  subtotal: string;
  discountTotal: string;
  grandTotal: string;
  paymentStatus: PaymentStatus;
  dueDate: string | null;
  createdAt: string;
  payments?: Payment[];
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoice?: Invoice;
  dealerId: string;
  dealer?: Dealer;
  amount: string;
  mode: PaymentMode;
  reference: string | null;
  paymentDate: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  adminId: string;
  admin: { id: string; name: string; email: string };
  action: string;
  targetId: string | null;
  details: string | null;
  createdAt: string;
}

export interface AdminDashboardSummary {
  todaysSales: string;
  todaysOrders: number;
  pendingApprovals: number;
  lowStockItems: number;
  outstandingPayments: string;
  recentOrders: Order[];
  monthlyRevenue: { month: string; revenue: string }[];
  topProducts: { product: { id: string; name: string; productCode: string } | null; quantitySold: number }[];
}

export interface DealerDashboardSummary {
  outstandingBalance: string;
  creditLimit: string;
  creditRemaining: string;
  pendingOrders: number;
  recentOrders: Order[];
  recentInvoices: Invoice[];
}
