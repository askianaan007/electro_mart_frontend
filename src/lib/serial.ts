// Mirrors the backend's src/common/utils/serial.ts so the scan box can give
// instant feedback. The server re-checks everything — this is convenience only.

export const SERIAL_MIN = 3;
export const SERIAL_MAX = 64;
export const SERIAL_LIST_MAX = 500;

const ALLOWED = /^[A-Za-z0-9\-_/.:#+]+$/;
const CONTROL = /[\u0000-\u001F\u007F]/g;

/** As shown/printed: control characters stripped, trimmed, inner runs of spaces collapsed. */
export function cleanSerial(input: string): string {
  return input.replace(CONTROL, '').trim().replace(/\s+/g, ' ');
}

/** Uniqueness key — same rule as the server's serialKey (uppercase, no spaces). */
export function serialKey(input: string): string {
  return cleanSerial(input).replace(/\s+/g, '').toUpperCase();
}

export function serialFormatProblem(input: string): string | null {
  const shown = cleanSerial(input);
  const key = serialKey(input);
  if (!key) return 'Empty';
  if (key.length < SERIAL_MIN) return `Too short (min ${SERIAL_MIN})`;
  if (key.length > SERIAL_MAX || shown.length > SERIAL_MAX) return `Too long (max ${SERIAL_MAX})`;
  if (!ALLOWED.test(key)) return 'Only letters, digits and - _ / . : # + allowed';
  return null;
}

/** Splits pasted text (new lines, commas, tabs, semicolons) into serials. */
export function parseSerialList(text: string): string[] {
  return text
    .split(/[\n\r,;\t]+/)
    .map(cleanSerial)
    .filter(Boolean);
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let audio: AudioContext | null = null;
/** Short beep so a scan can be confirmed (or flagged) without looking. */
export function scanBeep(ok: boolean) {
  try {
    if (typeof window === 'undefined') return;
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audio ??= new Ctx();
    // iOS starts audio suspended until a tap; resume is a no-op elsewhere.
    if (audio.state === 'suspended') void audio.resume();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = ok ? 880 : 220;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + (ok ? 0.08 : 0.25));
  } catch {
    // Sound is a nicety; never let it break scanning.
  }
}

export const UNIT_STATUS_LABEL: Record<string, string> = {
  IN_STOCK: 'In stock',
  ALLOCATED: 'Allocated',
  SOLD: 'Sold',
  RETURNED_TO_SUPPLIER: 'With supplier',
  WRITTEN_OFF: 'Written off',
};

export const UNIT_EVENT_LABEL: Record<string, string> = {
  REGISTERED: 'Registered',
  SERIAL_CORRECTED: 'Serial corrected',
  ASSIGNED_TO_ORDER: 'Assigned to order',
  UNASSIGNED_FROM_ORDER: 'Removed from order',
  MARKED_SOLD: 'Delivered / sold',
  RETURNED_BY_DEALER: 'Returned by customer',
  DEALER_RETURN_REVERSED: 'Customer return reversed',
  RETURNED_TO_SUPPLIER: 'Returned to supplier',
  SUPPLIER_RETURN_REVERSED: 'Supplier return reversed',
  SUPPLIER_RETURN_RELINKED: 'Supplier return relinked',
  MARKED_DEFECTIVE: 'Marked defective',
  MARKED_GOOD: 'Marked good',
  WARRANTY_SWAP_OUT: 'Swapped out (warranty)',
  WARRANTY_SWAP_IN: 'Given as warranty replacement',
  WRITTEN_OFF: 'Written off',
  WRITE_OFF_REVERSED: 'Write-off reversed',
  WARRANTY_UPDATED: 'Warranty updated',
  RELEASED_BY_DATA_CLEAR: 'Released (dealer data cleared)',
};
