"use client";
import { useRef, useState } from "react";

/** Pick or drop a file from the visitor's own computer. Nothing is uploaded: we only read it locally. */
export default function FileDrop({
  accept, label, hint, file, thumb, onFile,
}: { accept: string; label: string; hint: string; file: { name: string; size: number } | null; thumb?: React.ReactNode; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
  return (
    <div
      className={`drop${over ? " over" : ""}`}
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
    >
      <div className="drop-thumb">{thumb ?? <svg viewBox="0 0 24 24"><path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" /></svg>}</div>
      <div className="drop-txt">
        <b>{file ? file.name : label}</b>
        <small>{file ? `Från din dator · ${kb(file.size)}` : hint}</small>
      </div>
      <span className="drop-cta">{file ? "Byt" : "Välj fil"}</span>
      <input ref={input} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </div>
  );
}
