// Reads barcodes from the phone/laptop camera. Chrome on Android has a
// native BarcodeDetector; iOS Safari (and Firefox) don't, so they get the
// zxing WebAssembly reader instead — loaded only when the camera opens.

export interface DetectedCode {
  rawValue: string;
  format: string;
}

export interface CodeDetector {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>;
}

// Serial labels are mostly Code 128; the rest cover other makers' labels.
const FORMATS = [
  'code_128',
  'code_39',
  'code_93',
  'codabar',
  'ean_13',
  'ean_8',
  'upc_a',
  'upc_e',
  'itf',
  'qr_code',
  'data_matrix',
];

let detector: Promise<CodeDetector> | null = null;

type NativeDetectorClass = {
  new (options: { formats: string[] }): CodeDetector;
  getSupportedFormats(): Promise<string[]>;
};

async function createDetector(): Promise<CodeDetector> {
  const Native = (globalThis as { BarcodeDetector?: NativeDetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const supported = await Native.getSupportedFormats();
      if (supported.includes('code_128')) {
        return new Native({ formats: FORMATS.filter((f) => supported.includes(f)) });
      }
    } catch {
      // Fall through to the WebAssembly reader.
    }
  }
  const { BarcodeDetector, prepareZXingModule, ZXING_WASM_VERSION } = await import('barcode-detector/ponyfill');
  await prepareZXingModule({
    overrides: {
      // Served from our own origin (see scripts/copy-zxing-wasm.mjs), not a CDN.
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? `/zxing/${ZXING_WASM_VERSION}/${path}` : prefix + path,
    },
    fireImmediately: true,
  });
  return new BarcodeDetector({ formats: FORMATS as never });
}

export function getCodeDetector(): Promise<CodeDetector> {
  detector ??= createDetector().catch((error: unknown) => {
    detector = null;
    throw error;
  });
  return detector;
}

/** Why the camera can't be used here, or null if it can. */
export function cameraUnavailableReason(): string | null {
  if (typeof window === 'undefined') return 'Not available';
  if (!window.isSecureContext) {
    return 'The camera only works over HTTPS. Open the app from its https:// address.';
  }
  if (!navigator.mediaDevices?.getUserMedia) return 'This browser cannot use the camera.';
  return null;
}

export function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. On iPhone: Settings › Safari › Camera › Allow, then try again.';
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera found on this device.';
  if (name === 'NotReadableError') return 'The camera is in use by another app. Close it and try again.';
  return 'Could not start the camera.';
}
