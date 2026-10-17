"use client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import IntroStudio from "./tools/IntroStudio";
import ScrollFilm from "./tools/ScrollFilm";
import SitePreview from "./tools/SitePreview";
import Login from "./Login";
import { authEnabled, supabase } from "@/lib/supabase";

/* SweGBG Lab: a tool list on the left (like a model list), the active tool on the right.
 * Every tool runs in the visitor's browser. Supabase is only used to log in and save settings. */
type ToolId = "intro" | "film" | "sajt";
const TOOLS: { id: ToolId | null; name: string; sub: string; tags: [string, string][]; icon: React.ReactNode }[] = [
  { id: "intro", name: "Intro-studion", sub: "Ditt laddintro, live", tags: [["CRINK", "g"], ["LOGGA", ""], ["LIVE", "c"]],
    icon: <path d="M4 18h16M4 18l3-8 4 4 3-7 3 11" /> },
  { id: "film", name: "Scrollfilm", sub: "Dra genom din film", tags: [["H3", "g"], ["VIDEO", ""], ["MOBIL", "c"]],
    icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3z" /></> },
  { id: "sajt", name: "Sajt-preview", sub: "Din sajt, spara som fil", tags: [["NY", "g"], ["HTML", ""], ["OFFLINE", "c"]],
    icon: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M7 13h6M7 16h4" /></> },
  { id: null, name: "Före / efter", sub: "Gammal mot ny", tags: [["SNART", "s"]], icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M12 3v18" /></> },
  { id: null, name: "Fartmätaren", sub: "Hur seg är din sajt?", tags: [["SNART", "s"]], icon: <path d="M12 14l4-4M4 18a8 8 0 1116 0" /> },
  { id: null, name: "Reel-generatorn", sub: "Instagram på 1 min", tags: [["SNART", "s"]], icon: <><rect x="7" y="3" width="10" height="18" rx="2" /><path d="M10 9l4 3-4 3z" /></> },
];

export default function Lab() {
  const [tool, setTool] = useState<ToolId>("intro");
  const [user, setUser] = useState<User | null>(null);
  const [login, setLogin] = useState(false);

  // the active tool lives in the address (#film), so links and the back button work
  useEffect(() => {
    const read = () => setTool(location.hash === "#film" ? "film" : location.hash === "#sajt" ? "sajt" : "intro");
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    sb.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  const go = (id: ToolId) => {
    history.replaceState(null, "", `#${id}`);
    setTool(id);
  };

  return (
    <div className="lab">
      <aside className="side">
        <a className="brand" href="https://swegbg.com" title="Till swegbg.com">
          <span className="hexb">SG</span>
          <span><b>SWE<i>GBG</i> LAB</b><small>LEK MED DIN SAJT</small></span>
        </a>
        <div className="lbl">VERKTYG</div>
        <nav className="tools">
          {TOOLS.map((t) => (
            <button key={t.name} className={`tool${t.id === tool ? " on" : ""}${t.id ? "" : " soon"}`} disabled={!t.id}
              onClick={() => t.id && go(t.id)}>
              <span className="ti"><svg viewBox="0 0 24 24">{t.icon}</svg></span>
              <span>
                <span className="tn">{t.name}<small>{t.sub}</small></span>
                <span className="tags">{t.tags.map(([l, c]) => <span key={l} className={`tag ${c}`}>{l}</span>)}</span>
              </span>
            </button>
          ))}
        </nav>
        <div className="local"><b><span className="dot" />Allt körs hos dig</b>Dina filer lämnar aldrig datorn. Inget laddas upp, ingen server.</div>
        {authEnabled && (
          <div className="acct">
            {user ? (
              <>
                <span className="who" title={user.email}>{user.email}</span>
                <button onClick={() => supabase()?.auth.signOut()}>Logga ut</button>
              </>
            ) : (
              <button className="login" onClick={() => setLogin(true)}>Logga in</button>
            )}
          </div>
        )}
      </aside>

      <main className="main">
        {tool === "intro" ? <IntroStudio user={user} onLogin={() => setLogin(true)} /> : tool === "film" ? <ScrollFilm /> : <SitePreview />}
      </main>

      {login && <Login onClose={() => setLogin(false)} />}
    </div>
  );
}
