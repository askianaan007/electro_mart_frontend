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
  // Representative Portal merchandising (version2_changes_backend.md §1) — additive.
  retailPrice: string | null;
  compareAtPrice: string | null;
  isFeatured: boolean;
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
  allocatedDiscount: string;
  netLineTotal: string;
  netUnitPrice: string;
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
  salesReturns?: { totalAmount: string }[];
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
  allocatedDiscount: string;
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
  // null when the percentage-change calculation wouldn't be meaningful
  // (previous period negative, or the sign flipped between periods) —
  // render "N/A" rather than doing arithmetic on it.
  netSalesChangePct: number | null;
  totalSalesReturn: number;
  totalSalesReturnChangePct: number | null;
  totalPurchaseReturn: number;
  totalPurchaseReturnChangePct: number | null;
  netPurchase: number;
  netPurchaseChangePct: number | null;
  netCashFlow: number;
  profit: number;
  profitChangePct: number | null;
  totalExpenses: number;
  totalExpensesChangePct: number | null;
  invoiceDuePayments: number;
  invoiceDuePaymentsChangePct: number | null;
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

// ---------------------------------------------------------------------------
// Representative Portal (Rep_Portal_DOCUMENTATION.md / version2_changes_backend.md)
// ---------------------------------------------------------------------------

export type RepresentativeStatus = 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'INACTIVE';
export type AssignmentScopeType = 'CATEGORY' | 'PRODUCT' | 'BRAND' | 'CAMPAIGN';
export type CommissionType = 'PERCENTAGE' | 'FIXED';
export type CommissionLineStatus = 'PENDING' | 'APPROVED' | 'SETTLED' | 'REVERSED';
export type SettlementStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
export type CollectionStatus = 'PENDING_VERIFICATION' | 'CONFIRMED' | 'REJECTED';
export type BannerLinkType = 'NONE' | 'CATEGORY' | 'PRODUCT' | 'BRAND' | 'EXTERNAL_URL';

export interface Representative {
  id: string;
  name: string;
  phone: string;
  email: string;
  username: string;
  nicOrEmployeeId: string | null;
  address: string | null;
  joiningDate: string;
  status: RepresentativeStatus;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RepresentativeDetail extends Representative {
  summary: {
    totalCustomers: number;
    totalOrders: number;
    lifetimeCompletedValue: string;
  };
}

export interface RepresentativeSalesStats {
  todaysOrders: number;
  monthlyOrders: number;
  pendingOrders: number;
  completedOrders: number;
  revenue: string;
}

export interface RepresentativeCommissionStats {
  pendingCommission: string;
  approvedCommission: string;
  paidCommission: string;
}

export interface RepresentativeLoginHistoryEntry {
  id: string;
  representativeId: string;
  success: boolean;
  failureReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  loginAt: string;
}

export interface RepActivityLogEntry {
  id: string;
  representativeId: string;
  action: string;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  deviceType: string | null;
  createdAt: string;
}

export interface ProductAssignment {
  id: string;
  representativeId: string;
  scopeType: AssignmentScopeType;
  scopeValue: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  publicId: string;
  title: string | null;
  subtitle: string | null;
  ctaLabel: string | null;
  linkType: BannerLinkType;
  linkValue: string | null;
  sortOrder: number;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface BannerAssignment {
  id: string;
  representativeId: string;
  bannerId: string;
  banner: Banner;
  priority: number;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
  logoPublicId: string | null;
  imageUrl: string | null;
  imagePublicId: string | null;
  description: string | null;
  sortOrder: number;
  isFeatured: boolean;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CommissionRule {
  id: string;
  productId: string;
  type: CommissionType;
  value: string;
  startDate: string;
  endDate: string | null;
  isCampaign: boolean;
  campaignName: string | null;
  createdByAdminId: string;
  createdAt: string;
}

export interface CommissionLedgerEntry {
  id: string;
  representativeId: string;
  orderId: string;
  order?: { id: string; orderNumber: string };
  orderItemId: string;
  productId: string;
  product?: { id: string; name: string; productCode: string };
  commissionRuleId: string | null;
  amount: string;
  status: CommissionLineStatus;
  settlementId: string | null;
  createdAt: string;
}

export interface RepresentativeSettlement {
  id: string;
  settlementNumber: string;
  representativeId: string;
  representative?: { id: string; name: string; email: string; phone?: string };
  periodStart: string;
  periodEnd: string;
  totalCommission: string;
  status: SettlementStatus;
  mode: PaymentMode | null;
  chequeStatus: ChequeStatus | null;
  chequeNumber: string | null;
  bankName: string | null;
  chequeDate: string | null;
  expenseId: string | null;
  approvedByAdminId: string | null;
  approvedAt: string | null;
  rejectedReason: string | null;
  paidAt: string | null;
  createdAt: string;
  lines?: CommissionLedgerEntry[];
}

export interface CommissionDashboard {
  pendingCommission: string;
  approvedCommission: string;
  settledCommission: string;
  pendingSettlementsCount: number;
  paidThisMonthCount: number;
  paidThisMonthTotal: string;
}

export interface CollectionSubmission {
  id: string;
  representativeId: string;
  representative?: { id: string; name: string; email: string };
  customerId: string;
  customer?: { id: string; businessName: string; ownerName: string };
  invoiceId: string | null;
  invoice?: { id: string; invoiceNumber: string; grandTotal: string; paymentStatus: PaymentStatus };
  amount: string;
  mode: PaymentMode;
  chequeNumber: string | null;
  bankName: string | null;
  chequeDate: string | null;
  collectionDate: string;
  notes: string | null;
  chequeImageUrl: string | null;
  status: CollectionStatus;
  verifiedByAdminId: string | null;
  verifiedAt: string | null;
  rejectedReason: string | null;
  resultingPaymentId: string | null;
  createdAt: string;
}

export interface RepresentativePerformanceRow {
  representativeId: string;
  representativeName: string;
  orderCount: number;
  revenue: string;
}

export interface CollectionPerformanceRow {
  representativeId: string;
  representativeName: string;
  confirmed: number;
  rejected: number;
  pending: number;
  confirmedAmount: string;
}

export interface OutstandingByRepresentativeRow {
  representativeId: string;
  representativeName: string;
  customerCount: number;
  outstandingBalance: string;
}

export interface CommissionSummaryRow {
  representativeId: string;
  representativeName: string;
  pending: string;
  approved: string;
  settled: string;
  reversed: string;
}

export interface SettlementSummaryRow {
  status: SettlementStatus;
  count: number;
  totalCommission: string;
}

export interface OverdueCollectionRow {
  orderId: string;
  orderNumber: string;
  customerName: string;
  representativeId: string | null;
  representativeName: string;
  invoiceNumber: string;
  outstandingAmount: string;
  overdueDays: number;
}

export interface ReturnedChequeRow {
  paymentId: string;
  customerName: string;
  invoiceNumber: string | null;
  representativeId: string | null;
  representativeName: string | null;
  chequeNumber: string | null;
  bankName: string | null;
  amount: string;
  chequeStatusUpdatedAt: string | null;
}

export interface ProductSalesRow {
  productId: string;
  productName: string;
  productCode: string;
  quantitySold: number;
  revenue: string;
  orderLineCount: number;
}

export interface CategorySalesRow {
  category: string;
  quantitySold: number;
  revenue: string;
}
