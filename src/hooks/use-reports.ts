import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api/endpoints';

type DateRange = { dateFrom?: string; dateTo?: string };

export const reportKeys = {
  all: ['reports'] as const,
  representativePerformance: (range: DateRange) => [...reportKeys.all, 'representative-performance', range] as const,
  collectionPerformance: (range: DateRange) => [...reportKeys.all, 'collection-performance', range] as const,
  outstandingByRepresentative: () => [...reportKeys.all, 'outstanding-by-representative'] as const,
  commissionSummary: (range: DateRange) => [...reportKeys.all, 'commission-summary', range] as const,
  settlementSummary: (range: DateRange) => [...reportKeys.all, 'settlement-summary', range] as const,
  overdueCollections: () => [...reportKeys.all, 'overdue-collections'] as const,
  returnedCheques: (range: DateRange) => [...reportKeys.all, 'returned-cheques', range] as const,
  salesByProduct: (range: DateRange) => [...reportKeys.all, 'sales-product', range] as const,
  salesByCategory: (range: DateRange) => [...reportKeys.all, 'sales-category', range] as const,
  salesByRepresentative: (range: DateRange) => [...reportKeys.all, 'sales-representative', range] as const,
};

export function useRepresentativePerformanceReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.representativePerformance(range),
    queryFn: () => api.reports.representativePerformance(range),
  });
}

export function useCollectionPerformanceReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.collectionPerformance(range),
    queryFn: () => api.reports.collectionPerformance(range),
  });
}

export function useOutstandingByRepresentativeReport() {
  return useQuery({
    queryKey: reportKeys.outstandingByRepresentative(),
    queryFn: () => api.reports.outstandingByRepresentative(),
  });
}

export function useCommissionSummaryReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.commissionSummary(range),
    queryFn: () => api.reports.commissionSummary(range),
  });
}

export function useSettlementSummaryReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.settlementSummary(range),
    queryFn: () => api.reports.settlementSummary(range),
  });
}

export function useOverdueCollectionsReport() {
  return useQuery({
    queryKey: reportKeys.overdueCollections(),
    queryFn: () => api.reports.overdueCollections(),
  });
}

export function useReturnedChequesReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.returnedCheques(range),
    queryFn: () => api.reports.returnedCheques(range),
  });
}

export function useSalesByProductReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.salesByProduct(range),
    queryFn: () => api.reports.salesByProduct(range),
  });
}

export function useSalesByCategoryReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.salesByCategory(range),
    queryFn: () => api.reports.salesByCategory(range),
  });
}

export function useSalesByRepresentativeReport(range: DateRange) {
  return useQuery({
    queryKey: reportKeys.salesByRepresentative(range),
    queryFn: () => api.reports.salesByRepresentative(range),
  });
}
