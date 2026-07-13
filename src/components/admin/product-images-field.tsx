'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { useRemoveProductImage, useUploadProductImages } from '@/hooks/use-products';
import { getErrorMessage } from '@/lib/api/error';
import type { ProductImage } from '@/lib/api/types';

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

function validateFiles(files: File[]): File[] {
  const valid: File[] = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) {
      toast.error(`${file.name} is not an image`);
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(`${file.name} is larger than 5MB`);
      continue;
    }
    valid.push(file);
  }
  return valid;
}

/**
 * In edit mode (productId set) newly picked files upload immediately.
 * In create mode (no productId yet) files are only staged here — the
 * parent dialog uploads them in a follow-up call once the product exists.
 */
export function ProductImagesField({
  productId,
  images,
  stagedFiles,
  onStagedFilesChange,
}: {
  productId?: string;
  images: ProductImage[];
  stagedFiles: File[];
  onStagedFilesChange: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadImages = useUploadProductImages();
  const removeImage = useRemoveProductImage();
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = stagedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [stagedFiles]);

  const totalCount = images.length + stagedFiles.length;
  const remainingSlots = MAX_PRODUCT_IMAGES - totalCount;

  function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = validateFiles(Array.from(fileList)).slice(0, Math.max(remainingSlots, 0));
    if (files.length === 0) return;

    if (productId) {
      uploadImages.mutate(
        { id: productId, files },
        {
          onSuccess: () => toast.success(files.length > 1 ? 'Images uploaded' : 'Image uploaded'),
          onError: (error) => toast.error(getErrorMessage(error)),
        },
      );
    } else {
      onStagedFilesChange([...stagedFiles, ...files]);
    }
  }

  function removeStagedFile(index: number) {
    onStagedFilesChange(stagedFiles.filter((_, i) => i !== index));
  }

  function confirmRemoveImage(imageId: string) {
    if (!productId) return;
    removeImage.mutate(
      { id: productId, imageId },
      { onError: (error) => toast.error(getErrorMessage(error)) },
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Images (optional, up to {MAX_PRODUCT_IMAGES}, 5MB each)</p>
      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
          >
            <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
            <button
              type="button"
              onClick={() => confirmRemoveImage(image.id)}
              disabled={removeImage.isPending}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {stagedFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="group relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
          >
            {previews[index] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previews[index]} alt="" className="size-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removeStagedFile(index)}
              className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="size-3" />
            </button>
          </div>
        ))}
        {remainingSlots > 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploadImages.isPending}
            className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary"
          >
            {uploadImages.isPending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            <span className="text-[10px]">Add</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesSelected(e.target.files);
          e.target.value = '';
        }}
      />
    </div>
  );
}
