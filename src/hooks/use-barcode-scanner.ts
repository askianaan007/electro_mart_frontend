import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * Catches a keyboard-wedge barcode scanner while nothing editable has focus:
 * scanners "type" the code very fast and finish with Enter. Typing by hand is
 * far slower, so a burst with < `maxGapMs` between keys counts as a scan.
 */
export function useBarcodeScanner(
  onScan: (code: string) => void,
  { enabled = true, maxGapMs = 50, minLength = 3 } = {},
) {
  const buffer = useRef('');
  const lastKeyAt = useRef(0);
  const emit = useEffectEvent((code: string) => onScan(code));

  useEffect(() => {
    if (!enabled) return;
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      const now = Date.now();
      if (now - lastKeyAt.current > maxGapMs) buffer.current = '';
      lastKeyAt.current = now;

      if (event.key === 'Enter') {
        const code = buffer.current;
        buffer.current = '';
        if (code.length >= minLength) {
          event.preventDefault();
          emit(code);
        }
        return;
      }
      if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        buffer.current += event.key;
      }
    }
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [enabled, maxGapMs, minLength]);
}
