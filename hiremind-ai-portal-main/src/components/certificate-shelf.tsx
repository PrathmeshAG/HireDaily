import { useState } from "react";
import { toast } from "sonner";
import { Download, Lock, Printer } from "lucide-react";
import { TRACKS, problemsOf, type Track } from "../data/coding-problems";
import { certificateId, certificateSvg, downloadCertificatePng, printCertificate } from "../lib/certificate-svg";
import { SITE } from "../lib/site";
import type { Progress } from "../lib/progress";

const ACCENT: Record<Track, string> = { software: "#7c3aed", analyst: "#059669", cyber: "#e11d48" };

/** Certificates for finished tracks. A track is finished when every task in it is solved. */
export function CertificateShelf({ progress, name, uid }: { progress: Progress; name: string; uid: string }) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {TRACKS.map((t) => {
        const list = problemsOf(t.id);
        const done = list.filter((p) => progress[p.id]);
        const complete = done.length === list.length && list.length > 0;
        const last = Math.max(0, ...done.map((p) => progress[p.id].at));
        const svg = complete
          ? certificateSvg({
              name,
              trackLabel: t.label,
              accent: ACCENT[t.id],
              taskCount: list.length,
              topics: [...new Set(list.flatMap((p) => p.topics))].slice(0, 4),
              date: new Date(last).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
              id: certificateId(uid, t.id),
              signer: SITE.owner.name,
              signerRole: `${SITE.owner.role}, ${SITE.name}`,
              brand: SITE.name,
            })
          : "";
        const file = `${SITE.name.replace(/\s+/g, "-")}-${t.id}-certificate.png`;

        return (
          <article key={t.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
            {complete ? (
              <div className="bg-slate-100 p-3 dark:bg-black/30" dangerouslySetInnerHTML={{ __html: svg }} />
            ) : (
              <div className="flex aspect-[1200/850] flex-col items-center justify-center gap-3 bg-slate-100 p-6 text-center dark:bg-black/30">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-white/40"><Lock className="h-5 w-5" /></span>
                <p className="text-sm font-bold text-slate-700 dark:text-white/80">{t.label} certificate</p>
                <div className="h-2 w-48 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]" style={{ width: `${(done.length / list.length) * 100}%` }} />
                </div>
                <p className="text-xs text-slate-500 dark:text-white/45">{done.length} of {list.length} tasks solved. Finish them all to unlock it.</p>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{t.label}</p>
                <p className="text-xs text-slate-500 dark:text-white/45">{complete ? `Earned ${new Date(last).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "Not earned yet"}</p>
              </div>
              {complete && (
                <div className="flex shrink-0 gap-2">
                  <button
                    disabled={busy === t.id}
                    onClick={async () => {
                      setBusy(t.id);
                      try { await downloadCertificatePng(svg, file); } catch { toast.error("Could not create the image. Try Print instead."); } finally { setBusy(null); }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-[#00e5ff] dark:text-slate-950 dark:hover:bg-cyan-300"
                  >
                    <Download className="h-3.5 w-3.5" /> PNG
                  </button>
                  <button
                    onClick={() => { if (!printCertificate(svg)) toast.error("Allow pop-ups to print the certificate."); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                  >
                    <Printer className="h-3.5 w-3.5" /> Print / PDF
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
