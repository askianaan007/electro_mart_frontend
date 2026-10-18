'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, HandCoins, Percent, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { api } from '@/lib/api/endpoints';
import { getErrorMessage } from '@/lib/api/error';
import { formatCurrency, formatDate } from '@/lib/utils';
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
          toast.success('Commission rule added successfully');
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
      <DialogContent title="Commission rules" className="flex max-h-[90vh] flex-col sm:max-w-xl">
        {/* Dialog Header */}
        <DialogHeader className="shrink-0">
          <DialogTitle>Commission Rules for {product?.name}</DialogTitle>
          <DialogDescription>
            Campaign rules with an active date range supersede standing rules while in effect.
            Commissions are computed out-of-band for representatives and do not affect customer prices.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto">
          {/* Active Rules Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Existing Commission Rules</h3>
            <div className="overflow-hidden rounded-lg border border-border">
              {rulesQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : rulesQuery.isError ? (
                <QueryErrorState error={rulesQuery.error} onRetry={() => rulesQuery.refetch()} className="py-8" />
              ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
                <EmptyState icon={HandCoins} title="No commission rules configured" description="Add a percentage or fixed amount rule below" className="py-8" />
              ) : (
                <div className="divide-y divide-border">
                  {rulesQuery.data.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/40">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={rule.type === 'PERCENTAGE' ? 'success' : 'default'} className="tabular-nums">
                            {rule.type === 'PERCENTAGE' ? <Percent /> : <HandCoins />}
                            <span>{rule.type === 'PERCENTAGE' ? `${rule.value}%` : formatCurrency(rule.value)}</span>
                          </Badge>

                          {rule.isCampaign && (
                            <Badge variant="warning">
                              <Sparkles />
                              <span>Campaign: {rule.campaignName || 'Active Promo'}</span>
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="size-3" />
                          <span>
                            {formatDate(rule.startDate)} – {rule.endDate ? formatDate(rule.endDate) : 'Ongoing'}
                          </span>
                        </div>
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
                        className="ml-2 size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        title="Delete rule"
                        aria-label="Delete rule"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add New Rule Form */}
          <div className="space-y-4 border-t border-border pt-5">
            <h3 className="text-sm font-semibold">Add New Commission Rule</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Commission Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as CommissionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Rule Value {type === 'PERCENTAGE' ? '(%)' : '(₹)'}</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={type === 'PERCENTAGE' ? 'e.g. 5.5' : 'e.g. 150'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="tabular-nums"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>End Date (Optional)</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>

            {/* Campaign Rule Toggle */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div>
                <Label>Campaign Overriding Rule</Label>
                <p className="text-xs text-muted-foreground">Supersedes standing rules while campaign date is active</p>
              </div>
              <Switch checked={isCampaign} onCheckedChange={setIsCampaign} />
            </div>

            {isCampaign && (
              <div className="space-y-1.5">
                <Label>Campaign Title</Label>
                <Input
                  placeholder="e.g., Festive Bonus Campaign..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end">
              <Button type="button" variant="outline" onClick={handleAdd} loading={createRule.isPending}>
                <Plus />
                Add Commission Rule
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border pt-4">
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
