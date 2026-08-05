'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, Users } from 'lucide-react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { useAllRepresentatives } from '@/hooks/use-representatives';
import { useAssignBanner, useBannerAssignments, useRemoveBannerAssignment } from '@/hooks/use-banners';
import { getErrorMessage } from '@/lib/api/error';
import type { Banner } from '@/lib/api/types';

export function BannerAssignDialog({
  open,
  onOpenChange,
  banner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner: Banner | null;
}) {
  const bannerId = banner?.id ?? '';
  const [representativeId, setRepresentativeId] = useState('');
  const [priority, setPriority] = useState('0');

  const { data: representatives } = useAllRepresentatives();
  const { data: assignments, isLoading } = useBannerAssignments(bannerId);
  const assignBanner = useAssignBanner(bannerId);
  const removeAssignment = useRemoveBannerAssignment(bannerId);

  function handleAssign() {
    if (!representativeId) return;
    assignBanner.mutate(
      { representativeId, priority: Number(priority) || 0 },
      {
        onSuccess: () => {
          toast.success('Banner assigned');
          setRepresentativeId('');
          setPriority('0');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Assign banner to representatives">
        <DialogHeader>
          <DialogTitle>Assign &quot;{banner?.title ?? 'this banner'}&quot;</DialogTitle>
          <DialogDescription>
            Representatives with an active assignment see this banner first on their homepage. With no
            assignments, every representative sees the global active banner rotation instead.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-2">
            <Label>Representative</Label>
            <Select value={representativeId} onValueChange={setRepresentativeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a representative" />
              </SelectTrigger>
              <SelectContent>
                {representatives?.data.map((rep) => (
                  <SelectItem key={rep.id} value={rep.id}>
                    {rep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-2">
            <Label>Priority</Label>
            <Input type="number" min={0} value={priority} onChange={(e) => setPriority(e.target.value)} />
          </div>
          <Button onClick={handleAssign} disabled={!representativeId} loading={assignBanner.isPending}>
            Assign
          </Button>
        </div>

        <div className="rounded-lg border border-border">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          ) : !assignments || assignments.length === 0 ? (
            <EmptyState icon={Users} title="No representatives assigned yet" />
          ) : (
            <div className="divide-y divide-border">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between p-3">
                  <div>
                    <p className="text-sm font-medium">
                      {representatives?.data.find((r) => r.id === assignment.representativeId)?.name ??
                        assignment.representativeId}
                    </p>
                    <p className="text-xs text-muted-foreground">Priority {assignment.priority}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      removeAssignment.mutate(assignment.id, {
                        onSuccess: () => toast.success('Assignment removed'),
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

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
