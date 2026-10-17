"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import FileDrop from "../FileDrop";
import { RULES, ruleById } from "@/lib/rules";
import { accentOf, hex, lightness, paletteFrom } from "@/lib/palette";
import { analyse, process as cleanLogo, type LogoInfo, type Shape } from "@/lib/logo";
import { buildSite, type Service } from "@/lib/sitegen";

/** Sajt-preview: the visitor's own one-page site, live, and downloadable as ONE offline HTML file. */
type Kind = "hantverk" | "restaurang" | "salong";
const KINDS: { id: Kind; name: string; rule: string; w1: string; w2: string; tagline: string; about: string; services: Service[] }[] = [
  {
    id: "hantverk", name: "Hantverk", rule: "stal", w1: "Nordvik", w2: "Bygg",
    tagline: "Renovering, tillbyggnad och service. Vi gör jobbet rätt från början.",
    about: "Vi är ett lokalt byggföretag som tar hand om hela jobbet, från första besöket till slutstädning.\nFast pris innan vi börjar och en kontaktperson hela vägen.",
    services: [
      { t: "Renovering", d: "Kök, golv och invändiga ytor. Vi planerar, bygger och städar efter oss." },
      { t: "Badrum", d: "Totalrenovering med tätskikt enligt branschregler och dokumentation." },
      { t: "Tak & fasad", d: "Byte, lagning och målning. Besiktning innan vi lämnar pris." },
    ],
  },
  {
    id: "restaurang", name: "Restaurang", rule: "ugn", w1: "Bistro", w2: "Lyktan",
    tagline: "Säsongens råvaror, lagade med omsorg. Välkommen till bords.",
    about: "Ett litet kök med stort hjärta. Vi lagar maten från grunden, varje dag, med råvaror från gårdar i närheten.",
    services: [
      { t: "Lunch", d: "Dagens rätt vardagar med sallad, bröd och kaffe." },
      { t: "Middag", d: "À la carte och avsmakningsmeny från kl. 17." },
      { t: "Catering", d: "Mat till fest, kontor och bröllop. Hämta eller få levererat." },
    ],
  },
  {
    id: "salong", name: "Salong", rule: "bar", w1: "Studio", w2: "Saga",
    tagline: "Hår, färg och behandlingar i lugn miljö. Boka din tid online.",
    about: "En salong där du får tid. Vi lyssnar först, klipper sedan, och ger råd så att håret håller hemma också.",
    services: [
      { t: "Klippning", d: "Klippning och styling för alla hårlängder." },
      { t: "Färg", d: "Slingor, balayage och toning med skonsamma produkter." },
      { t: "Behandlingar", d: "Inpackning och hårbottenvård som återfuktar på djupet." },
    ],
  },
];

const DEMO_LOGO = "/demo/logo-solkvist.svg";
const toDataUrl = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(b); });
/** max 512 px, WebP with transparency (PNG if the browser cannot) – keeps the downloaded file light */
async function shrink(url: string): Promise<Blob> {
  const img = new Image();
  img.src = url;
  await img.decode();
  const r = Math.min(1, 512 / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * r);
  c.height = Math.round(img.naturalHeight * r);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  const webp = await new Promise<Blob | null>((res) => c.toBlob(res, "image/webp", 0.9));
  if (webp && webp.type === "image/webp") return webp;
  return new Promise<Blob>((res) => c.toBlob((b) => res(b!), "image/png"));
}
const slug = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "min-sajt";

export default function SitePreview() {
  const [kind, setKind] = useState<Kind>("hantverk");
  const preset = KINDS.find((k) => k.id === kind)!;
  const [w1, setW1] = useState(preset.w1);
  const [w2, setW2] = useState(preset.w2);
  const [tagline, setTagline] = useState(preset.tagline);
  const [about, setAbout] = useState(preset.about);
  const [services, setServices] = useState<Service[]>(preset.services);
  const [phone, setPhone] = useState("031-123 45 67");
  const [email, setEmail] = useState("hej@exempel.se");
  const [city, setCity] = useState("Göteborg");
  const [ruleId, setRuleId] = useState(preset.rule);
  const [accent, setAccent] = useState(ruleById(preset.rule).accent);
  const [bg, setBg] = useState(ruleById(preset.rule).bg);
  const [colors, setColors] = useState<string[]>([]);
  const [intro, setIntro] = useState(true);
  const [view, setView] = useState<"dator" | "mobil">("dator");
  const [play, setPlay] = useState(0);
  const [touched, setTouched] = useState(false); // once they type their own texts, a new branch keeps them

  // logo + clean-up (same as in Intro-studion, all local)
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [src, setSrc] = useState(DEMO_LOGO);
  const [info, setInfo] = useState<LogoInfo | null>(null);
  const [removeBg, setRemoveBg] = useState(false);
  const [shape, setShape] = useState<Shape>("fri");
  const [logo, setLogo] = useState<string | null>(null); // data URL, embedded in the file
  const objUrl = useRef<string | null>(null);

  const rule = ruleById(ruleId);

  const pickKind = (k: Kind) => {
    const p = KINDS.find((x) => x.id === k)!;
    setKind(k);
    setRuleId(p.rule);
    if (!file) { setAccent(ruleById(p.rule).accent); }
    setBg(ruleById(p.rule).bg);
    if (!touched) {
      setW1(p.w1); setW2(p.w2); setTagline(p.tagline); setAbout(p.about);
    }
    setServices(p.services);
  };
  const edit = <T,>(set: (v: T) => void) => (v: T) => { setTouched(true); set(v); };

  const onFile = async (f: File) => {
    if (!f.type.startsWith("image/")) return;
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    const url = URL.createObjectURL(f); // read locally, never uploaded
    objUrl.current = url;
    setFile({ name: f.name, size: f.size });
    let found: LogoInfo | null = null;
    try { found = await analyse(url); } catch { /* show as it is */ }
    setInfo(found);
    setRemoveBg(!!found && !found.transparent && found.uniform > 0.8);
    setShape("fri");
    setSrc(url);
  };

  useEffect(() => {
    let off = false;
    const id = setTimeout(async () => {
      try {
        const out = await cleanLogo(src, { removeBg, bg: info?.bg ?? null, shape });
        const data = await toDataUrl(await shrink(out.url));
        URL.revokeObjectURL(out.url);
        if (off) return;
        setLogo(data);
        if (src !== DEMO_LOGO) {
          const pal = await paletteFrom(data, 4);
          if (!off && pal.length) { setColors(pal); setAccent(accentOf(pal)); }
        }
      } catch { if (!off) setLogo(null); }
    }, 120);
    return () => { off = true; clearTimeout(id); };
  }, [src, removeBg, shape, info]);

  const opts = { w1, w2, tagline, about, services, phone, email, city, logo, bg, accent, ruleFill: rule.fill, ruleGlow: rule.glow, light: lightness(bg) > 0.6 };
  // while typing, the preview skips the intro (no replay on every key). "Spela intro" shows it once,
  // and the downloaded file always has it (if ticked).
  const key = JSON.stringify(opts);
  const [live, setLive] = useState("");
  const played = useRef(0);
  const html = useMemo(() => buildSite({ ...opts, intro: false }), [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (play !== played.current) {
      played.current = play;
      setLive(buildSite({ ...opts, intro: true }));
      return;
    }
    const id = setTimeout(() => setLive(html), live ? 250 : 0);
    return () => clearTimeout(id);
  }, [html, play]); // eslint-disable-line react-hooks/exhaustive-deps

  const download = () => {
    const file = buildSite({ ...opts, intro });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([file], { type: "text/html;charset=utf-8" }));
    a.download = `${slug(`${w1} ${w2}`)}-preview.html`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };
  const kb = Math.round(new Blob([html]).size / 1024);

  // the frame renders the page at real size (1280 / 390 px wide) and scales it down to fit
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const W = view === "dator" ? 1280 : 390;
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const setService = (i: number, k: keyof Service, v: string) => { setTouched(true); setServices((s) => s.map((x, j) => (j === i ? { ...x, [k]: v } : x))); };

  return (
    <>
      <header className="tool-head">
        <div><div className="k">{"// VERKTYG 03 · SAJT"}</div><h1>Sajt-preview</h1></div>
        <div className="seg" role="tablist">
          <button className={view === "dator" ? "on" : ""} onClick={() => setView("dator")}>Dator</button>
          <button className={view === "mobil" ? "on" : ""} onClick={() => setView("mobil")}>Mobil</button>
        </div>
      </header>

      <div className="work">
        <div className="ctrl">
          <section>
            <div className="h">01 · BRANSCH</div>
            <div className="seg full">
              {KINDS.map((k) => <button key={k.id} className={k.id === kind ? "on" : ""} onClick={() => pickKind(k.id)}>{k.name}</button>)}
            </div>
            <p className="note">Exempeltexter att skriva över. Inget här är riktiga kunder.</p>
          </section>
          <section>
            <div className="h">02 · DIN LOGGA</div>
            <FileDrop accept="image/*" label="Välj eller släpp din logga" hint="PNG, SVG, JPG eller WebP" file={file} onFile={onFile}
              thumb={logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={logo} alt="" className="chk" /> : undefined} />
            <div className="lt">
              <div className="lt-row">
                <span>Bakgrund</span>
                <div className="seg mini">
                  <button className={!removeBg ? "on" : ""} onClick={() => setRemoveBg(false)}>Behåll</button>
                  <button className={removeBg ? "on" : ""} disabled={!info?.bg} onClick={() => setRemoveBg(true)}>Ta bort</button>
                </div>
                {info?.bg && <i className="lt-sw" style={{ background: hex(info.bg) }} />}
              </div>
              <div className="lt-row">
                <span>Form</span>
                <div className="seg mini">
                  {(["fri", "rund", "ruta"] as Shape[]).map((x) => (
                    <button key={x} className={shape === x ? "on" : ""} onClick={() => setShape(x)}>{x === "fri" ? "Fri" : x === "rund" ? "Rund" : "Ruta"}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
          <section>
            <div className="h">03 · FÖRETAGET</div>
            <div className="row2">
              <label className="inp"><input value={w1} onChange={(e) => edit(setW1)(e.target.value)} placeholder="Namn" maxLength={24} /></label>
              <label className="inp acc"><input value={w2} onChange={(e) => edit(setW2)(e.target.value)} placeholder="Namn 2 (accent)" maxLength={24} style={{ color: accent }} /></label>
            </div>
            <label className="inp" style={{ marginTop: 8 }}><input value={tagline} onChange={(e) => edit(setTagline)(e.target.value)} placeholder="En mening om er" maxLength={110} /></label>
            <label className="inp" style={{ marginTop: 8 }}><textarea value={about} onChange={(e) => edit(setAbout)(e.target.value)} placeholder="Om oss" rows={3} maxLength={500} /></label>
          </section>
          <section>
            <div className="h">04 · TJÄNSTER</div>
            <div className="svc">
              {services.map((s, i) => (
                <div key={i} className="svc-row">
                  <b>0{i + 1}</b>
                  <input value={s.t} onChange={(e) => setService(i, "t", e.target.value)} placeholder="Tjänst" maxLength={30} />
                  <input value={s.d} onChange={(e) => setService(i, "d", e.target.value)} placeholder="En mening" maxLength={120} />
                </div>
              ))}
            </div>
          </section>
          <section>
            <div className="h">05 · KONTAKT</div>
            <div className="row2">
              <label className="inp"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefon" maxLength={20} /></label>
              <label className="inp"><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ort" maxLength={30} /></label>
            </div>
            <label className="inp" style={{ marginTop: 8 }}><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post" maxLength={60} /></label>
          </section>
          <section>
            <div className="h">06 · STIL {colors.length ? "· FÄRGER FRÅN DIN LOGGA" : ""}</div>
            <div className="styles">
              {RULES.map((r) => (
                <button key={r.id} className={`st${r.id === ruleId ? " on" : ""}`} title={r.hint}
                  onClick={() => { setRuleId(r.id); setBg(r.bg); if (!colors.length) setAccent(r.accent); }}>
                  <i style={{ background: r.fill }} />{r.name}
                </button>
              ))}
            </div>
            <div className="sw" style={{ marginTop: 12 }}>
              {[...colors, rule.accent].filter((c, i, a) => a.indexOf(c) === i).map((c) => (
                <button key={c} className={c === accent ? "on" : ""} style={{ background: c }} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} />
              ))}
              <label className="pick" aria-label="Egen accent"><input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} /></label>
              <button className={bg === "#f6efe2" ? "on" : ""} style={{ background: "#f6efe2" }} onClick={() => setBg(bg === "#f6efe2" ? rule.bg : "#f6efe2")} aria-label="Ljus sajt" title="Ljus eller mörk sajt" />
              <em>accent · ljus/mörk</em>
            </div>
            <label className="tick"><input type="checkbox" checked={intro} onChange={(e) => setIntro(e.target.checked)} /> CRiNTRO-intro med loggan när sidan öppnas</label>
          </section>
        </div>

        <div className="stage">
          <div className="bar">
            <span className="muted mono">{view === "dator" ? "1280 px · dator" : "390 px · mobil"} · {kb} KB</span>
            <button className="play" onClick={() => setPlay((p) => p + 1)} disabled={!intro} style={{ marginLeft: "auto" }}>
              <svg viewBox="0 0 12 12"><path d="M2 1l9 5-9 5z" /></svg>SPELA INTRO
            </button>
          </div>
          <div ref={box} className={`site-box ${view}`}>
            <div className="site-frame" style={{ width: W * scale }}>
              <iframe
                key={view}
                title="Förhandsvisning av din sajt"
                srcDoc={live}
                sandbox="allow-scripts allow-popups"
                style={{ width: W, height: `calc(100% / ${scale})`, transform: `scale(${scale})` }}
              />
            </div>
          </div>
        </div>
      </div>

      <footer className="tool-foot">
        <p>Spara sidan på din dator och öppna den när du vill, även utan internet. En fil, inga konton.</p>
        <button className="btn" onClick={download}>Ladda ner som HTML ↓</button>
        <a className="btn p" href="https://swegbg.com/#kontakt" target="_blank" rel="noopener">Bygg den på riktigt →</a>
      </footer>
    </>
  );
}
