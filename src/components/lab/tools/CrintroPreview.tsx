"use client";
import { useEffect, useRef, useState } from "react";
import type { RuleStyle } from "@/lib/rules";
import { lightness } from "@/lib/palette";

/*
 * The CRiNTRO loader exactly as it runs on the real sites (SweProtein, Coal is King, the pizzeria),
 * but driven by props and a simulated network instead of a real H3 film. The rule follows the same
 * three rules: never ahead of its own animation, never ahead of the "loading", never backwards.
 */
export type IntroConfig = {
  logo: string | null;
  w1: string;
  w2: string;
  sub: string;
  rule: RuleStyle;
  bg: string;
  accent: string;
  tempo: number; // seconds until the curtain at the earliest (MIN)
};

export type Measure = { curtain: number; loaded: number };

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

/**
 * hold: extra seconds the logo stays on screen after the intro is ready (Lab only, so the visitor can
 * look at their logo). Infinity = stays until releaseKey changes. The measured "curtain" is always the
 * time the real site would release, without the extra hold.
 */
export default function CrintroPreview({
  cfg, netLoad, playKey, compact = false, onMeasure, hold = 0, releaseKey = 0, onHolding,
}: {
  cfg: IntroConfig; netLoad: number; playKey: number; compact?: boolean; onMeasure?: (m: Measure) => void;
  hold?: number; releaseKey?: number; onHolding?: (h: boolean) => void;
}) {
  const fill = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [out, setOut] = useState(false);
  const measure = useRef(onMeasure);
  measure.current = onMeasure;
  const holding = useRef(onHolding);
  holding.current = onHolding;
  const released = useRef(false);
  const firstRelease = useRef(releaseKey);
  useEffect(() => {
    if (releaseKey !== firstRelease.current) released.current = true;
  }, [releaseKey]);

  useEffect(() => {
    setOut(false);
    released.current = false;
    firstRelease.current = releaseKey;
    const MIN = cfg.tempo, RULE_START = 0.45, RULE_END = Math.max(RULE_START + 0.5, cfg.tempo - 0.4), MAX = cfg.tempo + 1.7;
    const t0 = performance.now();
    let shown = 0, raf = 0, last = t0, done = false, ready = -1, held = false;
    const loadedAt = (s: number) => Math.min(1, s / netLoad); // simulated "film opening loaded"
    const tick = (now: number) => {
      const s = (now - t0) / 1000;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const crit = loadedAt(s);
      const natural = ease((s - RULE_START) / (RULE_END - RULE_START));
      const forced = s >= MAX;
      const loaded = crit >= 1 ? 1 : Math.min(0.97, crit);
      const target = forced ? 1 : Math.min(natural, loaded);
      const k = 1 - Math.pow(forced ? 1e-9 : 1e-5, dt);
      shown = Math.max(shown, shown + (target - shown) * k);
      if (fill.current) fill.current.style.transform = `scaleX(${shown.toFixed(4)})`;
      if (tip.current) {
        tip.current.style.transform = `translateX(${(shown * 100).toFixed(2)}cqw)`;
        tip.current.style.opacity = shown > 0.01 && shown < 0.995 ? "1" : "0";
      }
      root.current?.classList.toggle("cp-wait", s > MIN && crit < 1 && !forced);
      if (ready < 0 && s >= MIN && shown > 0.995) {
        ready = s; // the real site releases here
        measure.current?.({ curtain: s, loaded: Math.round(crit * 100) });
      }
      if (ready >= 0 && !done) {
        const go = released.current || (hold !== Infinity && s >= ready + hold);
        if (!go && hold === Infinity && !held) { held = true; holding.current?.(true); }
        if (go) {
          done = true;
          if (held) holding.current?.(false);
          setOut(true);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); if (held) holding.current?.(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey, netLoad, cfg.tempo, hold]);

  const light = lightness(cfg.bg) > 0.6;
  const ink = light ? "#1b1712" : "#f5ecdc";
  const vars = {
    "--cp-bg": cfg.bg,
    "--cp-ink": ink,
    "--cp-mut": light ? "rgba(27,23,18,.6)" : "rgba(245,236,220,.62)",
    "--cp-accent": cfg.accent,
    "--cp-fill": cfg.rule.fill,
    "--cp-glow": cfg.rule.glow,
    "--cp-tip": cfg.rule.tip,
  } as React.CSSProperties;

  return (
    <div className={`cp${compact ? " cp-sm" : ""}${out ? " cp-done" : ""}`} style={vars} key={playKey}>
      {/* what is behind the curtain: a placeholder for the visitor's own site + H3 film */}
      <div className="cp-site" aria-hidden>
        <div className="cp-site-film" />
        <div className="cp-site-text">
          <small>{cfg.sub || "Din sajt"}</small>
          <b>{cfg.w1} <em>{cfg.w2}</em></b>
          <span>Här startar din H3-film</span>
        </div>
      </div>
      <div ref={root} className={`cp-loader${out ? " cp-out" : ""}`}>
        <div className="cp-inner">
          {cfg.logo && (
            <div className="cp-logo">
              <span className="cp-glow" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cfg.logo} alt="" />
            </div>
          )}
          <p className="cp-word">
            {cfg.w1 && <span className="cp-w1">{cfg.w1}</span>} {cfg.w2 && <em className="cp-w2">{cfg.w2}</em>}
          </p>
          <div className="cp-track">
            <div className="cp-fill" ref={fill} />
            <span className="cp-tip" ref={tip} />
          </div>
          {cfg.sub && <p className="cp-sub">{cfg.sub}</p>}
        </div>
      </div>
    </div>
  );
}
