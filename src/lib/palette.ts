/**
 * Picks the main colours out of a logo, in the browser (nothing leaves the visitor's computer).
 * The image is drawn small onto a canvas, near-transparent / near-white / near-black pixels are
 * skipped, the rest is bucketed by colour and the biggest distinct buckets win.
 */
export async function paletteFrom(url: string, count = 4): Promise<string[]> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const S = 64;
  const c = document.createElement("canvas");
  const r = Math.min(1, S / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * r));
  c.height = Math.max(1, Math.round(img.naturalHeight * r));
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const { data } = g.getImageData(0, 0, c.width, c.height);

  const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const [R, G, B, A] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (A < 160) continue;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    if (max > 245 && min > 235) continue; // paper white
    if (max < 18) continue; // pure black
    const key = ((R >> 4) << 8) | ((G >> 4) << 4) | (B >> 4);
    const b = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
    b.n++; b.r += R; b.g += G; b.b += B;
    buckets.set(key, b);
  }
  const sorted = [...buckets.values()].sort((a, b) => b.n - a.n).map((b) => [b.r / b.n, b.g / b.n, b.b / b.n]);
  const out: number[][] = [];
  for (const col of sorted) {
    if (out.every((o) => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 60)) out.push(col);
    if (out.length >= count) break;
  }
  return out.map(hex);
}

export const hex = ([r, g, b]: number[]) =>
  "#" + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");

export function rgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceived lightness 0..1, used to pick light or dark text on a background. */
export function lightness(h: string) {
  const [r, g, b] = rgb(h);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** The most saturated colour of a palette that also reads on a dark background (a good accent). */
export function accentOf(colors: string[]) {
  let best = colors[0] ?? "#f2b544", sat = -1;
  for (const c of colors) {
    const [r, g, b] = rgb(c);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const s = max === 0 ? 0 : (max - min) / max;
    const l = (max + min) / 510;
    // too dark to read on a dark loader screen → lift it towards a readable tone
    const score = s * (1 - Math.abs(l - 0.58)) * (lightness(c) < 0.32 ? 0.35 : 1);
    if (score > sat) { sat = score; best = c; }
  }
  return lightness(best) < 0.32 ? lift(best, 0.42) : best;
}

/** Mix a colour towards white until it is readable. */
export function lift(h: string, amount: number) {
  const [r, g, b] = rgb(h);
  return hex([r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount]);
}
