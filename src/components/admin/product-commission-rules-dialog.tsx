'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, HandCoins, Percent, Plus, Sparkles, Trash2 } from 'lucide-react';
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
import { cn, formatCurrency, formatDate } from '@/lib/utils';
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
      <DialogContent title="Commission rules" className="sm:max-w-xl rounded-3xl border border-border/60 bg-card/95 backdrop-blur-2xl p-6 shadow-2xl select-none overflow-hidden max-h-[90vh] flex flex-col">
        {/* Specular Shimmer Top Curve */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-14 rounded-t-3xl bg-gradient-to-b from-white/20 via-white/5 to-transparent dark:from-white/10" />

        {/* Dialog Header */}
        <DialogHeader className="relative z-10 space-y-1 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-primary shadow-xs">
              <HandCoins className="size-4.5" />
            </div>
            <DialogTitle className="text-lg sm:text-xl font-extrabold tracking-tight">
              Commission Rules for {product?.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-medium leading-relaxed">
            Campaign rules with an active date range supersede standing rules while in effect.
            Commissions are computed out-of-band for representatives and do not affect customer prices.
          </DialogDescription>
        </DialogHeader>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Active Rules Section */}
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Existing Commission Rules
            </p>
            <div className="rounded-2xl border border-border/60 bg-muted/40 backdrop-blur-md overflow-hidden">
              {rulesQuery.isLoading ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
                </div>
              ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
                <EmptyState icon={HandCoins} title="No commission rules configured" description="Add a percentage or fixed amount rule below" />
              ) : (
                <div className="divide-y divide-border/50">
                  {rulesQuery.data.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-extrabold shadow-2xs',
                              rule.type === 'PERCENTAGE'
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30'
                            )}
                          >
                            {rule.type === 'PERCENTAGE' ? <Percent className="size-3" /> : <HandCoins className="size-3" />}
                            <span>{rule.type === 'PERCENTAGE' ? `${rule.value}%` : formatCurrency(rule.value)}</span>
                          </span>

                          {rule.isCampaign && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                              <Sparkles className="size-3 text-amber-500" />
                              <span>Campaign: {rule.campaignName || 'Active Promo'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Calendar className="size-3 text-muted-foreground/70" />
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
                        className="size-8 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700 transition-all shrink-0 ml-2"
                        title="Delete rule"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add New Rule Form Card */}
          <div className="space-y-3.5 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur-md shadow-2xs">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Plus className="size-4 text-primary" />
              <span>Add New Commission Rule</span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Commission Type
                </Label>
                <Select value={type} onValueChange={(v) => setType(v as CommissionType)}>
                  <SelectTrigger className="h-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold text-xs sm:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-border/60 shadow-xl">
                    <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                    <SelectItem value="FIXED">Fixed Amount per Unit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Rule Value {type === 'PERCENTAGE' ? '(%)' : '(₹)'}
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={type === 'PERCENTAGE' ? 'e.g. 5.5' : 'e.g. 150'}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-md font-semibold text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Start Date
                </Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  End Date (Optional)
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-medium"
                />
              </div>
            </div>

            {/* Campaign Rule Toggle */}
            <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3">
              <div>
                <Label className="text-xs font-bold text-foreground">Campaign Overriding Rule</Label>
                <p className="text-[11px] text-muted-foreground">Supersedes standing rules while campaign date is active</p>
              </div>
              <Switch checked={isCampaign} onCheckedChange={setIsCampaign} />
            </div>

            {isCampaign && (
              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Campaign Title
                </Label>
                <Input
                  placeholder="e.g., Festive Bonus Campaign..."
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="h-10 rounded-xl border-border/60 bg-background/60 backdrop-blur-md text-xs font-semibold"
                />
              </div>
            )}

            <Button
              type="button"
              onClick={handleAdd}
              loading={createRule.isPending}
              className="w-full rounded-2xl font-bold shadow-md hover:shadow-lg transition-all h-10 mt-1"
            >
              <Plus className="size-4" />
              <span>Add Commission Rule</span>
            </Button>
          </div>
        </div>

        <DialogFooter className="relative z-10 shrink-0 pt-3 border-t border-border/60">
          <Button onClick={() => onOpenChange(false)} className="rounded-2xl font-bold w-full sm:w-auto">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
