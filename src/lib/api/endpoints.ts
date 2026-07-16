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
} from './types';

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
    adjust: (data: { productId: string; direction: 'IN' | 'OUT'; quantity: number; reason?: string }) =>
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
    }) => apiClient.post<Purchase>('/purchases', data).then((r) => r.data),
    update: (
      id: string,
      data: {
        supplierId: string;
        invoiceNumber: string;
        purchaseDate: string;
        items: { productId: string; quantity: number; unitCost: number }[];
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
      items: { productId: string; quantity: number }[];
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
        items: { productId: string; quantity: number }[];
        discountPercentage?: number;
        discountAmount?: number;
        saleDate: string;
      },
    ) => apiClient.patch<Order>(`/orders/${id}`, data).then((r) => r.data),
    remove: (id: string) =>
      apiClient.delete<{ message: string }>(`/orders/${id}`).then((r) => r.data),
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
  },

  payments: {
    list: (
      params: PaginationParams & { mode?: PaymentMode; dealerId?: string; dateFrom?: string; dateTo?: string },
    ) => apiClient.get<Paginated<Payment>>('/payments', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Payment>(`/payments/${id}`).then((r) => r.data),
    create: (data: {
      invoiceId: string;
      amount: number;
      mode: PaymentMode;
      reference?: string;
      paymentDate: string;
    }) => apiClient.post<Payment>('/payments', data).then((r) => r.data),
  },

  activityLog: {
    list: (params: PaginationParams & { action?: string; adminId?: string; dateFrom?: string; dateTo?: string }) =>
      apiClient.get<Paginated<ActivityLog>>('/activity-logs', { params: buildParams(params) }).then((r) => r.data),
    admins: () =>
      apiClient.get<{ id: string; name: string }[]>('/activity-logs/admins').then((r) => r.data),
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

  salesReturns: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<SalesReturn>>('/sales-returns', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<SalesReturn>(`/sales-returns/${id}`).then((r) => r.data),
    create: (data: {
      orderId: string;
      reason: string;
      returnDate: string;
      items: { productId: string; quantity: number }[];
    }) => apiClient.post<SalesReturn>('/sales-returns', data).then((r) => r.data),
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
};
