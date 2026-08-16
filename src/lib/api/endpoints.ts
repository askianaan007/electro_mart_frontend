import { apiClient } from './client';
import type {
  ActivityLog,
  AdminDashboardSummary,
  AuthResponse,
  Category,
  ChequeStatus,
  CreditsSummary, 
  DealerDashboardSummary,
  Dealer,
  DealerDetail,
  EquitySummary,
  EquityHistoryEntry,
  LiquidCashSummary,
  LiquidCashHistoryEntry,
  LiquidCashEntryType,
  CreditBalanceSummary,
  CreditBalanceHistoryEntry,
  CreditBalanceEntryType,
  Expense,
  Invoice,
  InventoryLog,
  InventoryLogType,
  InventoryStockRow,
  Investment,
  Investor,
  Order,
  OrderStatus,
  Paginated,
  PaginationParams,
  Payment,
  PaymentMode,
  PaymentStatus,
  Product,
  ProductImage,
  Purchase,
  PurchaseReturn,
  Role,
  SalesAnalysisRow,
  SalesAnalysisSummary,
  SalesReturn,
  Supplier,
  SupplierCreditDetail,
  SupplierPayment,
  Representative,
  RepresentativeDetail,
  RepresentativeSalesStats,
  RepresentativeCommissionStats,
  RepresentativeLoginHistoryEntry,
  RepActivityLogEntry,
  ProductAssignment,
  AssignmentScopeType,
  Banner,
  BannerAssignment,
  Brand,
  CategorySalesRow,
  CollectionPerformanceRow,
  CollectionStatus,
  CollectionSubmission,
  CommissionDashboard,
  CommissionRule,
  CommissionSummaryRow,
  OutstandingByRepresentativeRow,
  OverdueCollectionRow,
  ProductSalesRow,
  RepresentativePerformanceRow,
  RepresentativeSettlement,
  ReturnedChequeRow,
  SettlementStatus,
  SettlementSummaryRow,
} from './types';

// Per-line discount is mutually exclusive with the order-wide discount —
// enforced by the backend, mirrored here for the request shape.
type OrderItemInput = {
  productId: string;
  quantity: number;
  discountPercentage?: number;
  discountAmount?: number;
};

function buildParams<T extends object>(params: T) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') cleaned[key] = value;
  }
  return cleaned;
}

export const api = {
  auth: {
    adminLogin: (email: string, password: string) =>
      apiClient.post<AuthResponse>('/auth/admin/login', { email, password }).then((r) => r.data),
    dealerLogin: (username: string, password: string) =>
      apiClient.post<AuthResponse>('/auth/dealer/login', { username, password }).then((r) => r.data),
    forgotPassword: (identifier: string, role: Role) =>
      apiClient.post<{ message: string }>('/auth/forgot-password', { identifier, role }).then((r) => r.data),
    resetPassword: (token: string, role: Role, newPassword: string) =>
      apiClient.post<{ message: string }>('/auth/reset-password', { token, role, newPassword }).then((r) => r.data),
    logout: (refreshToken: string) =>
      apiClient.post<{ message: string }>('/auth/logout', { refreshToken }).then((r) => r.data),
    me: () => apiClient.get('/auth/me').then((r) => r.data),
  },

  dealers: {
    list: (params: PaginationParams & { status?: string }) =>
      apiClient.get<Paginated<Dealer>>('/dealers', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<DealerDetail>(`/dealers/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      apiClient
        .post<{ dealer: Dealer; temporaryPassword?: string }>('/dealers', data)
        .then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Dealer>(`/dealers/${id}`, data).then((r) => r.data),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      apiClient.patch<Dealer>(`/dealers/${id}/status`, { status }).then((r) => r.data),
    resetPassword: (id: string) =>
      apiClient
        .post<{ dealer: Dealer; temporaryPassword: string }>(`/dealers/${id}/reset-password`)
        .then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/dealers/${id}`).then((r) => r.data),
    clearData: (id: string, password: string) =>
      apiClient
        .post<{ message: string; orders: number; invoices: number; payments: number; salesReturns: number }>(
          `/dealers/${id}/clear-data`,
          { password },
        )
        .then((r) => r.data),
  },

  suppliers: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<Supplier>>('/suppliers', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Supplier>('/suppliers', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/suppliers/${id}`).then((r) => r.data),
  },

  products: {
    list: (params: PaginationParams & { category?: string; status?: string; outOfStockOnly?: boolean }) =>
      apiClient.get<Paginated<Product>>('/products', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Product>('/products', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Product>(`/products/${id}`, data).then((r) => r.data),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      apiClient.patch<Product>(`/products/${id}/status`, { status }).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/products/${id}`).then((r) => r.data),
    uploadImages: (id: string, files: File[]) => {
      const form = new FormData();
      files.forEach((file) => form.append('images', file));
      return apiClient
        .post<ProductImage[]>(`/products/${id}/images`, form, { headers: { 'Content-Type': undefined } })
        .then((r) => r.data);
    },
    removeImage: (id: string, imageId: string) =>
      apiClient.delete<{ message: string }>(`/products/${id}/images/${imageId}`).then((r) => r.data),

    setAvailabilityOverride: (id: string, forceAvailable: boolean, reason?: string) =>
      apiClient
        .post(`/products/${id}/availability-override`, { forceAvailable, reason })
        .then((r) => r.data),
    removeAvailabilityOverride: (id: string) =>
      apiClient.delete<{ message: string }>(`/products/${id}/availability-override`).then((r) => r.data),

    commissionRules: (id: string) =>
      apiClient.get<CommissionRule[]>(`/products/${id}/commission-rules`).then((r) => r.data),
    createCommissionRule: (id: string, data: Record<string, unknown>) =>
      apiClient.post<CommissionRule>(`/products/${id}/commission-rules`, data).then((r) => r.data),
    updateCommissionRule: (id: string, ruleId: string, data: Record<string, unknown>) =>
      apiClient.patch<CommissionRule>(`/products/${id}/commission-rules/${ruleId}`, data).then((r) => r.data),
    removeCommissionRule: (id: string, ruleId: string) =>
      apiClient
        .delete<{ message: string }>(`/products/${id}/commission-rules/${ruleId}`)
        .then((r) => r.data),
  },

  categories: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<Category>>('/categories', { params: buildParams(params) }).then((r) => r.data),
    create: (data: { name: string }) => apiClient.post<Category>('/categories', data).then((r) => r.data),
    update: (id: string, data: { name: string }) =>
      apiClient.patch<Category>(`/categories/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/categories/${id}`).then((r) => r.data),
  },

  inventory: {
    list: (params: PaginationParams & { status?: 'IN_STOCK' | 'OUT_OF_STOCK' }) =>
      apiClient.get<Paginated<InventoryStockRow>>('/inventory', { params: buildParams(params) }).then((r) => r.data),
    ledger: (
      productId: string,
      params: PaginationParams & { dateFrom?: string; dateTo?: string; type?: InventoryLogType },
    ) =>
      apiClient
        .get<Paginated<InventoryLog>>(`/inventory/${productId}/ledger`, { params: buildParams(params) })
        .then((r) => r.data),
    adjust: (data: { productId: string; direction: 'IN' | 'OUT'; quantity: number; reason: string }) =>
      apiClient.post<Product>('/inventory/adjustment', data).then((r) => r.data),
  },

  purchases: {
    list: (params: PaginationParams & { supplierId?: string; dateFrom?: string; dateTo?: string }) =>
      apiClient.get<Paginated<Purchase>>('/purchases', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Purchase>(`/purchases/${id}`).then((r) => r.data),
    create: (data: {
      supplierId: string;
      invoiceNumber: string;
      purchaseDate: string;
      items: { productId: string; quantity: number; unitCost: number }[];
      transportCharges?: number;
    }) => apiClient.post<Purchase>('/purchases', data).then((r) => r.data),
    update: (
      id: string,
      data: {
        supplierId: string;
        invoiceNumber: string;
        purchaseDate: string;
        items: { productId: string; quantity: number; unitCost: number }[];
        transportCharges?: number;
      },
    ) => apiClient.patch<Purchase>(`/purchases/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/purchases/${id}`).then((r) => r.data),
  },

  purchaseReturns: {
    list: (params: PaginationParams & { supplierId?: string; dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<Paginated<PurchaseReturn>>('/purchase-returns', { params: buildParams(params) })
        .then((r) => r.data),
    listForPurchase: (purchaseId: string) =>
      apiClient.get<PurchaseReturn[]>(`/purchase-returns/by-purchase/${purchaseId}`).then((r) => r.data),
    get: (id: string) => apiClient.get<PurchaseReturn>(`/purchase-returns/${id}`).then((r) => r.data),
    create: (data: {
      purchaseId?: string;
      supplierId?: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number; unitCost?: number }[];
    }) => apiClient.post<PurchaseReturn>('/purchase-returns', data).then((r) => r.data),
    update: (
      id: string,
      data: {
        reason: string;
        returnDate: string;
        items: { productId: string; quantity: number; unitCost?: number }[];
      },
    ) => apiClient.patch<PurchaseReturn>(`/purchase-returns/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/purchase-returns/${id}`).then((r) => r.data),
  },

  orders: {
    list: (
      params: PaginationParams & {
        status?: OrderStatus;
        dealerId?: string;
        dateFrom?: string;
        dateTo?: string;
      },
    ) => apiClient.get<Paginated<Order>>('/orders', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
    create: (data: {
      dealerId?: string;
      items: OrderItemInput[];
      discountPercentage?: number;
      discountAmount?: number;
      saleDate?: string;
    }) => apiClient.post<Order>('/orders', data).then((r) => r.data),
    approve: (id: string, discount?: { discountPercentage?: number; discountAmount?: number }) =>
      apiClient.patch<Order>(`/orders/${id}/approve`, discount ?? {}).then((r) => r.data),
    reject: (id: string, reason: string) =>
      apiClient.patch<Order>(`/orders/${id}/reject`, { reason }).then((r) => r.data),
    updateStatus: (id: string, status: 'PACKED' | 'DELIVERED' | 'COMPLETED') =>
      apiClient.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
    completeDirectly: (id: string) => apiClient.patch<Order>(`/orders/${id}/complete`).then((r) => r.data),
    updateItems: (id: string, items: { productId: string; quantity: number }[]) =>
      apiClient.patch<Order>(`/orders/${id}/items`, { items }).then((r) => r.data),
    update: (
      id: string,
      data: {
        dealerId: string;
        items: OrderItemInput[];
        discountPercentage?: number;
        discountAmount?: number;
        saleDate?: string;
      },
    ) => apiClient.patch<Order>(`/orders/${id}`, data).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete<{ message: string }>(`/orders/${id}`).then((r) => r.data),
    resetCounter: () =>
      apiClient.post<{ message: string; nextSerial: number }>('/orders/reset-counter').then((r) => r.data),
  },

  invoices: {
    list: (
      params: PaginationParams & {
        paymentStatus?: PaymentStatus;
        dealerId?: string;
        dateFrom?: string;
        dateTo?: string;
      },
    ) => apiClient.get<Paginated<Invoice>>('/invoices', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`).then((r) => r.data),
    resetCounter: () =>
      apiClient.post<{ message: string; nextSerial: number }>('/invoices/reset-counter').then((r) => r.data),
  },

  payments: {
    list: (
      params: PaginationParams & {
        mode?: PaymentMode;
        chequeStatus?: ChequeStatus;
        dealerId?: string;
        dateFrom?: string;
        dateTo?: string;
      },
    ) => apiClient.get<Paginated<Payment>>('/payments', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Payment>(`/payments/${id}`).then((r) => r.data),
    create: (data: {
      invoiceId: string;
      amount: number;
      mode: PaymentMode;
      reference?: string;
      paymentDate: string;
      bankName?: string;
      chequeNumber?: string;
      chequeDate?: string;
      collectedDate?: string;
      remarks?: string;
    }) => apiClient.post<Payment>('/payments', data).then((r) => r.data),
    update: (
      id: string,
      data: {
        amount: number;
        mode: PaymentMode;
        reference?: string;
        paymentDate: string;
        bankName?: string;
        chequeNumber?: string;
        chequeDate?: string;
        collectedDate?: string;
        remarks?: string;
      },
    ) => apiClient.patch<Payment>(`/payments/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/payments/${id}`).then((r) => r.data),
    updateChequeStatus: (id: string, status: ChequeStatus) =>
      apiClient.patch<Payment>(`/payments/${id}/cheque-status`, { status }).then((r) => r.data),
  },

  activityLog: {
    list: (params: PaginationParams & { action?: string; adminId?: string; dateFrom?: string; dateTo?: string }) =>
      apiClient.get<Paginated<ActivityLog>>('/activity-logs', { params: buildParams(params) }).then((r) => r.data),
    admins: () =>
      apiClient.get<{ id: string; name: string }[]>('/activity-logs/admins').then((r) => r.data),
    clearAll: (password: string) =>
      apiClient
        .delete<{ message: string; count: number }>('/activity-logs', { data: { password } })
        .then((r) => r.data),
  },

  dashboard: {
    admin: () => apiClient.get<AdminDashboardSummary>('/dashboard/admin').then((r) => r.data),
    dealer: () => apiClient.get<DealerDashboardSummary>('/dashboard/dealer').then((r) => r.data),
  },

  investors: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<Investor>>('/investors', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Investor>(`/investors/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Investor>('/investors', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Investor>(`/investors/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/investors/${id}`).then((r) => r.data),
  },

  investments: {
    list: (
      params: PaginationParams & {
        investorId?: string;
        type?: 'DEPOSIT' | 'WITHDRAWAL';
        dateFrom?: string;
        dateTo?: string;
      },
    ) => apiClient.get<Paginated<Investment>>('/investments', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Investment>(`/investments/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Investment>('/investments', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Investment>(`/investments/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/investments/${id}`).then((r) => r.data),
  },

  expenses: {
    list: (params: PaginationParams & { dateFrom?: string; dateTo?: string }) =>
      apiClient.get<Paginated<Expense>>('/expenses', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Expense>(`/expenses/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Expense>('/expenses', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Expense>(`/expenses/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/expenses/${id}`).then((r) => r.data),
  },

  equity: {
    summary: () => apiClient.get<EquitySummary>('/equity').then((r) => r.data),
    history: (
      params: PaginationParams & {
        type?: 'INVESTMENT' | 'WITHDRAWAL' | 'EXPENSE';
        investorId?: string;
        dateFrom?: string;
        dateTo?: string;
      },
    ) =>
      apiClient
        .get<Paginated<EquityHistoryEntry>>('/equity/history', { params: buildParams(params) })
        .then((r) => r.data),
  },

  liquidCash: {
    summary: () => apiClient.get<LiquidCashSummary>('/liquid-cash/summary').then((r) => r.data),
    history: (
      params: PaginationParams & {
        type?: LiquidCashEntryType;
        dateFrom?: string;
        dateTo?: string;
      },
    ) =>
      apiClient
        .get<Paginated<LiquidCashHistoryEntry>>('/liquid-cash/history', { params: buildParams(params) })
        .then((r) => r.data),
  },

  creditBalance: {
    summary: () => apiClient.get<CreditBalanceSummary>('/credit-balance/summary').then((r) => r.data),
    history: (
      params: PaginationParams & {
        type?: CreditBalanceEntryType;
        dateFrom?: string;
        dateTo?: string;
      },
    ) =>
      apiClient
        .get<Paginated<CreditBalanceHistoryEntry>>('/credit-balance/history', { params: buildParams(params) })
        .then((r) => r.data),
  },

  salesReturns: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<SalesReturn>>('/sales-returns', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<SalesReturn>(`/sales-returns/${id}`).then((r) => r.data),
    byOrder: (orderId: string) =>
      apiClient.get<SalesReturn[]>(`/sales-returns/by-order/${orderId}`).then((r) => r.data),
    create: (data: {
      orderId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) => apiClient.post<SalesReturn>('/sales-returns', data).then((r) => r.data),
    update: (
      id: string,
      data: {
        reason: string;
        returnDate: string;
        items: { productId: string; quantity: number }[];
      },
    ) => apiClient.patch<SalesReturn>(`/sales-returns/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/sales-returns/${id}`).then((r) => r.data),
    resetCounter: () =>
      apiClient.post<{ message: string; nextSerial: number }>('/sales-returns/reset-counter').then((r) => r.data),
  },

  credits: {
    summary: (params: PaginationParams & { onlyOutstanding?: boolean }) =>
      apiClient.get<CreditsSummary>('/credits', { params: buildParams(params) }).then((r) => r.data),
    detail: (supplierId: string) =>
      apiClient.get<SupplierCreditDetail>(`/credits/${supplierId}`).then((r) => r.data),
    settlements: (
      supplierId: string,
      params: PaginationParams & {
        mode?: PaymentMode;
        chequeStatus?: ChequeStatus;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: 'paymentDate' | 'chequeDepositDate';
        sortOrder?: 'asc' | 'desc';
      },
    ) =>
      apiClient
        .get<Paginated<SupplierPayment>>(`/credits/${supplierId}/settlements`, { params: buildParams(params) })
        .then((r) => r.data),
    createSettlement: (
      supplierId: string,
      data: {
        amount: number;
        mode: PaymentMode;
        reference?: string;
        paymentDate: string;
        chequeDepositDate?: string;
        remarks?: string;
      },
    ) => apiClient.post<SupplierPayment>(`/credits/${supplierId}/settlements`, data).then((r) => r.data),
    updateChequeStatus: (paymentId: string, status: ChequeStatus) =>
      apiClient
        .patch<SupplierPayment>(`/credits/settlements/${paymentId}/status`, { status })
        .then((r) => r.data),
    deleteSettlement: (paymentId: string) =>
      apiClient.delete<{ message: string }>(`/credits/settlements/${paymentId}`).then((r) => r.data),
  },

  salesAnalysis: {
    list: (params: PaginationParams & { dateFrom?: string; dateTo?: string; dealerId?: string }) =>
      apiClient
        .get<Paginated<SalesAnalysisRow>>('/sales-analysis', { params: buildParams(params) })
        .then((r) => r.data),
    summary: (params: { dateFrom?: string; dateTo?: string; dealerId?: string; search?: string }) =>
      apiClient
        .get<SalesAnalysisSummary>('/sales-analysis/summary', { params: buildParams(params) })
        .then((r) => r.data),
  },

  // Representative Management (version2_changes_backend.md §3) — mirrors api.dealers exactly.
  representatives: {
    list: (params: PaginationParams & { status?: string }) =>
      apiClient.get<Paginated<Representative>>('/representatives', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<RepresentativeDetail>(`/representatives/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) =>
      apiClient
        .post<{ representative: Representative; temporaryPassword?: string }>('/representatives', data)
        .then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Representative>(`/representatives/${id}`, data).then((r) => r.data),
    setStatus: (id: string, status: string) =>
      apiClient.patch<Representative>(`/representatives/${id}/status`, { status }).then((r) => r.data),
    resetPassword: (id: string) =>
      apiClient
        .post<{ representative: Representative; temporaryPassword: string }>(`/representatives/${id}/reset-password`)
        .then((r) => r.data),
    forcePasswordChange: (id: string) =>
      apiClient.post<Representative>(`/representatives/${id}/force-password-change`).then((r) => r.data),
    unlock: (id: string) => apiClient.post<Representative>(`/representatives/${id}/unlock`).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/representatives/${id}`).then((r) => r.data),

    loginHistory: (id: string, params: PaginationParams) =>
      apiClient
        .get<Paginated<RepresentativeLoginHistoryEntry>>(`/representatives/${id}/login-history`, {
          params: buildParams(params),
        })
        .then((r) => r.data),
    activityLog: (id: string, params: PaginationParams) =>
      apiClient
        .get<Paginated<RepActivityLogEntry>>(`/representatives/${id}/activity-log`, { params: buildParams(params) })
        .then((r) => r.data),
    clearActivityLog: (id: string) =>
      apiClient.delete<{ message: string; count: number }>(`/representatives/${id}/activity-log`).then((r) => r.data),
    salesStats: (id: string) =>
      apiClient.get<RepresentativeSalesStats>(`/representatives/${id}/sales-stats`).then((r) => r.data),
    commissionStats: (id: string) =>
      apiClient.get<RepresentativeCommissionStats>(`/representatives/${id}/commission-stats`).then((r) => r.data),
    settlements: (id: string, params: PaginationParams) =>
      apiClient
        .get<Paginated<RepresentativeSettlement>>(`/representatives/${id}/settlements`, { params: buildParams(params) })
        .then((r) => r.data),

    assignedProducts: (id: string) =>
      apiClient.get<ProductAssignment[]>(`/representatives/${id}/assigned-products`).then((r) => r.data),
    assignProduct: (id: string, scopeType: AssignmentScopeType, scopeValue: string) =>
      apiClient
        .post<ProductAssignment>(`/representatives/${id}/assigned-products`, { scopeType, scopeValue })
        .then((r) => r.data),
    removeProductAssignment: (id: string, assignmentId: string) =>
      apiClient
        .delete<{ message: string }>(`/representatives/${id}/assigned-products/${assignmentId}`)
        .then((r) => r.data),

    assignedBanners: (id: string) =>
      apiClient.get<BannerAssignment[]>(`/representatives/${id}/assigned-banners`).then((r) => r.data),
    assignedCustomers: (id: string, params: PaginationParams) =>
      apiClient
        .get<Paginated<Dealer>>(`/representatives/${id}/assigned-customers`, { params: buildParams(params) })
        .then((r) => r.data),
  },

  // Brand module (version2_changes_backend.md §8) — mirrors api.categories.
  brands: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<Brand>>('/brands', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Brand>(`/brands/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Brand>('/brands', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Brand>(`/brands/${id}`, data).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/brands/${id}`).then((r) => r.data),
    uploadLogo: (id: string, file: File) => {
      const form = new FormData();
      form.append('logo', file);
      return apiClient.post<Brand>(`/brands/${id}/logo`, form, { headers: { 'Content-Type': undefined } }).then((r) => r.data);
    },
    uploadImage: (id: string, file: File) => {
      const form = new FormData();
      form.append('image', file);
      return apiClient.post<Brand>(`/brands/${id}/image`, form, { headers: { 'Content-Type': undefined } }).then((r) => r.data);
    },
  },

  // Banner module (version2_changes_backend.md §7) — admin CMS + representative assignments.
  banners: {
    list: () => apiClient.get<Banner[]>('/banners').then((r) => r.data),
    get: (id: string) => apiClient.get<Banner>(`/banners/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>, image: File) => {
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
      });
      form.append('image', image);
      return apiClient.post<Banner>('/banners', form, { headers: { 'Content-Type': undefined } }).then((r) => r.data);
    },
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Banner>(`/banners/${id}`, data).then((r) => r.data),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      apiClient.patch<Banner>(`/banners/${id}/status`, { status }).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/banners/${id}`).then((r) => r.data),
    listAssignments: (id: string) =>
      apiClient.get<BannerAssignment[]>(`/banners/${id}/assignments`).then((r) => r.data),
    assign: (id: string, data: { representativeId: string; priority?: number; startsAt?: string; expiresAt?: string }) =>
      apiClient.post<BannerAssignment>(`/banners/${id}/assignments`, data).then((r) => r.data),
    removeAssignment: (id: string, assignmentId: string) =>
      apiClient
        .delete<{ message: string }>(`/banners/${id}/assignments/${assignmentId}`)
        .then((r) => r.data),
  },

  // Commission engine + Settlements (version2_changes_backend.md §9-§12) — the commission-side
  // mirror of api.credits.
  commission: {
    dashboard: () => apiClient.get<CommissionDashboard>('/commission/dashboard').then((r) => r.data),
    representativeSummary: (id: string) =>
      apiClient
        .get<{
          representativeId: string;
          representativeName: string;
          pendingCommission: string;
          approvedCommission: string;
          settledCommission: string;
          recentSettlements: RepresentativeSettlement[];
        }>(`/commission/representatives/${id}/summary`)
        .then((r) => r.data),
    settlements: (params: PaginationParams & { status?: SettlementStatus; representativeId?: string }) =>
      apiClient
        .get<Paginated<RepresentativeSettlement>>('/commission/settlements', { params: buildParams(params) })
        .then((r) => r.data),
    createSettlement: (data: { representativeId: string; periodStart: string; periodEnd: string }) =>
      apiClient.post<RepresentativeSettlement>('/commission/settlements', data).then((r) => r.data),
    getSettlement: (id: string) =>
      apiClient.get<RepresentativeSettlement>(`/commission/settlements/${id}`).then((r) => r.data),
    approveSettlement: (id: string) =>
      apiClient.patch<RepresentativeSettlement>(`/commission/settlements/${id}/approve`).then((r) => r.data),
    rejectSettlement: (id: string, reason: string) =>
      apiClient
        .patch<RepresentativeSettlement>(`/commission/settlements/${id}/reject`, { reason })
        .then((r) => r.data),
    paySettlement: (
      id: string,
      data: { mode: PaymentMode; reference?: string; chequeNumber?: string; bankName?: string; chequeDate?: string },
    ) => apiClient.patch<RepresentativeSettlement>(`/commission/settlements/${id}/pay`, data).then((r) => r.data),
    updateSettlementChequeStatus: (id: string, status: 'CLEARED' | 'RETURNED') =>
      apiClient
        .patch<RepresentativeSettlement>(`/commission/settlements/${id}/cheque-status`, { status })
        .then((r) => r.data),
    receipt: (id: string) =>
      apiClient.get<RepresentativeSettlement>(`/commission/settlements/${id}/receipt`).then((r) => r.data),
  },

  // Customer Collection Management (version2_changes_backend.md §14) — admin review queue.
  collections: {
    list: (params: PaginationParams & { status?: CollectionStatus; representativeId?: string }) =>
      apiClient
        .get<Paginated<CollectionSubmission>>('/collections', { params: buildParams(params) })
        .then((r) => r.data),
    get: (id: string) => apiClient.get<CollectionSubmission>(`/collections/${id}`).then((r) => r.data),
    confirm: (id: string, invoiceId?: string) =>
      apiClient
        .patch<CollectionSubmission>(`/collections/${id}/confirm`, { invoiceId })
        .then((r) => r.data),
    reject: (id: string, reason: string) =>
      apiClient
        .patch<CollectionSubmission>(`/collections/${id}/reject`, { reason })
        .then((r) => r.data),
  },

  // Reporting (version2_changes_backend.md §17) — 100% read-only aggregation.
  reports: {
    representativePerformance: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<RepresentativePerformanceRow[]>('/reports/representative-performance', { params: buildParams(params) })
        .then((r) => r.data),
    collectionPerformance: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<CollectionPerformanceRow[]>('/reports/collection-performance', { params: buildParams(params) })
        .then((r) => r.data),
    outstandingByRepresentative: () =>
      apiClient
        .get<OutstandingByRepresentativeRow[]>('/reports/outstanding-by-representative')
        .then((r) => r.data),
    commissionSummary: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<CommissionSummaryRow[]>('/reports/commission-summary', { params: buildParams(params) })
        .then((r) => r.data),
    settlementSummary: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<SettlementSummaryRow[]>('/reports/settlement-summary', { params: buildParams(params) })
        .then((r) => r.data),
    overdueCollections: () =>
      apiClient.get<OverdueCollectionRow[]>('/reports/overdue-collections').then((r) => r.data),
    returnedCheques: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<ReturnedChequeRow[]>('/reports/returned-cheques', { params: buildParams(params) })
        .then((r) => r.data),
    salesByProduct: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient.get<ProductSalesRow[]>('/reports/sales/product', { params: buildParams(params) }).then((r) => r.data),
    salesByCategory: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<CategorySalesRow[]>('/reports/sales/category', { params: buildParams(params) })
        .then((r) => r.data),
    salesByRepresentative: (params: { dateFrom?: string; dateTo?: string }) =>
      apiClient
        .get<RepresentativePerformanceRow[]>('/reports/sales/representative', { params: buildParams(params) })
        .then((r) => r.data),
  },
};
