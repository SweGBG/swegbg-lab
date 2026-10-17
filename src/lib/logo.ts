/**
 * Logo clean-up, in the browser (nothing leaves the visitor's computer).
 *
 *  - analyse():  looks at the outer edge of the logo. If the edge is (almost) one colour, the logo
 *                sits on a flat background that we can remove.
 *  - process():  removes that background with a flood fill from the edges (so the same colour inside
 *                the logo is kept), with soft edges; trims empty space; optional round / soft-square frame.
 *
 * It is not AI cut-out – it is made for what logos usually are: a mark on a flat colour (JPG/PNG
 * exports, screenshots of a profile picture). Photos with busy backgrounds are left alone.
 */
export type Shape = "fri" | "rund" | "ruta";
export type LogoInfo = { bg: [number, number, number] | null; uniform: number; transparent: boolean };
export type LogoOut = { url: string; blob: Blob };

const MAX = 900;

async function load(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const r = Math.min(1, MAX / Math.max(img.naturalWidth || MAX, img.naturalHeight || MAX));
  const w = Math.max(1, Math.round((img.naturalWidth || MAX) * r));
  const h = Math.max(1, Math.round((img.naturalHeight || MAX) * r));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, w, h);
  return { c, g, w, h, d: g.getImageData(0, 0, w, h) };
}

const dist = (d: Uint8ClampedArray, i: number, bg: number[]) =>
  Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);

/** What does the edge of the logo look like? */
export async function analyse(src: string): Promise<LogoInfo> {
  const { d, w, h } = await load(src);
  const px = d.data;
  const edge: number[] = [];
  let clear = 0;
  const step = Math.max(1, Math.floor((w + h) / 400));
  const take = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    if (px[i + 3] < 40) clear++;
    else edge.push(i);
  };
  for (let x = 0; x < w; x += step) { take(x, 0); take(x, h - 1); }
  for (let y = 0; y < h; y += step) { take(0, y); take(w - 1, y); }
  const total = edge.length + clear;
  if (clear / total > 0.6) return { bg: null, uniform: 0, transparent: true };
  // most common edge colour (coarse buckets), then its average
  const buckets = new Map<number, number[]>();
  for (const i of edge) {
    const k = ((px[i] >> 5) << 6) | ((px[i + 1] >> 5) << 3) | (px[i + 2] >> 5);
    const b = buckets.get(k) ?? [0, 0, 0, 0];
    b[0]++; b[1] += px[i]; b[2] += px[i + 1]; b[3] += px[i + 2];
    buckets.set(k, b);
  }
  const top = [...buckets.values()].sort((a, b) => b[0] - a[0])[0];
  const bg: [number, number, number] = [top[1] / top[0], top[2] / top[0], top[3] / top[0]];
  const close = edge.filter((i) => dist(px, i, bg) < 38).length;
  return { bg, uniform: close / Math.max(1, edge.length), transparent: false };
}

/**
 * strength 0..1: how far from the background colour still counts as background.
 * The fill only spreads from the edges, so a dark detail inside a dark-background logo survives
 * as long as it is not connected to the edge.
 */
export async function process(
  src: string,
  { removeBg, bg, strength = 0.5, shape = "fri" }: { removeBg: boolean; bg: number[] | null; strength?: number; shape?: Shape },
): Promise<LogoOut> {
  const { c, g, d, w, h } = await load(src);
  const px = d.data;

  if (removeBg && bg) {
    const tol = 18 + strength * 70; // fully removed below this distance
    const soft = tol * 0.75; // and faded out over this band → soft, anti-aliased edges
    const seen = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    const push = (p: number) => {
      if (seen[p]) return;
      seen[p] = 1;
      const i = p * 4;
      if (px[i + 3] < 8) { q[qt++] = p; return; }
      const dd = dist(px, i, bg);
      if (dd >= tol + soft) return; // logo pixel: stop here
      const a = dd <= tol ? 0 : (dd - tol) / soft;
      // un-mix the background out of edge pixels, so no dark/white fringe stays around the logo
      if (a > 0 && a < 1) {
        for (let k = 0; k < 3; k++) px[i + k] = Math.max(0, Math.min(255, (px[i + k] - bg[k] * (1 - a)) / a));
      }
      px[i + 3] = Math.round(px[i + 3] * a);
      if (dd <= tol) q[qt++] = p; // only spread through real background
    };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
    while (qh < qt) {
      const p = q[qh++], x = p % w, y = (p / w) | 0;
      if (x > 0) push(p - 1);
      if (x < w - 1) push(p + 1);
      if (y > 0) push(p - w);
      if (y < h - 1) push(p + w);
    }
    g.putImageData(d, 0, 0);
  }

  // trim empty space around the logo
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  const data = g.getImageData(0, 0, w, h).data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 24) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  const out = document.createElement("canvas");
  const og = out.getContext("2d")!;
  if (shape === "fri") {
    const pad = Math.round(Math.max(cw, ch) * 0.03);
    out.width = cw + pad * 2;
    out.height = ch + pad * 2;
    og.drawImage(c, x0, y0, cw, ch, pad, pad, cw, ch);
  } else {
    // a frame: square canvas, logo centred. With the background kept, the logo fills the frame
    // (like a profile picture); without it, the logo sits inside with breathing room.
    const S = Math.max(cw, ch);
    out.width = out.height = S;
    og.save();
    og.beginPath();
    if (shape === "rund") og.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    else og.roundRect(0, 0, S, S, S * 0.2);
    og.clip();
    if (removeBg && bg) {
      const inner = 0.78, k = (S * inner) / S;
      og.fillStyle = "rgba(255,255,255,.06)";
      og.fillRect(0, 0, S, S);
      og.drawImage(c, x0, y0, cw, ch, (S - cw * k) / 2, (S - ch * k) / 2, cw * k, ch * k);
    } else {
      const k = S / Math.min(cw, ch); // cover
      og.drawImage(c, x0, y0, cw, ch, (S - cw * k) / 2, (S - ch * k) / 2, cw * k, ch * k);
    }
    og.restore();
    // thin rim so the frame reads on any background
    og.lineWidth = Math.max(2, S * 0.012);
    og.strokeStyle = "rgba(255,255,255,.22)";
    og.beginPath();
    if (shape === "rund") og.arc(S / 2, S / 2, S / 2 - og.lineWidth / 2, 0, Math.PI * 2);
    else og.roundRect(og.lineWidth / 2, og.lineWidth / 2, S - og.lineWidth, S - og.lineWidth, S * 0.2);
    og.stroke();
  }
  const blob: Blob = await new Promise((res) => out.toBlob((b) => res(b!), "image/png"));
  return { url: URL.createObjectURL(blob), blob };
}
