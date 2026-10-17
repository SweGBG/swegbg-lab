/**
 * Film → still frames, entirely in the browser. The visitor's mp4 is never uploaded: it is opened
 * from their disk with an object URL, seeked frame by frame into a canvas and stored as small
 * compressed WebP blobs. Like the CRiNTRO Loader on the real sites, only the frames near the scroll
 * position are decoded into bitmaps ("texture streaming"), so memory stays low even on a phone.
 */
export class FrameStore {
  blobs: Blob[];
  width: number;
  height: number;
  private bitmaps = new Map<number, ImageBitmap>();
  private decoding = new Set<number>();
  private center = 0;
  static WINDOW = 10; // decoded frames each side of the scroll position
  static ANCHOR = 16; // every Nth frame stays decoded, so a fast flick always has something near

  constructor(blobs: Blob[], width: number, height: number) {
    this.blobs = blobs;
    this.width = width;
    this.height = height;
  }

  get count() { return this.blobs.length; }

  /** Bytes held as decoded bitmaps right now. */
  get decodedBytes() { return this.bitmaps.size * this.width * this.height * 4; }

  private keep(i: number) { return i % FrameStore.ANCHOR === 0 || Math.abs(i - this.center) <= FrameStore.WINDOW; }

  /** Tell the store where the viewer is; it decodes nearby frames and frees far ones. */
  want(i: number) {
    this.center = i;
    for (const [k, b] of this.bitmaps) if (!this.keep(k)) { b.close(); this.bitmaps.delete(k); }
    const order = [i];
    for (let d = 1; d <= FrameStore.WINDOW; d++) order.push(i + d, i - d);
    for (let k = 0; k < this.count; k += FrameStore.ANCHOR) order.push(k);
    for (const k of order) {
      if (this.decoding.size >= 3) break;
      if (k < 0 || k >= this.count || this.bitmaps.has(k) || this.decoding.has(k)) continue;
      this.decoding.add(k);
      createImageBitmap(this.blobs[k]).then((b) => {
        this.decoding.delete(k);
        if (this.keep(k)) this.bitmaps.set(k, b); else b.close();
        this.want(this.center);
      }).catch(() => this.decoding.delete(k));
    }
  }

  /** The decoded frame closest to i. */
  nearest(i: number): ImageBitmap | null {
    for (let d = 0; d < this.count; d++) {
      const a = this.bitmaps.get(i - d) ?? this.bitmaps.get(i + d);
      if (a) return a;
    }
    return null;
  }

  dispose() { for (const b of this.bitmaps.values()) b.close(); this.bitmaps.clear(); }
}

export async function framesFromVideo(
  url: string,
  opts: { count?: number; maxW?: number; onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<FrameStore> {
  const { count = 120, maxW = 720, onProgress, signal } = opts;
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((res, rej) => {
    v.onloadeddata = () => res();
    v.onerror = () => rej(new Error("Filmen gick inte att öppna. Prova en mp4 med H.264."));
  });
  const scale = Math.min(1, maxW / v.videoWidth);
  const w = Math.round(v.videoWidth * scale), h = Math.round(v.videoHeight * scale);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const n = Math.max(8, Math.min(count, Math.round(v.duration * 6)));
  const blobs: Blob[] = [];
  for (let i = 0; i < n; i++) {
    if (signal?.aborted) break;
    const t = Math.min(v.duration - 0.05, (i / (n - 1)) * v.duration);
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      v.currentTime = t;
    });
    g.drawImage(v, 0, 0, w, h);
    blobs.push(await new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/webp", 0.82)));
    onProgress?.((i + 1) / n);
  }
  return new FrameStore(blobs, w, h);
}

/** A demo film that is already a frame sequence (same files as the real sites' mobile version). */
export async function framesFromSequence(
  pattern: string,
  count: number,
  opts: { onProgress?: (p: number) => void; signal?: AbortSignal } = {},
): Promise<FrameStore> {
  const blobs: Blob[] = new Array(count);
  let done = 0;
  const queue = [...Array(count).keys()];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (queue.length && !opts.signal?.aborted) {
      const i = queue.shift()!;
      const r = await fetch(pattern.replace("%03d", String(i + 1).padStart(3, "0")), { signal: opts.signal });
      blobs[i] = await r.blob();
      opts.onProgress?.(++done / count);
    }
  }));
  const first = await createImageBitmap(blobs[0]);
  const store = new FrameStore(blobs.filter(Boolean), first.width, first.height);
  first.close();
  return store;
}

/** Draw a frame like CSS object-fit: cover. */
export function drawCover(g: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, W: number, H: number) {
  const s = Math.max(W / img.width, H / img.height);
  const w = img.width * s, h = img.height * s;
  g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}
