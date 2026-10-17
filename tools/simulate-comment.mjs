// Nakli (signed) Instagram comment preview/prod URL par bhejta hai. Node 18+.
// Use:
//   APP_SECRET=<META_APP_SECRET> node simulate-comment.mjs <https://preview-url> <mediaId> "job please" [username]
// Vercel Deployment Protection on ho to: BYPASS=<Protection Bypass for Automation secret> bhi do.
// DRY RUN mein asli Instagram ko kuch nahi jata. Comment id nakli hota hai (test_...).
import { createHmac } from "node:crypto";

const [base, mediaId, text = "job", username = "test_user"] = process.argv.slice(2);
const secret = (process.env.APP_SECRET || "").trim();
if (!base || !mediaId || !secret) {
  console.error('Use: APP_SECRET=... node simulate-comment.mjs <https://preview-url> <mediaId> "job please" [username]');
  process.exit(1);
}
const id = "test_" + Date.now();
const body = JSON.stringify({
  object: "instagram",
  entry: [{ id: "0", time: Math.floor(Date.now() / 1000), changes: [{ field: "comments", value: {
    id, text, from: { id: "9" + Date.now(), username }, media: { id: mediaId },
  } }] }],
});
// Meta jaisa: non-ASCII ko \uXXXX karke sign (emoji/Hindi comment bhi chale)
let esc = ""; for (const ch of body) for (let i = 0; i < ch.length; i++) { const c = ch.charCodeAt(i); esc += c > 0x7f ? "\\u" + c.toString(16).padStart(4, "0") : ch[i]; }
const sig = "sha256=" + createHmac("sha256", secret).update(esc).digest("hex");
const headers = { "Content-Type": "application/json", "x-hub-signature-256": sig };
if (process.env.BYPASS) headers["x-vercel-protection-bypass"] = process.env.BYPASS;

const res = await fetch(base.replace(/\/$/, "") + "/webhooks/instagram", { method: "POST", headers, body });
console.log("HTTP", res.status, (await res.text()).slice(0, 200));
console.log("comment id:", id, "-> /emergency-admin ke Recent activity mein dekho");
