'use client';

import { useState } from 'react';
import { Check, Pencil, Plus, Tag, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { QueryErrorState } from '@/components/query-error-state';
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
import { useAllCategories, useCreateCategory, useDeleteCategory, useUpdateCategory } from '@/hooks/use-categories';
import { getErrorMessage } from '@/lib/api/error';
import type { Category } from '@/lib/api/types';

export function CategoryManagerDialog({
  open,
  onOpenChange,
  onCategoryCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (category: Category) => void;
}) {
  const [name, setName] = useState('');
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { data: categories, isLoading, isError, error, refetch } = useAllCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const updateCategory = useUpdateCategory();

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditingName(category.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName('');
  }

  function confirmEdit() {
    const trimmed = editingName.trim();
    if (!editingId || !trimmed) return;
    updateCategory.mutate(
      { id: editingId, name: trimmed },
      {
        onSuccess: () => {
          toast.success('Category renamed — matching products were updated too');
          cancelEdit();
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) return;
    createCategory.mutate(
      { name: trimmed },
      {
        onSuccess: (category) => {
          toast.success('Category added');
          setName('');
          onCategoryCreated?.(category);
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

          <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : isError ? (
              <QueryErrorState error={error} onRetry={() => refetch()} className="py-8" />
            ) : !categories || categories.data.length === 0 ? (
              <EmptyState icon={Tag} title="No categories yet" description="Add your first category above" />
            ) : (
              categories.data.map((category) =>
                editingId === category.id ? (
                  <div
                    key={category.id}
                    className="flex items-center gap-2 border-b border-border px-4 py-2 last:border-b-0"
                  >
                    <Input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          confirmEdit();
                        }
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label="Save category"
                      disabled={updateCategory.isPending}
                      onClick={confirmEdit}
                    >
                      <Check />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Cancel edit" onClick={cancelEdit}>
                      <X />
                    </Button>
                  </div>
                ) : (
                  <div
                    key={category.id}
                    className="flex items-center justify-between border-b border-border px-4 py-2 transition-colors last:border-b-0 hover:bg-muted/40"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        aria-label="Rename category"
                        onClick={() => startEdit(category)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete category"
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ),
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deletingCategory?.name}&quot; will be removed. This only works if no product currently uses this
              category — reassign or update those products first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteCategory.isPending}
              className={buttonVariants({ variant: 'destructive' })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
