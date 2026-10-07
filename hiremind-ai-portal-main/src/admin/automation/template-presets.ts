import type { TemplateKind } from "./types";

export interface TemplatePreset {
  id: string;
  kind: TemplateKind;
  name: string;
  /** Short line shown on the gallery card. */
  tagline: string;
  text: string;
}

/**
 * Ready-made, emoji-rich templates. Variables: {{username}} {{title}}
 * {{company}} {{location}} {{jobLink}}. In DM templates, [[CTA:Label]] adds a
 * native button (single link). With 2+ links, {{jobLink}} becomes a numbered
 * names list and every link gets its own button.
 */
export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: "c-inbox",
    kind: "comment",
    name: "🔥 Check your inbox",
    tagline: "Short, punchy public reply",
    text: "Hey {{username}}! 🔥 Job details sent to your DM 📩\nGo check your inbox now! 🚀",
  },
  {
    id: "c-hinglish",
    kind: "comment",
    name: "🎯 Hinglish friendly",
    tagline: "Casual tone, tells them where to look",
    text: "Done {{username}}! 🎯 {{title}} @ {{company}} ka link tumhare DM mein hai 💌\nNa dikhe to Message Requests bhi check karo 😉 All the best! 🤞",
  },
  {
    id: "c-link",
    kind: "comment",
    name: "👇 Link in comment",
    tagline: "Puts the link right in the public reply",
    text: "Hi {{username}}! 👋 Apply here 👇\n{{jobLink}}\n\nBest of luck! 🍀",
  },
  {
    id: "d-apply",
    kind: "dm",
    name: "🚀 Job card + Apply button",
    tagline: "Clean job summary with one big button",
    text: "Hi {{username}}! 👋🚀\n\n💼 {{title}}\n🏢 {{company}}\n📍 {{location}}\n\nTap the button below to view details & apply 👇\n\n[[CTA:Apply Now 🚀]]",
  },
  {
    id: "d-follow",
    kind: "dm",
    name: "🎉 Thanks + follow nudge",
    tagline: "Warm welcome and a reminder to follow",
    text: "Hey {{username}}! 🎉 Thanks for commenting!\n\nHere's your {{title}} opportunity at {{company}} 💼\n\n💡 Pro tip: follow @hire_daily for fresh jobs every single day! 🔔\n\n[[CTA:View Job 💼]]",
  },
  {
    id: "d-multi",
    kind: "dm",
    name: "📚 Multiple jobs (buttons)",
    tagline: "Best for posts with 2-5 jobs. One button per job",
    text: "Hi {{username}}! 🙌\n\nYou asked, we delivered 🎁 Here are all the openings from this post 👇\n\n{{jobLink}}\n\nTap a button to apply ✅ Best of luck! 🍀",
  },
  {
    id: "d-quick",
    kind: "dm",
    name: "⚡ Short & sweet",
    tagline: "One-liner for fast replies",
    text: "⚡ Hi {{username}}! {{title}} at {{company}} ({{location}}). Apply before it closes! ⏳\n\n[[CTA:Apply Here ⚡]]",
  },
];
