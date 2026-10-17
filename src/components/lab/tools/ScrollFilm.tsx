"use client";
import { useEffect, useRef, useState } from "react";
import FileDrop from "../FileDrop";
import { drawCover, framesFromSequence, framesFromVideo, type FrameStore } from "@/lib/frames";

/*
 * Scrollfilm: drag through a H3 film the way it will play on the site. The visitor drops their own
 * mp4 (read locally, turned into frames in the browser) or picks one of SweGBG's demo films.
 * Scrub with the slider, the mouse wheel / trackpad over the preview, or by dragging on it.
 * The drawing uses the same game loop as the real sites: requestAnimationFrame + a time-based glide.
 */
const DEMOS = [
  { id: "pizza", name: "Pizzeria", desc: "Deg → tomat → eld → pizza", pattern: "/demo/pizza/f%03d.webp", count: 128, chapters: ["Impasto", "Pomodoro", "Fuoco", "Anima"] },
  { id: "kol", name: "Coal is King", desc: "Kol → kött → eld → kungen", pattern: "/demo/kol/f%03d.webp", count: 128, chapters: ["Glöd", "Kött", "Eld", "Kungen"] },
  { id: "protein", name: "SweProtein", desc: "Bär → shake → flaska", pattern: "/demo/protein/f%03d.webp", count: 128, chapters: ["Bäret", "Faller", "Virveln", "Flaskan"] },
];

type Src = { kind: "demo"; id: string } | { kind: "file"; name: string; size: number };

export default function ScrollFilm() {
  const [src, setSrc] = useState<Src>({ kind: "demo", id: "pizza" });
  const [frames, setFrames] = useState<FrameStore | null>(null);
  const [mb, setMb] = useState(0);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("Pizza av själen.");
  const [p, setP] = useState(0); // target 0..1
  const [auto, setAuto] = useState(false);
  const [fps, setFps] = useState(60);
  const target = useRef(0);
  const desk = useRef<HTMLCanvasElement>(null);
  const phone = useRef<HTMLCanvasElement>(null);
  const shown = useRef<HTMLDivElement>(null);
  const objUrl = useRef<string | null>(null);
  const autoRef = useRef(auto);
  autoRef.current = auto;

  // load the chosen film into frames (demo sequence or the visitor's own mp4)
  useEffect(() => {
    const ac = new AbortController();
    setFrames(null);
    setProg(0);
    setErr("");
    (async () => {
      try {
        const f = src.kind === "demo"
          ? await framesFromSequence(DEMOS.find((d) => d.id === src.id)!.pattern, DEMOS.find((d) => d.id === src.id)!.count, { onProgress: setProg, signal: ac.signal })
          : await framesFromVideo(objUrl.current!, { count: 120, maxW: 720, onProgress: setProg, signal: ac.signal });
        if (!ac.signal.aborted) setFrames(f); else f.dispose();
      } catch (e) {
        if (!ac.signal.aborted) setErr(e instanceof Error ? e.message : "Filmen gick inte att läsa.");
      }
    })();
    return () => ac.abort();
  }, [src]);
  useEffect(() => () => frames?.dispose(), [frames]);

  useEffect(() => { target.current = p; }, [p]);

  // the game loop: glide toward the target, draw only when the frame changes
  useEffect(() => {
    if (!frames) return;
    let raf = 0, cur = target.current, last = performance.now(), acc = 0, n = 0;
    let lastImg: ImageBitmap | null = null;
    const fit = (cv: HTMLCanvasElement | null) => {
      if (!cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(cv.clientWidth * dpr), h = Math.round(cv.clientHeight * dpr);
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; lastImg = null; }
    };
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt; n++;
      if (acc > 0.5) { setFps(Math.min(60, Math.round(n / acc))); setMb(Math.round(frames.decodedBytes / 1048576)); acc = 0; n = 0; }
      if (autoRef.current) {
        target.current = (target.current + dt / 9) % 1.0001;
        setP(target.current);
      }
      cur += (target.current - cur) * (1 - Math.pow(0.88, dt * 60));
      if (Math.abs(target.current - cur) < 0.0002) cur = target.current;
      const idx = Math.round(Math.min(1, Math.max(0, cur)) * (frames.count - 1));
      fit(desk.current); fit(phone.current);
      frames.want(idx);
      const img = frames.nearest(idx);
      if (img && img !== lastImg) {
        lastImg = img;
        for (const cv of [desk.current, phone.current]) {
          const g = cv?.getContext("2d");
          if (cv && g) drawCover(g, img, cv.width, cv.height);
        }
        if (shown.current) shown.current.textContent = `${idx + 1} / ${frames.count}`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [frames]);

  const nudge = (d: number) => { setAuto(false); setP((v) => Math.min(1, Math.max(0, v + d))); };
  const drag = useRef<{ y: number; p: number } | null>(null);

  const onFile = (f: File) => {
    if (!f.type.startsWith("video/")) return setErr("Välj en videofil (mp4).");
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    objUrl.current = URL.createObjectURL(f); // read locally, never uploaded
    setTitle(f.name.replace(/\.[^.]+$/, ""));
    setP(0);
    setSrc({ kind: "file", name: f.name, size: f.size });
  };

  const demo = src.kind === "demo" ? DEMOS.find((d) => d.id === src.id)! : null;
  const chapters = demo?.chapters ?? ["Start", "Del 2", "Del 3", "Final"];
  const chapter = Math.min(3, Math.floor(p * 4));

  const scrubProps = {
    onWheel: (e: React.WheelEvent) => nudge(e.deltaY / 2400),
    onPointerDown: (e: React.PointerEvent) => { setAuto(false); drag.current = { y: e.clientY, p }; (e.target as Element).setPointerCapture?.(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { if (drag.current) setP(Math.min(1, Math.max(0, drag.current.p + (drag.current.y - e.clientY) / 500))); },
    onPointerUp: () => { drag.current = null; },
  };

  return (
    <>
      <header className="tool-head">
        <div><div className="k">{"// VERKTYG 02 · H3"}</div><h1>Scrollfilm</h1></div>
        <span className="muted mono hide-sm">scrolla, dra eller använd reglaget</span>
      </header>

      <div className="work">
        <div className="ctrl">
          <section>
            <div className="h">01 · VÄLJ FILM</div>
            <div className="demos">
              {DEMOS.map((d) => (
                <button key={d.id} className={`demo${src.kind === "demo" && src.id === d.id ? " on" : ""}`}
                  onClick={() => { setP(0); setTitle(d.id === "pizza" ? "Pizza av själen." : d.id === "kol" ? "Kol är kung." : "Drick styrkan."); setSrc({ kind: "demo", id: d.id }); }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.pattern.replace("%03d", "064")} alt="" />
                  <span><b>{d.name}</b><small>{d.desc}</small></span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="h">02 · ELLER DIN EGEN</div>
            <FileDrop accept="video/*" label="Släpp din film här" hint="MP4 (H.264) · stannar på din dator"
              file={src.kind === "file" ? src : null} onFile={onFile} />
          </section>
          <section>
            <div className="h">03 · RUBRIK PÅ FILMEN</div>
            <label className="inp"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} /></label>
          </section>
          <section>
            <div className="h">04 · SCROLLA</div>
            <input className="range" type="range" min={0} max={1} step={0.001} value={p}
              onChange={(e) => { setAuto(false); setP(+e.target.value); }} aria-label="Position i filmen" />
            <div className="chaps">
              {chapters.map((c, i) => (
                <button key={c} className={i === chapter ? "on" : ""} onClick={() => { setAuto(false); setP(i / 4 + 0.06); }}>
                  <b>0{i + 1}</b> {c}
                </button>
              ))}
            </div>
            <button className={`btn wide${auto ? " p" : ""}`} onClick={() => setAuto((a) => !a)}>{auto ? "Pausa" : "Spela som en scroll"}</button>
          </section>
        </div>

        <div className="stage">
          <div className="devices">
            <figure className="desk">
              <div className="scr film" {...scrubProps}>
                <canvas ref={desk} />
                <div className="film-shade" />
                <div className="film-txt"><small>{chapters[chapter]}</small><b>{title}</b></div>
                {!frames && <Loading prog={prog} err={err} />}
              </div>
              <figcaption>DATOR</figcaption>
            </figure>
            <figure className="phone">
              <div className="scr film" {...scrubProps}>
                <canvas ref={phone} />
                <div className="film-shade" />
                <div className="film-bars">{chapters.map((c, i) => <i key={c} style={{ ["--f" as string]: Math.min(1, Math.max(0, p * 4 - i)) }} />)}</div>
                <div className="film-txt sm"><small>{chapters[chapter]}</small><b>{title}</b></div>
                {!frames && <Loading prog={prog} err={err} />}
              </div>
              <figcaption>MOBIL</figcaption>
            </figure>
          </div>
          <div className="meters">
            <div className="mc"><small>RUTA</small><b><span ref={shown}>…</span></b></div>
            <div className="mc"><small>MINNE</small><b>{frames ? mb : "…"}<em>MB</em></b></div>
            <div className="mc"><small>BILDER/S</small><b className="gold-t">{fps}<em>fps</em></b></div>
            <div className="mc"><small>UPPLADDAT</small><b className="ok">0<em>byte</em></b></div>
          </div>
        </div>
      </div>

      <footer className="tool-foot">
        <p>Vi gör din egen film i MiniMax H3, scrollstyrd på din sajt, med CRiNTRO så den aldrig hackar.</p>
        <a className="btn p" href="https://swegbg.com/#kontakt" target="_blank" rel="noopener">Jag vill ha en egen film →</a>
      </footer>
    </>
  );
}

function Loading({ prog, err }: { prog: number; err: string }) {
  return (
    <div className="film-load">
      {err ? <p className="err">{err}</p> : (
        <>
          <div className="cp-track"><div className="cp-fill" style={{ transform: `scaleX(${prog})` }} /></div>
          <p className="mono muted">Packar upp filmen i din webbläsare … {Math.round(prog * 100)}%</p>
        </>
      )}
    </div>
  );
}
