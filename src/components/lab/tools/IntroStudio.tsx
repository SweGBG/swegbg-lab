"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import FileDrop from "../FileDrop";
import CrintroPreview, { type IntroConfig, type Measure } from "./CrintroPreview";
import { NETS, RULES, ruleById, type NetId } from "@/lib/rules";
import { accentOf, paletteFrom } from "@/lib/palette";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type ShowId = "kort" | "lang" | "hall";
/** How long the logo stays after the intro is ready. "Kort" is exactly what the real site does. */
const SHOW: { id: ShowId; name: string; hold: number; note: string }[] = [
  { id: "kort", name: "Kort", hold: 0, note: "Exakt som på sajten" },
  { id: "lang", name: "Lång", hold: 2.5, note: "Loggan stannar 2,5 s extra, bara här i Lab" },
  { id: "hall", name: "Håll kvar", hold: Infinity, note: "Introt väntar tills du klickar" },
];

/** Intro-studion ("Crink"): your own CRiNTRO loading intro, live, from your logo. */
export default function IntroStudio({ user, onLogin }: { user: User | null; onLogin: () => void }) {
  const [logo, setLogo] = useState<string | null>("/demo/logo-solkvist.svg");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [colors, setColors] = useState<string[]>(["#8a5a2b", "#d79a4e", "#f6efe2", "#ffb35c"]);
  const [w1, setW1] = useState("Bageri");
  const [w2, setW2] = useState("Solkvist");
  const [sub, setSub] = useState("Surdeg · Majorna · Sedan 2019");
  const [ruleId, setRuleId] = useState("ugn");
  const [bg, setBg] = useState("#1a120c");
  const [accent, setAccent] = useState("#ffb35c");
  const [tempo, setTempo] = useState(1.9);
  const [net, setNet] = useState<NetId>("4g");
  const [show, setShow] = useState<ShowId>("lang");
  const [release, setRelease] = useState(0);
  const [holding, setHolding] = useState(false);
  const [play, setPlay] = useState(0);
  const [tab, setTab] = useState<"studio" | "kod">("studio");
  const [m, setM] = useState<Measure | null>(null);
  const [saved, setSaved] = useState<string>("");
  const objUrl = useRef<string | null>(null);

  const rule = ruleById(ruleId);
  const cfg: IntroConfig = { logo, w1, w2, sub, rule, bg, accent, tempo };
  const netLoad = NETS.find((n) => n.id === net)!.load;
  const hold = SHOW.find((x) => x.id === show)!.hold;
  const letGo = () => setRelease((r) => r + 1);

  // replay shortly after every change, so the preview always shows the current settings
  const sig = JSON.stringify({ logo, w1, w2, sub, ruleId, bg, accent, tempo, net, show });
  useEffect(() => {
    setM(null);
    const id = setTimeout(() => setPlay((p) => p + 1), 350);
    return () => clearTimeout(id);
  }, [sig]);

  const onFile = async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    const url = URL.createObjectURL(f); // read locally, never uploaded
    objUrl.current = url;
    setLogo(url);
    setFile({ name: f.name, size: f.size });
    try {
      const pal = await paletteFrom(url, 4);
      if (pal.length) {
        setColors(pal);
        setAccent(accentOf(pal));
      }
    } catch { /* keep the old colours */ }
  };

  const code = useMemo(() => `// CRiNTRO Loader – dina inställningar
const WORD = ["${w1}", "${w2}"];      // ord 2 får accentfärgen
const SUB  = "${sub}";
const MIN  = ${tempo.toFixed(1)};  // sekunder (med cache)
const MAX  = ${(tempo + 1.7).toFixed(1)};  // sekunder (dåligt nät)

/* CrintroLoader.module.css */
.loader { background: ${bg}; }
.accent { color: ${accent}; }
.fill   { background: ${rule.fill};
          box-shadow: 0 0 12px ${rule.glow}; }
.tip    { /* ${rule.hint} */ }

// + lib/crintro.ts laddar din H3-film i bakgrunden
//   (prioriterad ordning, texture streaming på mobil)`, [w1, w2, sub, tempo, bg, accent, rule]);

  const save = async () => {
    const sb = supabase();
    if (!sb || !user) return onLogin();
    setSaved("Sparar …");
    const { error } = await sb.from("lab_intros").insert({
      user_id: user.id,
      name: `${w1} ${w2}`.trim() || "Mitt intro",
      settings: { w1, w2, sub, ruleId, bg, accent, tempo, colors }, // never the logo file itself
    });
    setSaved(error ? "Kunde inte spara" : "Sparat ✓");
    setTimeout(() => setSaved(""), 2500);
  };

  return (
    <>
      <header className="tool-head">
        <div><div className="k">{"// VERKTYG 01 · CRINK"}</div><h1>Intro-studion</h1></div>
        <div className="seg" role="tablist">
          <button className={tab === "studio" ? "on" : ""} onClick={() => setTab("studio")}>Studio</button>
          <button className={tab === "kod" ? "on" : ""} onClick={() => setTab("kod")}>Kod</button>
        </div>
      </header>

      <div className="work">
        <div className="ctrl">
          <section>
            <div className="h">01 · DIN LOGGA</div>
            <FileDrop
              accept="image/*" label="Välj eller släpp din logga" hint="PNG, SVG, JPG eller WebP" file={file} onFile={onFile}
              thumb={logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" /> : undefined}
            />
          </section>
          <section>
            <div className="h">VISA LOGGAN</div>
            <div className="seg full">
              {SHOW.map((x) => <button key={x.id} className={x.id === show ? "on" : ""} onClick={() => setShow(x.id)}>{x.name}</button>)}
            </div>
            <p className="note">{SHOW.find((x) => x.id === show)!.note}</p>
          </section>
          <section>
            <div className="h">02 · NAMN & UNDERTEXT</div>
            <div className="row2">
              <label className="inp"><input value={w1} onChange={(e) => setW1(e.target.value)} placeholder="Ord 1" maxLength={22} /></label>
              <label className="inp acc"><input value={w2} onChange={(e) => setW2(e.target.value)} placeholder="Ord 2 (accent)" maxLength={22} style={{ color: accent }} /></label>
            </div>
            <label className="inp" style={{ marginTop: 8 }}><input value={sub} onChange={(e) => setSub(e.target.value)} placeholder="Undertext" maxLength={48} /></label>
          </section>
          <section>
            <div className="h">03 · STRECKETS STIL</div>
            <div className="styles">
              {RULES.map((r) => (
                <button key={r.id} className={`st${r.id === ruleId ? " on" : ""}`} title={r.hint}
                  onClick={() => { setRuleId(r.id); }}>
                  <i style={{ background: r.fill }} />{r.name}
                </button>
              ))}
            </div>
            <p className="note">{rule.hint}</p>
          </section>
          <section className="row2">
            <div>
              <div className="h">04 · BAKGRUND</div>
              <div className="sw">
                {[rule.bg, "#070d1d", "#f6efe2", ...colors.slice(0, 1)].filter((c, i, a) => a.indexOf(c) === i).slice(0, 4).map((c) => (
                  <button key={c} className={c === bg ? "on" : ""} style={{ background: c }} onClick={() => setBg(c)} aria-label={`Bakgrund ${c}`} />
                ))}
                <label className="pick" aria-label="Egen färg"><input type="color" value={bg} onChange={(e) => setBg(e.target.value)} /></label>
              </div>
            </div>
            <div>
              <div className="h">05 · TEMPO</div>
              <input className="range" type="range" min={1.2} max={3} step={0.1} value={tempo} onChange={(e) => setTempo(+e.target.value)} />
              <div className="rv"><span>Snabb</span><span>{tempo.toFixed(1).replace(".", ",")} s</span><span>Lugn</span></div>
            </div>
          </section>
          <section>
            <div className="h">06 · ACCENT {file ? "· FRÅN DIN LOGGA" : ""}</div>
            <div className="sw">
              {colors.map((c) => (
                <button key={c} className={c === accent ? "on" : ""} style={{ background: c }} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} />
              ))}
              <button className={rule.accent === accent ? "on" : ""} style={{ background: rule.accent }} onClick={() => setAccent(rule.accent)} aria-label="Stilens accent" />
              <em>{file ? "hämtade ur loggan" : "byt logga så hämtas färgerna"}</em>
            </div>
          </section>
        </div>

        <div className="stage">
          <div className="bar">
            <div className="seg">
              {NETS.map((n) => <button key={n.id} className={n.id === net ? "on" : ""} onClick={() => setNet(n.id)}>{n.name}</button>)}
            </div>
            <span className="muted mono">simulerat nät</span>
            <button className="play" onClick={() => { setM(null); setPlay((p) => p + 1); }}>
              <svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z" /></svg>SPELA IGEN
            </button>
          </div>

          {tab === "studio" ? (
            <div className="devices">
              <figure className="desk">
                <div className={`scr${holding ? " can-release" : ""}`} onClick={holding ? letGo : undefined}>
                  <CrintroPreview cfg={cfg} netLoad={netLoad} playKey={play} onMeasure={setM} hold={hold} releaseKey={release} onHolding={setHolding} />
                  {holding && <button className="hold-hint" onClick={(e) => { e.stopPropagation(); letGo(); }}>Klicka för att släppa introt</button>}
                </div>
                <figcaption>DATOR</figcaption>
              </figure>
              <figure className="phone">
                <div className={`scr${holding ? " can-release" : ""}`} onClick={holding ? letGo : undefined}>
                  <CrintroPreview cfg={cfg} netLoad={netLoad} playKey={play} compact hold={hold} releaseKey={release} />
                </div>
                <figcaption>MOBIL</figcaption>
              </figure>
            </div>
          ) : (
            <pre className="code"><code>{code}</code></pre>
          )}

          <div className="meters">
            <div className="mc"><small>INTROT SLÄPPER</small><b>{m ? m.curtain.toFixed(1).replace(".", ",") : "…"}<em>s</em></b></div>
            <div className="mc"><small>FILMEN LADDAD</small><b>{m ? m.loaded : "…"}<em>%</em></b></div>
            <div className="mc"><small>SCROLL</small><b className="gold-t">60<em>fps</em></b></div>
            <div className="mc"><small>HACK</small><b className="ok">0</b></div>
          </div>
        </div>
      </div>

      <footer className="tool-foot">
        <p>Gillar du det? Vi lägger in introt på din sajt, med din egen H3-film bakom.</p>
        <button className="btn" onClick={save}>{saved || (user ? "Spara intro" : "Logga in och spara")}</button>
        <a className="btn p" href={`https://swegbg.com/#kontakt`} target="_blank" rel="noopener">Jag vill ha detta →</a>
      </footer>
    </>
  );
}
