import { useSyncExternalStore } from 'react';

// The on-screen keyboard shrinks the *visual* viewport (on iOS the layout
// viewport stays full height), so full-screen panels size themselves to it —
// their bottom (buttons, end of a list) is never hidden behind the keyboard.
function subscribe(onChange: () => void) {
  const vv = window.visualViewport;
  vv?.addEventListener('resize', onChange);
  vv?.addEventListener('scroll', onChange);
  return () => {
    vv?.removeEventListener('resize', onChange);
    vv?.removeEventListener('scroll', onChange);
  };
}

export function useVisualViewport() {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      const vv = window.visualViewport;
      return vv ? `${Math.round(vv.height)}:${Math.round(vv.offsetTop)}` : '';
    },
    () => '',
  );
  if (!raw) return null;
  const [height, top] = raw.split(':').map(Number);
  return { height, top };
}
