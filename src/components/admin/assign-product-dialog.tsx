'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAssignProduct } from '@/hooks/use-representatives';
import { useAllCategories } from '@/hooks/use-categories';
import { useProducts } from '@/hooks/use-products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { getErrorMessage } from '@/lib/api/error';
import type { AssignmentScopeType } from '@/lib/api/types';

const SCOPE_LABELS: Record<AssignmentScopeType, string> = {
  CATEGORY: 'Category',
  PRODUCT: 'Product',
  BRAND: 'Brand',
  CAMPAIGN: 'Campaign',
};

export function AssignProductDialog({
  open,
  onOpenChange,
  representativeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  representativeId: string;
}) {
  const [scopeType, setScopeType] = useState<AssignmentScopeType>('CATEGORY');
  const [scopeValue, setScopeValue] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const debouncedProductSearch = useDebouncedValue(productSearch);

  const assignProduct = useAssignProduct(representativeId);
  const { data: categories } = useAllCategories();
  const { data: productResults, isFetching: productsFetching } = useProducts({
    search: debouncedProductSearch || undefined,
    limit: 20,
  });

  function changeScopeType(next: AssignmentScopeType) {
    setScopeType(next);
    setScopeValue('');
  }

  function handleAssign() {
    if (!scopeValue) return;
    assignProduct.mutate(
      { scopeType, scopeValue },
      {
        onSuccess: () => {
          toast.success('Scope assigned');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Assign a catalog scope">
        <DialogHeader>
          <DialogTitle>Assign a catalog scope</DialogTitle>
          <DialogDescription>
            Grant this representative visibility into a category, individual product, brand, or campaign. Their
            catalog is opt-in — with no assignments, they see everything; the first assignment scopes them down.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Scope type</Label>
            <Select value={scopeType} onValueChange={(v) => changeScopeType(v as AssignmentScopeType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'CATEGORY' && (
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.data.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeType === 'PRODUCT' && (
            <div className="space-y-2">
              <Label>Product</Label>
              <Input
                placeholder="Search products by name, code, SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <Select value={scopeValue} onValueChange={setScopeValue}>
                <SelectTrigger>
                  <SelectValue placeholder={productsFetching ? 'Searching…' : 'Select a product'} />
                </SelectTrigger>
                <SelectContent>
                  {productResults?.data.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} ({product.productCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeType === 'BRAND' && (
            <div className="space-y-2">
              <Label>Brand name</Label>
              <Input
                placeholder="e.g. EMAX"
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
              />
            </div>
          )}

          {scopeType === 'CAMPAIGN' && (
            <div className="space-y-2">
              <Label>Campaign key</Label>
              <Input
                placeholder="Matches CommissionRule.campaignName for active campaign rules"
                value={scopeValue}
                onChange={(e) => setScopeValue(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!scopeValue} loading={assignProduct.isPending}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
