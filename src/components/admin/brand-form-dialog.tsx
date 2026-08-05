'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  useCreateBrand,
  useUpdateBrand,
  useUploadBrandImage,
  useUploadBrandLogo,
} from '@/hooks/use-brands';
import { getErrorMessage } from '@/lib/api/error';
import type { Brand } from '@/lib/api/types';

const schema = z.object({
  name: z.string().min(1, 'Brand name is required'),
  description: z.string(),
  sortOrder: z.string().refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), 'Enter a valid number'),
  isFeatured: z.boolean(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(brand?: Brand): FormValues {
  return {
    name: brand?.name ?? '',
    description: brand?.description ?? '',
    sortOrder: brand ? String(brand.sortOrder) : '0',
    isFeatured: brand?.isFeatured ?? false,
    status: brand?.status ?? 'ACTIVE',
  };
}

function ImagePicker({
  label,
  currentUrl,
  onFileSelected,
}: {
  label: string;
  currentUrl: string | null | undefined;
  onFileSelected: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
          {previewUrl || currentUrl ? (
            <Image src={previewUrl ?? currentUrl ?? ''} alt={label} width={64} height={64} className="size-full object-cover" />
          ) : (
            <ImagePlus className="size-5 text-muted-foreground" />
          )}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPreviewUrl(URL.createObjectURL(file));
            onFileSelected(file);
          }}
        />
      </div>
    </div>
  );
}

export function BrandFormDialog({
  open,
  onOpenChange,
  brand,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand?: Brand;
}) {
  const isEdit = !!brand;
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand(brand?.id ?? '');
  const uploadLogo = useUploadBrandLogo();
  const uploadImage = useUploadBrandImage();
  const pending = createBrand.isPending || updateBrand.isPending;

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(brand),
  });

  async function uploadStagedImages(id: string) {
    if (logoFile) {
      await uploadLogo.mutateAsync({ id, file: logoFile }).catch((error) => toast.error(getErrorMessage(error)));
    }
    if (imageFile) {
      await uploadImage.mutateAsync({ id, file: imageFile }).catch((error) => toast.error(getErrorMessage(error)));
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    const payload: Record<string, unknown> = {
      name: values.name,
      description: values.description || undefined,
      sortOrder: Number(values.sortOrder),
      isFeatured: values.isFeatured,
    };

    if (isEdit) {
      payload.status = values.status;
      updateBrand.mutate(payload, {
        onSuccess: async () => {
          await uploadStagedImages(brand!.id);
          toast.success('Brand updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      createBrand.mutate(payload, {
        onSuccess: async (created) => {
          await uploadStagedImages(created.id);
          toast.success('Brand created');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit brand' : 'Add brand'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit brand' : 'Add a new brand'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort order</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <ImagePicker label="Logo" currentUrl={brand?.logoUrl} onFileSelected={setLogoFile} />
              <ImagePicker label="Hero image (brand page)" currentUrl={brand?.imageUrl} onFileSelected={setImageFile} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="isFeatured"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between gap-2 rounded-lg border border-border p-3">
                    <div>
                      <FormLabel>Featured</FormLabel>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              {isEdit && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={pending}>
                {isEdit ? 'Save changes' : 'Create brand'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
