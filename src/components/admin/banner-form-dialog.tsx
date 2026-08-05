'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateBanner, useUpdateBanner } from '@/hooks/use-banners';
import { getErrorMessage } from '@/lib/api/error';
import type { Banner, BannerLinkType } from '@/lib/api/types';

const LINK_TYPES: BannerLinkType[] = ['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'EXTERNAL_URL'];

const schema = z.object({
  title: z.string(),
  subtitle: z.string(),
  ctaLabel: z.string(),
  linkType: z.enum(['NONE', 'CATEGORY', 'PRODUCT', 'BRAND', 'EXTERNAL_URL']),
  linkValue: z.string(),
  sortOrder: z.string().refine((v) => v.trim() !== '' && !Number.isNaN(Number(v)), 'Enter a valid number'),
});

type FormValues = z.infer<typeof schema>;

function defaultValuesFor(banner?: Banner): FormValues {
  return {
    title: banner?.title ?? '',
    subtitle: banner?.subtitle ?? '',
    ctaLabel: banner?.ctaLabel ?? '',
    linkType: banner?.linkType ?? 'NONE',
    linkValue: banner?.linkValue ?? '',
    sortOrder: banner ? String(banner.sortOrder) : '0',
  };
}

export function BannerFormDialog({
  open,
  onOpenChange,
  banner,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  banner?: Banner;
}) {
  const isEdit = !!banner;
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner(banner?.id ?? '');
  const pending = createBanner.isPending || updateBanner.isPending;
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaultValuesFor(banner),
  });

  const linkType = useWatch({ control: form.control, name: 'linkType' });

  const onSubmit = form.handleSubmit((values) => {
    const payload: Record<string, unknown> = {
      title: values.title || undefined,
      subtitle: values.subtitle || undefined,
      ctaLabel: values.ctaLabel || undefined,
      linkType: values.linkType,
      linkValue: values.linkType !== 'NONE' ? values.linkValue || undefined : undefined,
      sortOrder: Number(values.sortOrder),
    };

    if (isEdit) {
      updateBanner.mutate(payload, {
        onSuccess: () => {
          toast.success('Banner updated');
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      });
    } else {
      if (!imageFile) {
        toast.error('A banner image is required');
        return;
      }
      createBanner.mutate(
        { data: payload, image: imageFile },
        {
          onSuccess: () => {
            toast.success('Banner created');
            onOpenChange(false);
          },
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEdit ? 'Edit banner' : 'Add banner'} className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit banner' : 'Add a new banner'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            {!isEdit && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Image</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-20 w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    {previewUrl ? (
                      <Image src={previewUrl} alt="Banner preview" width={144} height={80} className="size-full object-cover" />
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
                      setImageFile(file);
                      setPreviewUrl(URL.createObjectURL(file));
                    }}
                  />
                </div>
              </div>
            )}
            {isEdit && banner?.imageUrl && (
              <div className="flex h-20 w-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                <Image src={banner.imageUrl} alt={banner.title ?? 'Banner'} width={144} height={80} className="size-full object-cover" />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ctaLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CTA label (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Shop Now" {...field} />
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
              <FormField
                control={form.control}
                name="linkType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LINK_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.replaceAll('_', ' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              {linkType !== 'NONE' && (
                <FormField
                  control={form.control}
                  name="linkValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {linkType === 'EXTERNAL_URL'
                          ? 'URL'
                          : linkType === 'CATEGORY'
                            ? 'Category name'
                            : linkType === 'BRAND'
                              ? 'Brand name'
                              : 'Product ID'}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
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
                {isEdit ? 'Save changes' : 'Create banner'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
