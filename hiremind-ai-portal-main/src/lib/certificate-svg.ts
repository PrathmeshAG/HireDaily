/**
 * Builds a printable certificate as an SVG string (1200 x 850).
 * Kept free of React so it can be used for the on-screen preview, the PNG download and printing.
 */
export type CertificateData = {
  name: string;
  trackLabel: string;
  accent: string;
  taskCount: number;
  topics: string[];
  date: string; // already formatted
  id: string;
  signer: string;
  signerRole: string;
  brand: string;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "'Segoe UI', Helvetica, Arial, sans-serif";

export function certificateId(uid: string, track: string) {
  let h = 2166136261;
  for (const c of `${uid}:${track}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  const code = track === "software" ? "SW" : track === "analyst" ? "DA" : "CS";
  return `HD-${code}-${h.toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

export function certificateSvg(d: CertificateData): string {
  const nameSize = Math.max(34, Math.min(72, 72 - Math.max(0, d.name.length - 16) * 2.3));
  const scallops = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    return `<circle cx="${(600 + Math.cos(a) * 62).toFixed(1)}" cy="${(700 + Math.sin(a) * 62).toFixed(1)}" r="9" fill="url(#gold)"/>`;
  }).join("");
  const chips = d.topics.slice(0, 4).map((t, i, arr) => {
    const w = Math.max(110, t.length * 11 + 40), gap = 14;
    const total = arr.reduce((n, x) => n + Math.max(110, x.length * 11 + 40) + gap, -gap);
    const x0 = 600 - total / 2 + arr.slice(0, i).reduce((n, x) => n + Math.max(110, x.length * 11 + 40) + gap, 0);
    return `<rect x="${x0.toFixed(1)}" y="470" width="${w}" height="34" rx="17" fill="${d.accent}" fill-opacity=".1" stroke="${d.accent}" stroke-opacity=".5"/><text x="${(x0 + w / 2).toFixed(1)}" y="492" text-anchor="middle" font-family="${SANS}" font-size="16" font-weight="600" fill="${d.accent}">${esc(t)}</text>`;
  }).join("");
  const corner = (tx: number, ty: number, sx: number, sy: number) =>
    `<g transform="translate(${tx} ${ty}) scale(${sx} ${sy})"><path d="M0 0 H90 M0 0 V90" stroke="url(#gold)" stroke-width="3" fill="none"/><path d="M0 0 Q0 60 60 60 Q60 0 0 0" fill="url(#gold)" fill-opacity=".25"/><rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill="url(#gold)"/><circle cx="96" cy="0" r="4" fill="url(#gold)"/><circle cx="0" cy="96" r="4" fill="url(#gold)"/></g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 850" width="1200" height="850" role="img" aria-label="Certificate of achievement for ${esc(d.name)}" style="width:100%;height:auto;display:block">
<defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e08a"/><stop offset=".5" stop-color="#b8860b"/><stop offset="1" stop-color="#f1c84b"/></linearGradient>
<linearGradient id="navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f172a"/><stop offset="1" stop-color="#1e3a8a"/></linearGradient>
<linearGradient id="line" x1="0" x2="1"><stop offset="0" stop-color="#b8860b" stop-opacity="0"/><stop offset=".5" stop-color="#b8860b"/><stop offset="1" stop-color="#b8860b" stop-opacity="0"/></linearGradient>
<pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="#b8860b" stroke-opacity=".07" stroke-width="1.2"/></pattern>
<radialGradient id="glow" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="1200" height="850" fill="#fffdf6"/>
<rect width="1200" height="850" fill="url(#hatch)"/>
<g fill="none" stroke="#b8860b" stroke-opacity=".09" stroke-width="1.4">${Array.from({ length: 14 }, (_, i) => `<circle cx="600" cy="425" r="${70 + i * 30}"/>`).join("")}</g>
<rect width="1200" height="850" fill="url(#glow)"/>
<rect x="22" y="22" width="1156" height="806" rx="6" fill="none" stroke="url(#navy)" stroke-width="8"/>
<rect x="42" y="42" width="1116" height="766" rx="3" fill="none" stroke="url(#gold)" stroke-width="3"/>
<rect x="54" y="54" width="1092" height="742" fill="none" stroke="#b8860b" stroke-opacity=".5" stroke-width="1" stroke-dasharray="2 6"/>
${corner(60, 60, 1, 1)}${corner(1140, 60, -1, 1)}${corner(60, 790, 1, -1)}${corner(1140, 790, -1, -1)}

<g transform="translate(600 112)"><polygon points="0,-34 30,-17 30,17 0,34 -30,17 -30,-17" fill="url(#navy)" stroke="url(#gold)" stroke-width="3"/><text y="9" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="800" fill="#fff">HD</text></g>
<text x="600" y="170" text-anchor="middle" font-family="${SANS}" font-size="17" font-weight="700" letter-spacing="7" fill="#0f172a">${esc(d.brand.toUpperCase())}</text>
<text x="600" y="246" text-anchor="middle" font-family="${SERIF}" font-size="64" font-weight="700" letter-spacing="12" fill="#0f172a">CERTIFICATE</text>
<text x="600" y="284" text-anchor="middle" font-family="${SANS}" font-size="19" font-weight="700" letter-spacing="9" fill="#b8860b">OF ACHIEVEMENT</text>
<line x1="300" y1="312" x2="560" y2="312" stroke="url(#line)" stroke-width="2"/><line x1="640" y1="312" x2="900" y2="312" stroke="url(#line)" stroke-width="2"/>
<rect x="594" y="306" width="12" height="12" transform="rotate(45 600 312)" fill="url(#gold)"/>

<text x="600" y="356" text-anchor="middle" font-family="${SERIF}" font-size="21" font-style="italic" fill="#475569">This certificate is proudly presented to</text>
<text x="600" y="${(430 + (72 - nameSize) * 0.1).toFixed(0)}" text-anchor="middle" font-family="${SERIF}" font-size="${nameSize.toFixed(0)}" font-style="italic" font-weight="700" fill="#0f172a">${esc(d.name)}</text>
<line x1="270" y1="446" x2="930" y2="446" stroke="url(#line)" stroke-width="2"/>
${chips}
<text x="600" y="550" text-anchor="middle" font-family="${SERIF}" font-size="21" fill="#334155">for successfully completing all ${d.taskCount} coding tasks in the</text>
<text x="600" y="598" text-anchor="middle" font-family="${SANS}" font-size="38" font-weight="800" fill="${d.accent}">${esc(d.trackLabel)} Track</text>
<text x="600" y="632" text-anchor="middle" font-family="${SERIF}" font-size="19" font-style="italic" fill="#64748b">on ${esc(d.brand)}, across Easy, Medium and Hard levels.</text>

<polygon points="565,740 540,812 577,796 600,822 600,740" fill="#7c3aed"/><polygon points="635,740 660,812 623,796 600,822 600,740" fill="#4c1d95"/>
${scallops}
<circle cx="600" cy="700" r="56" fill="url(#gold)"/><circle cx="600" cy="700" r="46" fill="url(#navy)" stroke="#f7e08a" stroke-width="2"/>
<polygon transform="translate(600 698)" points="0,-24 7,-8 24,-7 11,4 15,21 0,12 -15,21 -11,4 -24,-7 -7,-8" fill="url(#gold)"/>
<text x="600" y="728" text-anchor="middle" font-family="${SANS}" font-size="8.5" font-weight="800" letter-spacing="2" fill="#f7e08a">VERIFIED SKILL</text>

<text x="270" y="712" text-anchor="middle" font-family="${SERIF}" font-size="34" font-style="italic" fill="#0f172a">${esc(d.signer)}</text>
<line x1="130" y1="724" x2="410" y2="724" stroke="#0f172a" stroke-width="1.5"/>
<text x="270" y="748" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" fill="#475569">${esc(d.signerRole)}</text>
<text x="930" y="712" text-anchor="middle" font-family="${SERIF}" font-size="26" fill="#0f172a">${esc(d.date)}</text>
<line x1="790" y1="724" x2="1070" y2="724" stroke="#0f172a" stroke-width="1.5"/>
<text x="930" y="748" text-anchor="middle" font-family="${SANS}" font-size="15" font-weight="600" fill="#475569">Date of issue</text>
<text x="930" y="772" text-anchor="middle" font-family="ui-monospace, Consolas, monospace" font-size="14" fill="#64748b">ID ${esc(d.id)}</text>
<text x="600" y="800" text-anchor="middle" font-family="${SANS}" font-size="12" fill="#94a3b8">Practice certificate issued by ${esc(d.brand)} for completed learning tasks. It is not an accredited qualification.</text>
</svg>`;
}

/** Download the certificate as a PNG image. */
export async function downloadCertificatePng(svg: string, filename: string) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1700;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not available");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/png"));
    if (!blob) throw new Error("Could not create the image");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Open a print window so the user can print or save as PDF. */
export function printCertificate(svg: string) {
  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) return false;
  w.document.write(`<!doctype html><title>Certificate</title><style>@page{size:A4 landscape;margin:0}html,body{margin:0}svg{width:100vw;height:auto}</style>${svg}<script>setTimeout(function(){window.print()},300)<\/script>`);
  w.document.close();
  return true;
}
