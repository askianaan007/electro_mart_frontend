'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { Camera, CameraOff, Check, Flashlight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cameraErrorMessage, cameraUnavailableReason, getCodeDetector } from '@/lib/camera-barcode';
import { cleanSerial, scanBeep, serialKey } from '@/lib/serial';

const SCAN_INTERVAL_MS = 120;
// A code must show up in two frames in a row before it counts — cuts misreads.
const STABLE_FRAMES = 2;
// In multi mode, the same label staying in view isn't scanned again.
const REPEAT_COOLDOWN_MS = 2500;

type Props = {
  title?: string;
  description?: string;
  /** single: close after the first code. multi: keep scanning, one code per label. */
  mode: 'single' | 'multi';
  onDetect: (code: string) => void;
  /** Codes already taken (e.g. serials in the list) — skipped without a beep. */
  ignore?: string[];
};

/**
 * Scan barcodes with the device camera — made for an iPhone/Android held over
 * the S/N label. Content unmounts on close, which stops the camera.
 */
export function CameraScanDialog({
  open,
  onOpenChange,
  ...props
}: Props & { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={props.title ?? 'Scan with camera'} className="gap-3 p-4 sm:max-w-md">
        <CameraScanBody {...props} close={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CameraScanBody({
  title = 'Scan with camera',
  description = 'Point the camera at the serial number (S/N) barcode.',
  mode,
  onDetect,
  ignore,
  close,
}: Props & { close: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>(() =>
    cameraUnavailableReason() ? 'error' : 'starting',
  );
  const [error, setError] = useState<string | null>(() => cameraUnavailableReason());
  const [choices, setChoices] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>([]);
  const [torch, setTorch] = useState<boolean | null>(null);

  // Read through an effect event so the scan loop always sees the latest props.
  const shouldSkip = useEffectEvent((key: string) => (ignore ?? []).some((code) => serialKey(code) === key));
  const accept = useEffectEvent((code: string) => {
    scanBeep(true);
    navigator.vibrate?.(60);
    onDetect(code);
    if (mode === 'single') close();
    else setTaken((list) => [code, ...list].slice(0, 5));
  });
  const offerChoice = useEffectEvent((codes: string[]) => setChoices(codes));
  const paused = useEffectEvent(() => choices.length > 0);

  useEffect(() => {
    if (cameraUnavailableReason()) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stream: MediaStream | null = null;
    let lastSeen = '';
    let seenCount = 0;
    const recent = new Map<string, number>();

    async function start() {
      try {
        const [media, detector] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          }),
          getCodeDetector(),
        ]);
        if (cancelled) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = media;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = media;
        await video.play();
        const track = media.getVideoTracks()[0] ?? null;
        trackRef.current = track;
        const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
        if (caps.torch) setTorch(false);
        setStatus('scanning');

        const tick = async () => {
          if (cancelled) return;
          if (!paused() && video.readyState >= 2) {
            try {
              const found = await detector.detect(video);
              const now = Date.now();
              const codes = [...new Set(found.map((f) => cleanSerial(f.rawValue)).filter(Boolean))].filter((code) => {
                const key = serialKey(code);
                return !shouldSkip(key) && now - (recent.get(key) ?? 0) > REPEAT_COOLDOWN_MS;
              });
              const signature = [...codes].sort().join('\n');
              seenCount = signature && signature === lastSeen ? seenCount + 1 : signature ? 1 : 0;
              lastSeen = signature;
              if (seenCount >= STABLE_FRAMES) {
                seenCount = 0;
                for (const code of codes) recent.set(serialKey(code), now);
                if (codes.length === 1) accept(codes[0]);
                else offerChoice(codes);
              }
            } catch {
              // A bad frame — keep going.
            }
          }
          if (!cancelled) timer = setTimeout(tick, SCAN_INTERVAL_MS);
        };
        void tick();
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof DOMException ? cameraErrorMessage(err) : 'Could not load the barcode reader.');
        setStatus('error');
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, []);

  async function toggleTorch() {
    const track = trackRef.current;
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {
      setTorch(null);
    }
  }

  function pick(code: string) {
    setChoices([]);
    scanBeep(true);
    onDetect(code);
    if (mode === 'single') close();
    else setTaken((list) => [code, ...list].slice(0, 5));
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
        {/* playsInline + muted keep iOS Safari from opening a fullscreen player. */}
        <video ref={videoRef} playsInline muted autoPlay className="size-full object-cover" />
        {status === 'scanning' && (
          <div className="pointer-events-none absolute inset-x-6 top-1/2 h-1/3 -translate-y-1/2 rounded-md border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-red-500/80" />
          </div>
        )}
        {status === 'starting' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-white/80">
            <Loader2 className="size-6 animate-spin" />
            Starting camera…
          </div>
        )}
        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/90">
            <CameraOff className="size-6" />
            {error}
          </div>
        )}
        {torch !== null && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="absolute bottom-2 right-2"
            onClick={() => void toggleTorch()}
          >
            <Flashlight />
            {torch ? 'Light off' : 'Light'}
          </Button>
        )}
      </div>

      {choices.length > 0 ? (
        <div className="space-y-2 rounded-md border border-warning/40 bg-warning/5 p-2">
          <p className="text-xs text-foreground">
            {choices.length} barcodes in view — tap the serial number (usually marked S/N):
          </p>
          <div className="flex flex-wrap gap-2">
            {choices.map((code) => (
              <Button
                key={code}
                type="button"
                size="sm"
                variant="outline"
                className="font-mono"
                onClick={() => pick(code)}
              >
                {code}
              </Button>
            ))}
            <Button type="button" size="sm" variant="ghost" onClick={() => setChoices([])}>
              Rescan
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Hold 10–20 cm away with only the S/N barcode inside the box. In poor light, turn on more light.
        </p>
      )}

      {mode === 'multi' && taken.length > 0 && (
        <ul className="space-y-1">
          {taken.map((code, i) => (
            <li key={`${code}-${i}`} className="flex items-center gap-2 font-mono text-xs text-foreground">
              <Check className="size-3.5 text-success" />
              {code}
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button type="button" variant={mode === 'multi' ? 'default' : 'outline'} onClick={close}>
          {mode === 'multi' ? <Check /> : <Camera />}
          {mode === 'multi' ? 'Done' : 'Cancel'}
        </Button>
      </div>
    </>
  );
}
