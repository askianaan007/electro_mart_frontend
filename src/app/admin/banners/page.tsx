'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon, MoreHorizontal, Plus, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
import { AccountStatusBadge } from '@/components/status-badge';
import { PageHeader } from '@/components/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BannerFormDialog } from '@/components/admin/banner-form-dialog';
import { BannerAssignDialog } from '@/components/admin/banner-assign-dialog';
import { useBanners, useDeleteBanner, useSetBannerStatus } from '@/hooks/use-banners';
import { getErrorMessage } from '@/lib/api/error';
import type { Banner } from '@/lib/api/types';

function BannerCard({
  banner,
  onEdit,
  onAssign,
  onDeleteRequest,
}: {
  banner: Banner;
  onEdit: () => void;
  onAssign: () => void;
  onDeleteRequest: () => void;
}) {
  const setStatus = useSetBannerStatus(banner.id);

  function toggleStatus() {
    const next = banner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    setStatus.mutate(next, {
      onSuccess: () => toast.success(`Banner ${next === 'ACTIVE' ? 'activated' : 'deactivated'}`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/7] w-full border-b border-border bg-muted">
        <Image src={banner.imageUrl} alt={banner.title ?? 'Banner'} fill className="object-cover" />
        <div className="absolute right-2 top-2">
          <AccountStatusBadge status={banner.status} />
        </div>
      </div>
      <CardContent className="flex items-center justify-between gap-2 p-4 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{banner.title ?? 'Untitled banner'}</p>
          <p className="truncate text-xs text-muted-foreground">{banner.subtitle ?? `Sort order ${banner.sortOrder}`}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Banner actions" className="shrink-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onAssign}>
              <Users />
              Assign to representatives
            </DropdownMenuItem>
            <DropdownMenuItem onClick={toggleStatus}>
              {banner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDeleteRequest}>
              <Trash2 />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  );
}

export default function BannersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | undefined>(undefined);
  const [assignBanner, setAssignBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const deleteBanner = useDeleteBanner();

  const { data: banners, isLoading, isError, error, refetch } = useBanners();

  function openCreate() {
    setEditingBanner(undefined);
    setFormOpen(true);
  }

  function openEdit(banner: Banner) {
    setEditingBanner(banner);
    setFormOpen(true);
  }

  function confirmDelete() {
    if (!deletingBanner) return;
    deleteBanner.mutate(deletingBanner.id, {
      onSuccess: () => {
        toast.success('Banner deleted');
        setDeletingBanner(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingBanner(null);
      },
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners"
        description="Manage the homepage banner rotation for the Representative Portal"
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add Banner
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
              <Skeleton className="aspect-[16/7] w-full rounded-none" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <QueryErrorState error={error} onRetry={() => refetch()} />
        </div>
      ) : !banners || banners.length === 0 ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <EmptyState icon={ImageIcon} title="No banners found" description="Add your first banner to get started" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onEdit={() => openEdit(banner)}
              onAssign={() => setAssignBanner(banner)}
              onDeleteRequest={() => setDeletingBanner(banner)}
            />
          ))}
        </div>
      )}

      <BannerFormDialog
        key={formOpen ? (editingBanner?.id ?? 'new') : 'closed'}
        open={formOpen}
        onOpenChange={setFormOpen}
        banner={editingBanner}
      />
      <BannerAssignDialog open={!!assignBanner} onOpenChange={(open) => !open && setAssignBanner(null)} banner={assignBanner} />

      <AlertDialog open={!!deletingBanner} onOpenChange={(open) => !open && setDeletingBanner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this banner?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingBanner?.title ?? 'This banner'}&quot; and all of its representative assignments will be
              permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className={buttonVariants({ variant: 'destructive' })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
