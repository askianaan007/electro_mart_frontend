'use client';

import { useState } from 'react';
import { Plus, Tag, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
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
import { useAllCategories, useCreateCategory, useDeleteCategory } from '@/hooks/use-categories';
import { getErrorMessage } from '@/lib/api/error';
import type { Category } from '@/lib/api/types';

export function CategoryManagerDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { data: categories, isLoading } = useAllCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createCategory.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          toast.success('Category added');
          setName('');
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function confirmDelete() {
    if (!deletingCategory) return;
    deleteCategory.mutate(deletingCategory.id, {
      onSuccess: () => {
        toast.success('Category deleted');
        setDeletingCategory(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeletingCategory(null);
      },
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent title="Manage categories">
          <DialogHeader>
            <DialogTitle>Manage categories</DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            <Input
              placeholder="New category name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAdd();
                }
              }}
            />
            <Button type="button" onClick={handleAdd} loading={createCategory.isPending}>
              <Plus />
              Add
            </Button>
          </div>

          <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-border">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : !categories || categories.data.length === 0 ? (
              <EmptyState icon={Tag} title="No categories yet" description="Add your first category above" />
            ) : (
              categories.data.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between border-b border-border px-4 py-2 last:border-b-0"
                >
                  <span className="text-sm">{category.name}</span>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingCategory(category)}>
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingCategory?.name}&quot; will be removed from the list. Products already using it keep
              their category text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
