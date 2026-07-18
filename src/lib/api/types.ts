export type Role = 'ADMIN' | 'DEALER';
export type AccountStatus = 'ACTIVE' | 'INACTIVE';
export type OrderStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'PACKED' | 'DELIVERED' | 'COMPLETED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL';
export type PaymentMode = 'CASH' | 'CHEQUE' | 'BANK_TRANSFER';
export type InventoryLogType = 'PURCHASE' | 'SALE' | 'ADJUSTMENT' | 'RESERVE' | 'RELEASE';
export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK';
export type ChequeStatus = 'PENDING' | 'CLEARED' | 'RETURNED';

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
  unlimitedCredit: boolean;
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

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  publicId: string;
  sortOrder: number;
  createdAt: string;
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
  images?: ProductImage[];
  costPrice?: string;
  wholesalePrice: string;
  currentStock: number;
  warranty: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  isOutOfStock: boolean;
}

export interface InventoryStockRow {
  id: string;
  productCode: string;
  name: string;
  currentStock: number;
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
  transportCharges: string;
  adminId: string;
  admin?: { id: string; name: string; email: string };
  createdAt: string;
  items: PurchaseItem[];
  purchaseReturns?: { totalAmount: string }[];
}

export interface PurchaseReturnItem {
  id: string;
  purchaseReturnId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface PurchaseReturn {
  id: string;
  returnNumber: string;
  purchaseId: string | null;
  purchase?: Purchase | null;
  supplierId: string;
  supplier?: Supplier;
  reason: string;
  totalAmount: string;
  returnDate: string;
  createdAt: string;
  items: PurchaseReturnItem[];
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplier?: Supplier;
  amount: string;
  mode: PaymentMode;
  reference: string | null;
  paymentDate: string;
  chequeStatus: ChequeStatus | null;
  chequeStatusUpdatedAt: string | null;
  chequeDepositDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface CreditSummaryEntry {
  supplierId: string;
  supplierName: string;
  totalPurchases: string;
  totalTransportCharges: string;
  totalReturns: string;
  totalSettled: string;
  creditBalance: string;
}

export interface CreditsSummary {
  entries: CreditSummaryEntry[];
  meta: PaginationMeta;
  totals: {
    totalPurchases: string;
    totalTransportCharges: string;
    totalReturns: string;
    totalSettled: string;
    totalCreditBalance: string;
  };
}

export interface SupplierCreditDetail {
  supplier: Supplier;
  totalPurchases: string;
  totalTransportCharges: string;
  totalReturns: string;
  totalSettled: string;
  creditBalance: string;
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
  createdByAdminId: string | null;
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
  /** Total value of goods returned against this invoice's order. */
  returnedAmount?: string;
  /** grandTotal minus returnedAmount — what's actually still owed. */
  netGrandTotal?: string;
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
  chequeStatus: ChequeStatus | null;
  chequeStatusUpdatedAt: string | null;
  bankName: string | null;
  chequeNumber: string | null;
  chequeDate: string | null;
  collectedDate: string | null;
  remarks: string | null;
}

export interface Investor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  profitSharePercentage: string;
  createdAt: string;
}

export interface Investment {
  id: string;
  investorId: string;
  investor?: Investor;
  amount: string;
  mode: PaymentMode;
  investmentDate: string;
  reason: string;
  remarks: string | null;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: string;
  expenseDate: string;
  remarks: string | null;
  createdAt: string;
}

export interface EquityEntry {
  investorId: string;
  investorName: string;
  profitSharePercentage: string;
  totalInvestment: string;
  profitShare: string;
  expenseShare: string;
  equity: string;
}

export interface EquitySummary {
  investorCount: number;
  entries: EquityEntry[];
  totals: {
    totalInvestment: string;
    totalProfit: string;
    percentageTotal: string;
    totalExpenses: string;
    totalEquity: string;
  };
}

export interface EquityHistoryEntry {
  id: string;
  type: 'INVESTMENT' | 'WITHDRAWAL' | 'EXPENSE';
  date: string;
  description: string;
  investorId: string | null;
  investorName: string | null;
  amount: string;
  createdAt: string;
}

export interface SalesReturnItem {
  id: string;
  salesReturnId: string;
  productId: string;
  product?: Product;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface SalesReturn {
  id: string;
  returnNumber: string;
  orderId: string;
  order?: Order;
  dealerId: string;
  dealer?: Dealer;
  reason: string;
  totalAmount: string;
  returnDate: string;
  createdAt: string;
  items: SalesReturnItem[];
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

export interface SalesAnalysisRow {
  orderId: string;
  orderNumber: string;
  invoiceNumber: string | null;
  dealerId: string;
  dealerName: string;
  date: string | null;
  sellingPrice: string;
  buyingPrice: string;
  profit: string;
}

export interface SalesAnalysisSummary {
  orderCount: number;
  totalSales: string;
  totalBuying: string;
  totalProfit: string;
  totalExpenses: string;
  netProfit: string;
}

export interface AdminDashboardSummary {
  todaysSales: string;
  todaysOrders: number;
  pendingApprovals: number;
  outOfStockItems: number;
  outstandingPayments: string;
  recentOrders: Order[];
  monthlyRevenue: { month: string; revenue: string }[];
  topProducts: { product: { id: string; name: string; productCode: string } | null; quantitySold: number }[];
  netSales: number;
  netSalesChangePct: number;
  totalSalesReturn: number;
  totalSalesReturnChangePct: number;
  totalPurchaseReturn: number;
  totalPurchaseReturnChangePct: number;
  netPurchase: number;
  netPurchaseChangePct: number;
  netCashFlow: number;
  profit: number;
  profitChangePct: number;
  totalExpenses: number;
  totalExpensesChangePct: number;
  invoiceDuePayments: number;
  invoiceDuePaymentsChangePct: number;
  invoiceDue: string;
  liquidCash: number;
  creditBalance: string;
  upcomingCheques: UpcomingCheque[];
  chequesDueCount: number;
  chequesDueTotal: number;
  chequesUpcomingCount: number;
}

export interface UpcomingCheque {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: string;
  reference: string | null;
  chequeDepositDate: string;
  daysUntilDue: number;
  isDue: boolean;
}

export interface DealerDashboardSummary {
  outstandingBalance: string;
  creditLimit: string;
  unlimitedCredit: boolean;
  creditRemaining: string;
  pendingOrders: number;
  recentOrders: Order[];
  recentInvoices: Invoice[];
}
