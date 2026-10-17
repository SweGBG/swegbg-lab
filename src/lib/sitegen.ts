/**
 * Builds a complete one-page preview site as ONE self-contained HTML file:
 * no external fonts, scripts or images (the logo is embedded as a data URL), so the file opens
 * straight from the visitor's own computer, offline, by double-clicking it.
 * The same string is shown in the Lab preview (iframe srcdoc), so what they see is what they save.
 */
export type Service = { t: string; d: string };
export type SiteOpts = {
  w1: string;
  w2: string;
  tagline: string;
  about: string;
  services: Service[];
  phone: string;
  email: string;
  city: string;
  logo: string | null; // data URL
  bg: string;
  accent: string;
  ruleFill: string;
  ruleGlow: string;
  intro: boolean;
  light: boolean; // light background → dark text
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const tel = (s: string) => s.replace(/[^\d+]/g, "");

export function buildSite(o: SiteOpts): string {
  const name = `${o.w1} ${o.w2}`.trim() || "Ditt företag";
  const ink = o.light ? "#17140f" : "#f6efe3";
  const mut = o.light ? "rgba(23,20,15,.66)" : "rgba(246,239,227,.66)";
  const line = o.light ? "rgba(23,20,15,.12)" : "rgba(246,239,227,.12)";
  const card = o.light ? "rgba(23,20,15,.04)" : "rgba(255,255,255,.035)";
  // the logo is embedded ONCE (a CSS background) and reused everywhere, so the file stays small
  const logo = o.logo ? `<span class="lg" role="img" aria-label="${esc(name)}"></span>` : "";
  const word = `${esc(o.w1)} <em>${esc(o.w2)}</em>`;
  const services = o.services.filter((s) => s.t.trim());
  const year = new Date().getFullYear();

  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}${o.tagline ? " – " + esc(o.tagline) : ""}</title>
<meta name="description" content="${esc(o.tagline || name)}">
<style>
:root { --bg: ${o.bg}; --ink: ${ink}; --mut: ${mut}; --line: ${line}; --card: ${card}; --acc: ${o.accent};
  --fill: ${o.ruleFill}; --glow: color-mix(in srgb, ${o.accent} 42%, transparent); --serif: Georgia, "Times New Roman", serif;
  --sans: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; --ease: cubic-bezier(.2,.7,.2,1); }
* { box-sizing: border-box; margin: 0; padding: 0; }
${o.logo ? `.lg { display: block; width: 100%; height: 100%; background: url("${o.logo}") center / contain no-repeat; }` : ""}
html { scroll-behavior: smooth; }
body { background: var(--bg); color: var(--ink); font: 16px/1.6 var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
a { color: inherit; text-decoration: none; }
em { font-style: italic; color: var(--acc); font-weight: 400; }
.wrap { width: min(1160px, 100% - 40px); margin: 0 auto; }

/* CRiNTRO intro */
.ci { position: fixed; inset: 0; z-index: 100; display: grid; place-items: center; text-align: center; background:
  radial-gradient(70% 50% at 50% 110%, var(--glow), transparent 70%), var(--bg); transition: opacity .7s .2s var(--ease), visibility 0s 1s; }
.ci.out { opacity: 0; visibility: hidden; }
.ci-in { display: grid; justify-items: center; gap: 18px; padding: 0 24px; transition: opacity .3s, transform .4s var(--ease); }
.ci.out .ci-in { opacity: 0; transform: scale(.97); }
.ci-logo { width: min(150px, 34vw); aspect-ratio: 1; position: relative; }
.ci-logo .lg { position: relative; width: 100%; height: 100%; object-fit: contain; animation: catch 1.2s .1s var(--ease) both; }
.ci-logo::before { content: ""; position: absolute; inset: -40%; border-radius: 50%; background: radial-gradient(circle, var(--glow), transparent 66%); opacity: .5; }
.ci-word { font: 700 clamp(30px, 6vw, 54px)/1 var(--serif); letter-spacing: -.02em; animation: rise .9s .4s var(--ease) both; }
.ci-track { width: min(240px, 60vw); height: 3px; border-radius: 3px; background: var(--line); overflow: hidden; }
.ci-fill { height: 100%; background: var(--fill); box-shadow: 0 0 12px var(--glow); transform-origin: 0 50%; animation: fill 1.5s .45s cubic-bezier(.4,0,.2,1) both; }
@keyframes catch { 0% { opacity: 0; transform: scale(.86); filter: blur(10px); } 50% { opacity: 1; filter: blur(1px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes rise { from { opacity: 0; transform: translateY(.3em); } to { opacity: 1; transform: none; } }
@keyframes fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* header */
header { position: fixed; top: 0; left: 0; right: 0; z-index: 20; transition: background .3s, border-color .3s; border-bottom: 1px solid transparent; }
header.solid { background: color-mix(in srgb, var(--bg) 88%, transparent); backdrop-filter: blur(10px); border-color: var(--line); }
.nav { display: flex; align-items: center; gap: 28px; height: 72px; }
.brand { display: flex; align-items: center; gap: 12px; font: 700 20px var(--serif); letter-spacing: -.01em; }
.brand .lg { width: 40px; height: 40px; flex: none; }
.links { display: flex; gap: 26px; margin-left: auto; font-size: 14.5px; color: var(--mut); }
.links a:hover { color: var(--ink); }
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 20px; border-radius: 999px; font: 600 14.5px var(--sans);
  background: var(--acc); color: #120d08; transition: transform .2s, box-shadow .2s; }
.btn:hover { transform: translateY(-1px); box-shadow: 0 10px 30px -8px var(--acc); }
.btn.ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.btn.ghost:hover { border-color: var(--acc); box-shadow: none; }

/* hero */
.hero { position: relative; min-height: 100svh; display: flex; align-items: flex-end; padding: 140px 0 90px; overflow: hidden; isolation: isolate; }
.film { position: absolute; inset: -10%; z-index: -2; background:
  radial-gradient(45% 55% at 72% 40%, color-mix(in srgb, var(--acc) 55%, transparent), transparent 70%),
  radial-gradient(35% 45% at 25% 75%, color-mix(in srgb, var(--acc) 28%, transparent), transparent 70%),
  linear-gradient(130deg, color-mix(in srgb, var(--bg) 70%, #000), color-mix(in srgb, var(--acc) 18%, var(--bg)));
  animation: drift 14s ease-in-out infinite alternate; will-change: transform; }
@keyframes drift { to { transform: translate3d(-3%, 2%, 0) scale(1.08); } }
.hero::after { content: ""; position: absolute; inset: 0; z-index: -1; background: linear-gradient(0deg, var(--bg), transparent 55%), linear-gradient(90deg, color-mix(in srgb, var(--bg) 70%, transparent), transparent 70%); }
.film-tag { position: absolute; right: 20px; bottom: 24px; font: 600 11px var(--sans); letter-spacing: .18em; text-transform: uppercase; color: var(--mut);
  padding: 7px 12px; border: 1px dashed var(--line); border-radius: 999px; }
.kick { font: 600 13px var(--sans); letter-spacing: .22em; text-transform: uppercase; color: var(--acc); }
h1 { font: 700 clamp(46px, 9vw, 116px)/.95 var(--serif); letter-spacing: -.03em; margin: 14px 0 20px; }
.lead { font-size: clamp(17px, 2vw, 21px); color: var(--mut); max-width: 560px; }
.cta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.reveal { opacity: 0; transform: translateY(18px); transition: opacity .9s var(--ease), transform .9s var(--ease); }
.reveal.in { opacity: 1; transform: none; }

/* sections */
section.sec { padding: 110px 0; border-top: 1px solid var(--line); }
.sh { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 44px; flex-wrap: wrap; }
h2 { font: 700 clamp(34px, 5vw, 56px)/1 var(--serif); letter-spacing: -.02em; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
.card { padding: 30px 26px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); transition: border-color .3s, transform .3s var(--ease); }
.card:hover { border-color: color-mix(in srgb, var(--acc) 60%, transparent); transform: translateY(-3px); }
.card .n { font: 600 13px var(--sans); color: var(--acc); letter-spacing: .14em; }
.card h3 { font: 700 24px var(--serif); margin: 14px 0 8px; }
.card p { color: var(--mut); font-size: 15px; }
.about { display: grid; grid-template-columns: 1.1fr 1fr; gap: 60px; align-items: center; }
.about p { font-size: 19px; color: var(--mut); white-space: pre-line; }
.about .mark { justify-self: center; width: min(320px, 70vw); aspect-ratio: 1; display: grid; place-items: center; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--acc) 22%, transparent), transparent 68%); }
.about .mark .lg { width: 62%; height: 62%; }
.contact { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; }
.rows { display: grid; gap: 4px; margin-top: 26px; }
.rows a, .rows span { display: flex; justify-content: space-between; gap: 16px; padding: 16px 0; border-bottom: 1px solid var(--line); font-size: 17px; }
.rows small { color: var(--mut); font-size: 13px; letter-spacing: .14em; text-transform: uppercase; }
form { display: grid; gap: 12px; padding: 28px; border-radius: 18px; background: var(--card); border: 1px solid var(--line); }
input, textarea { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid var(--line); background: transparent; color: var(--ink); font: 15px var(--sans); }
input:focus, textarea:focus { outline: none; border-color: var(--acc); }
textarea { min-height: 120px; resize: vertical; }
footer { padding: 40px 0 60px; border-top: 1px solid var(--line); color: var(--mut); font-size: 13.5px; }
footer .wrap { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.pv { position: fixed; left: 14px; bottom: 14px; z-index: 30; font: 600 11px var(--sans); letter-spacing: .12em; text-transform: uppercase;
  padding: 8px 12px; border-radius: 999px; background: rgba(0,0,0,.55); color: #fff; backdrop-filter: blur(6px); }
.pv b { color: #f2b544; }
@media (max-width: 760px) {
  .links { display: none; } .nav { gap: 12px; } .nav .btn { margin-left: auto; padding: 10px 16px; }
  .about, .contact { grid-template-columns: 1fr; gap: 36px; } .about .mark { order: -1; width: 200px; }
  section.sec { padding: 80px 0; } .hero { padding-bottom: 70px; } .film-tag { display: none; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; } .reveal { opacity: 1; transform: none; } }
</style>
</head>
<body>
${o.intro ? `<div class="ci" id="ci" aria-hidden="true"><div class="ci-in">
  ${logo ? `<div class="ci-logo">${logo}</div>` : ""}
  <p class="ci-word">${word}</p>
  <div class="ci-track"><div class="ci-fill"></div></div>
</div></div>` : ""}

<header id="top"><div class="wrap nav">
  <a class="brand" href="#">${logo}<span>${word}</span></a>
  <nav class="links"><a href="#tjanster">Tjänster</a><a href="#om">Om oss</a><a href="#kontakt">Kontakt</a></nav>
  ${o.phone ? `<a class="btn" href="tel:${tel(o.phone)}">Ring ${esc(o.phone)}</a>` : `<a class="btn" href="#kontakt">Kontakta oss</a>`}
</div></header>

<main>
<section class="hero">
  <div class="film"></div>
  <div class="wrap">
    <p class="kick reveal">${esc(o.city || "Välkommen")}</p>
    <h1 class="reveal">${word}</h1>
    <p class="lead reveal">${esc(o.tagline)}</p>
    <div class="cta reveal"><a class="btn" href="#kontakt">Begär offert →</a>${services.length ? `<a class="btn ghost" href="#tjanster">Våra tjänster</a>` : ""}</div>
  </div>
  <span class="film-tag">Här rullar din H3-film</span>
</section>

${services.length ? `<section class="sec" id="tjanster"><div class="wrap">
  <div class="sh reveal"><h2>Det här <em>gör vi</em></h2></div>
  <div class="grid">${services.map((s, i) => `
    <article class="card reveal"><span class="n">0${i + 1}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></article>`).join("")}
  </div>
</div></section>` : ""}

${o.about ? `<section class="sec" id="om"><div class="wrap about">
  <div class="reveal"><p class="kick">Om oss</p><h2 style="margin:12px 0 22px">${word}</h2><p>${esc(o.about)}</p></div>
  ${logo ? `<div class="mark reveal">${logo}</div>` : ""}
</div></section>` : ""}

<section class="sec" id="kontakt"><div class="wrap contact">
  <div class="reveal">
    <p class="kick">Kontakt</p><h2 style="margin-top:12px">Hör av <em>dig</em></h2>
    <div class="rows">
      ${o.phone ? `<a href="tel:${tel(o.phone)}"><small>Telefon</small>${esc(o.phone)}</a>` : ""}
      ${o.email ? `<a href="mailto:${esc(o.email)}"><small>E-post</small>${esc(o.email)}</a>` : ""}
      ${o.city ? `<span><small>Ort</small>${esc(o.city)}</span>` : ""}
    </div>
  </div>
  <form class="reveal" action="mailto:${esc(o.email)}" method="post" enctype="text/plain">
    <input name="Namn" placeholder="Ditt namn" required>
    <input name="Telefon" placeholder="Telefon eller e-post" required>
    <textarea name="Meddelande" placeholder="Berätta kort vad du behöver hjälp med"></textarea>
    <button class="btn" type="submit" style="justify-content:center;border:0;cursor:pointer">Skicka förfrågan →</button>
  </form>
</div></section>
</main>

<footer><div class="wrap"><span>© ${year} ${esc(name)}</span><span>Förhandsvisning skapad i <a href="https://lab.swegbg.com" style="color:var(--acc)">SweGBG Lab</a></span></div></footer>
<a class="pv" href="https://swegbg.com" target="_blank" rel="noopener">Förhandsvisning · <b>SweGBG</b></a>

<script>
(function () {
  var ci = document.getElementById("ci");
  var start = function () {
    if (ci) { ci.classList.add("out"); setTimeout(function () { ci.remove(); }, 1200); }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (el.closest(".hero") ? 0.25 + i * 0.1 : 0) + "s";
      io.observe(el);
    });
  };
  setTimeout(start, ci ? 2100 : 0);
  var h = document.getElementById("top");
  var on = function () { h.classList.toggle("solid", scrollY > 40); };
  addEventListener("scroll", on, { passive: true }); on();
})();
</script>
</body>
</html>`;
}
