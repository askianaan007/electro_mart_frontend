'use client';

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

/**
 * Shown when the backend refuses an entry with 409 POSSIBLE_DUPLICATE. Only
 * "Record it anyway" resends (with `confirmDuplicate: true`); cancelling
 * records nothing.
 */
export function DuplicateConfirmDialog({
  message,
  pending,
  onConfirm,
  onCancel,
}: {
  /** The backend's message; the dialog is open while this is set. */
  message: string | null;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <AlertDialog open={!!message} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>This looks like a duplicate</AlertDialogTitle>
          <AlertDialogDescription>
            {message} If this really is a separate entry, record it anyway — otherwise cancel and nothing is recorded.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            Record it anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
