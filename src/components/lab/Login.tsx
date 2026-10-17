"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

/** Log in with a magic link: no passwords to leak or forget. */
export default function Login({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = supabase();
    if (!sb) return;
    setState("sending");
    const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: location.origin } });
    if (error) { setState("error"); setMsg(error.message); } else setState("sent");
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label="Logga in" onClick={onClose}>
      <form className="modal-box" onClick={(e) => e.stopPropagation()} onSubmit={send}>
        <div className="k">{"// SWEGBG LAB"}</div>
        <h2>Logga in</h2>
        {state === "sent" ? (
          <p className="ok-msg">Kolla din mejl. Klicka på länken så är du inloggad, inget lösenord behövs.</p>
        ) : (
          <>
            <p className="muted">Vi skickar en inloggningslänk till din mejl. Inget lösenord. Inloggad kan du spara dina intron.</p>
            <label className="inp"><input type="email" required autoFocus placeholder="din@mejl.se" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {state === "error" && <p className="err">{msg}</p>}
            <button className="btn p wide" disabled={state === "sending"}>{state === "sending" ? "Skickar …" : "Skicka länk"}</button>
          </>
        )}
        <button type="button" className="close" onClick={onClose} aria-label="Stäng">×</button>
      </form>
    </div>
  );
}
