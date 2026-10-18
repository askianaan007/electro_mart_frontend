'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

const IMAGE_TIMEOUT_MS = 8000;

/** Resolves once every <img> on the page has loaded or failed (or the timeout passes). Returns how many failed. */
function waitForImages(): Promise<number> {
  const images = Array.from(document.images);
  const pending = images.filter((img) => !img.complete);
  const settled = Promise.all(
    pending.map(
      (img) =>
        new Promise<void>((resolve) => {
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  );
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, IMAGE_TIMEOUT_MS));
  return Promise.race([settled, timeout]).then(
    () => images.filter((img) => img.complete && img.naturalWidth === 0 && img.getAttribute('src')).length,
  );
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * window.print() with the waiting and failure handling it lacks: waits for
 * fonts and images (logo, bank QR) so the printout isn't missing them, shows a
 * busy state while preparing/printing, and reports when the browser can't print.
 */
export function usePrint() {
  const [isPrinting, setIsPrinting] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const print = useCallback(async () => {
    if (busy.current) return;
    if (typeof window === 'undefined' || typeof window.print !== 'function') {
      toast.error("Printing isn't available in this browser", {
        description: "Open this page in Chrome or Safari, or use your browser's Share → Print.",
      });
      return;
    }

    busy.current = true;
    setIsPrinting(true);
    const done = () => {
      busy.current = false;
      if (mounted.current) setIsPrinting(false);
    };

    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const failedImages = await waitForImages();
      if (failedImages > 0) {
        toast.warning(
          failedImages === 1 ? 'An image on the document failed to load' : `${failedImages} images failed to load`,
          { description: 'The printout may be missing the logo or QR code. Check your connection and try again.' },
        );
      }
      // Let layout settle (fit-to-width scaling, late renders) before the print snapshot.
      await nextFrame();
      await nextFrame();

      // Desktop browsers block inside print(); mobile ones return at once and fire
      // afterprint later. Clear the busy state on whichever comes first.
      let cleared = false;
      const clear = () => {
        if (cleared) return;
        cleared = true;
        window.removeEventListener('afterprint', clear);
        done();
      };
      window.addEventListener('afterprint', clear);
      window.print();
      setTimeout(clear, 1500);
    } catch (error) {
      done();
      toast.error("Couldn't open the print dialog", {
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }, []);

  return { print, isPrinting };
}
