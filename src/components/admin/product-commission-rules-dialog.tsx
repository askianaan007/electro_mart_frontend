'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { api } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { formatDate } from '@/lib/utils';
import type { CommissionType, Product } from '@/lib/api/types';

export function ProductCommissionRulesDialog({
  open,
  onOpenChange,
  product,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
}) {
  const productId = product?.id ?? '';
  const queryClient = useQueryClient();

  const [type, setType] = useState<CommissionType>('PERCENTAGE');
  const [value, setValue] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCampaign, setIsCampaign] = useState(false);
  const [campaignName, setCampaignName] = useState('');

  const rulesQuery = useQuery({
    queryKey: ['products', productId, 'commission-rules'],
    queryFn: () => api.products.commissionRules(productId),
    enabled: !!productId && open,
  });

  const createRule = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.products.createCommissionRule(productId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'commission-rules'] }),
  });
  const removeRule = useMutation({
    mutationFn: (ruleId: string) => api.products.removeCommissionRule(productId, ruleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products', productId, 'commission-rules'] }),
  });

  function resetForm() {
    setType('PERCENTAGE');
    setValue('');
    setStartDate('');
    setEndDate('');
    setIsCampaign(false);
    setCampaignName('');
  }

  function handleAdd() {
    if (!value || !startDate) {
      toast.error('Value and start date are required');
      return;
    }
    createRule.mutate(
      {
        type,
        value: Number(value),
        startDate,
        endDate: endDate || undefined,
        isCampaign,
        campaignName: isCampaign ? campaignName || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success('Commission rule added');
          resetForm();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent title="Commission rules">
        <DialogHeader>
          <DialogTitle>Commission rules for {product?.name}</DialogTitle>
          <DialogDescription>
            A campaign rule with an active date range supersedes the standing rule while it&apos;s in effect.
            Commission is computed out-of-band and never affects the customer-facing price.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border">
          {rulesQuery.isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
            <EmptyState icon={HandCoins} title="No commission rules yet" />
          ) : (
            <div className="divide-y divide-border">
              {rulesQuery.data.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {rule.type === 'PERCENTAGE' ? `${rule.value}%` : rule.value}
                      {rule.isCampaign && ` · Campaign: ${rule.campaignName}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(rule.startDate)} – {rule.endDate ? formatDate(rule.endDate) : 'Ongoing'}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeRule.mutate(rule.id, {
                        onSuccess: () => toast.success('Rule deleted'),
                        onError: (error) => toast.error(getErrorMessage(error)),
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">Add a rule</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as CommissionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                  <SelectItem value="FIXED">Fixed amount per unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Value</Label>
              <Input type="number" min={0} step="0.01" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date (optional)</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label>Campaign rule</Label>
              <p className="text-xs text-muted-foreground">Supersedes the standing rule while active</p>
            </div>
            <Switch checked={isCampaign} onCheckedChange={setIsCampaign} />
          </div>
          {isCampaign && (
            <div className="space-y-1.5">
              <Label>Campaign name</Label>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
          )}
          <Button type="button" size="sm" onClick={handleAdd} loading={createRule.isPending}>
            <Plus />
            Add rule
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
