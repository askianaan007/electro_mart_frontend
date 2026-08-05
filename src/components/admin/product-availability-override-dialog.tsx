'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { api } from '@/lib/api/endpoints';
import { productKeys } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import type { Product } from '@/lib/api/types';

type Choice = 'ACTUAL' | 'FORCE_AVAILABLE' | 'FORCE_UNAVAILABLE';

export function ProductAvailabilityOverrideDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const [choice, setChoice] = useState<Choice>('ACTUAL');
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();

  const setOverride = useMutation({
    mutationFn: (vars: { id: string; forceAvailable: boolean; reason?: string }) =>
      api.products.setAvailabilityOverride(vars.id, vars.forceAvailable, vars.reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
  const removeOverride = useMutation({
    mutationFn: (id: string) => api.products.removeAvailabilityOverride(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });

  function handleSave() {
    if (!product) return;
    if (choice === 'ACTUAL') {
      removeOverride.mutate(product.id, {
        onSuccess: () => {
          toast.success('Representatives now see the real stock status');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
      return;
    }
    setOverride.mutate(
      { id: product.id, forceAvailable: choice === 'FORCE_AVAILABLE', reason: reason || undefined },
      {
        onSuccess: () => {
          toast.success('Availability override saved');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  const pending = setOverride.isPending || removeOverride.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setChoice('ACTUAL');
          setReason('');
        }
      }}
    >
      <DialogContent title="Representative availability override">
        <DialogHeader>
          <DialogTitle>Availability override for {product?.name}</DialogTitle>
          <DialogDescription>
            Force what representatives see as In Stock / Out of Stock for this product, independent of the real
            stock count. Admin and Dealer views are never affected.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Visibility</Label>
          <Select value={choice} onValueChange={(v) => setChoice(v as Choice)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTUAL">
                Use actual stock ({product?.isOutOfStock ? 'currently Out of Stock' : 'currently In Stock'})
              </SelectItem>
              <SelectItem value="FORCE_AVAILABLE">Force &quot;In Stock&quot;</SelectItem>
              <SelectItem value="FORCE_UNAVAILABLE">Force &quot;Out of Stock&quot;</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {choice !== 'ACTUAL' && (
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input placeholder="e.g. Fresh purchase confirmed in transit" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
