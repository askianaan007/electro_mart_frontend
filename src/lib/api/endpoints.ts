import { apiClient } from './client';
import type {
  ActivityLog,
  AdminDashboardSummary,
  AuthResponse,
  DealerDashboardSummary,
  Dealer,
  DealerDetail,
  Invoice,
  InventoryLog,
  InventoryStockRow,
  Order,
  OrderStatus,
  Paginated,
  PaginationParams,
  Payment,
  PaymentMode,
  PaymentStatus,
  Product,
  Purchase,
  Role,
  Supplier,
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
    list: (params: PaginationParams & { category?: string; status?: string; lowStockOnly?: boolean }) =>
      apiClient.get<Paginated<Product>>('/products', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),
    create: (data: Record<string, unknown>) => apiClient.post<Product>('/products', data).then((r) => r.data),
    update: (id: string, data: Record<string, unknown>) =>
      apiClient.patch<Product>(`/products/${id}`, data).then((r) => r.data),
    setStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
      apiClient.patch<Product>(`/products/${id}/status`, { status }).then((r) => r.data),
    remove: (id: string) => apiClient.delete<{ message: string }>(`/products/${id}`).then((r) => r.data),
  },

  inventory: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<InventoryStockRow>>('/inventory', { params: buildParams(params) }).then((r) => r.data),
    ledger: (productId: string, params: PaginationParams) =>
      apiClient
        .get<Paginated<InventoryLog>>(`/inventory/${productId}/ledger`, { params: buildParams(params) })
        .then((r) => r.data),
    adjust: (data: { productId: string; direction: 'IN' | 'OUT'; quantity: number; reason?: string }) =>
      apiClient.post<Product>('/inventory/adjustment', data).then((r) => r.data),
  },

  purchases: {
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<Purchase>>('/purchases', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Purchase>(`/purchases/${id}`).then((r) => r.data),
    create: (data: {
      supplierId: string;
      invoiceNumber: string;
      purchaseDate: string;
      items: { productId: string; quantity: number; unitCost: number }[];
    }) => apiClient.post<Purchase>('/purchases', data).then((r) => r.data),
  },

  orders: {
    list: (params: PaginationParams & { status?: OrderStatus; dealerId?: string }) =>
      apiClient.get<Paginated<Order>>('/orders', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),
    create: (data: { items: { productId: string; quantity: number }[] }) =>
      apiClient.post<Order>('/orders', data).then((r) => r.data),
    approve: (id: string) => apiClient.patch<Order>(`/orders/${id}/approve`).then((r) => r.data),
    reject: (id: string, reason: string) =>
      apiClient.patch<Order>(`/orders/${id}/reject`, { reason }).then((r) => r.data),
    updateStatus: (id: string, status: 'PACKED' | 'DELIVERED' | 'COMPLETED') =>
      apiClient.patch<Order>(`/orders/${id}/status`, { status }).then((r) => r.data),
  },

  invoices: {
    list: (params: PaginationParams & { paymentStatus?: PaymentStatus; dealerId?: string }) =>
      apiClient.get<Paginated<Invoice>>('/invoices', { params: buildParams(params) }).then((r) => r.data),
    get: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`).then((r) => r.data),
  },

  payments: {
    list: (params: PaginationParams & { mode?: PaymentMode; dealerId?: string }) =>
      apiClient.get<Paginated<Payment>>('/payments', { params: buildParams(params) }).then((r) => r.data),
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
    list: (params: PaginationParams) =>
      apiClient.get<Paginated<ActivityLog>>('/activity-logs', { params: buildParams(params) }).then((r) => r.data),
  },

  dashboard: {
    admin: () => apiClient.get<AdminDashboardSummary>('/dashboard/admin').then((r) => r.data),
    dealer: () => apiClient.get<DealerDashboardSummary>('/dashboard/dealer').then((r) => r.data),
  },
};
