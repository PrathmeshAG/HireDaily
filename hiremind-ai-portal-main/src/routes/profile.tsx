import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { sendPasswordResetEmail, signOut, updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { ArrowRight, CalendarDays, KeyRound, Loader2, LogOut, Mail, Pencil, ShieldCheck } from "lucide-react";
import { auth } from "../lib/firebase";
import { useAuth } from "../lib/auth-context";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [
      { title: "Your Profile — Hire Daily" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "twitter:title", content: "Your Profile — Hire Daily" },
    ],
  }),
});

const card =
  "rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.035]";

function ProfilePage() {
  const { user, loading } = useAuth();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(user?.displayName ?? "");
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#0891a6] dark:text-[#00e5ff]" />
      </div>
    );
  }

  if (!user) {
    return (
      <section className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Sign in to see your profile</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-white/55">
          Use the Account button in the top menu to sign in or create a free account.
        </p>
        <Link to="/jobs" className="btn-glow mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">
          Browse jobs <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const shown = user.displayName?.trim() || user.email?.split("@")[0] || "Member";
  const initial = shown[0]?.toUpperCase() ?? "U";
  const since = user.metadata.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "Recently";
  const providers = user.providerData.map((p) => (p.providerId === "google.com" ? "Google" : "Email and password")).join(", ");
  const canReset = user.providerData.some((p) => p.providerId === "password");

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Please enter your full name.");
    setBusy(true);
    try {
      await updateProfile(user, { displayName: name.trim() });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Could not update your name. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast.success("Password reset link sent to your email.");
    } catch {
      toast.error("Could not send the reset link. Please try again.");
    }
  };

  const rows = [
    { icon: Mail, label: "Email", value: user.email ?? "Not available" },
    { icon: CalendarDays, label: "Member since", value: since },
    { icon: ShieldCheck, label: "Sign-in method", value: providers || "Email and password" },
  ];

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className={`overflow-hidden ${card}`}>
        <div className="h-24 bg-gradient-to-r from-[#00e5ff]/30 via-[#7c3aed]/30 to-[#00e5ff]/20 sm:h-28" />
        <div className="px-5 pb-6 sm:px-8 sm:pb-8">
          <div className="-mt-10 flex flex-wrap items-end justify-between gap-4 sm:-mt-12">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] text-3xl font-bold text-[#050816] shadow-lg sm:h-24 sm:w-24 dark:border-[#050816]">
              {user.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initial}
            </div>
            <button
              onClick={() => signOut(auth).then(() => toast.success("Signed out"))}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:border-red-400/30 dark:hover:bg-red-400/10 dark:hover:text-red-200"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>

          {editing ? (
            <form onSubmit={save} className="mt-5 flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Full name"
                autoFocus
                className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none focus:border-[#0891a6] focus:ring-4 focus:ring-[#00e5ff]/10 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
              <button disabled={busy} className="btn-glow rounded-xl px-5 text-sm font-semibold disabled:opacity-60">{busy ? "Saving…" : "Save"}</button>
              <button type="button" onClick={() => { setEditing(false); setName(user.displayName ?? ""); }} className="rounded-xl px-4 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10">Cancel</button>
            </form>
          ) : (
            <div className="mt-5 flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{shown}</h1>
              <button onClick={() => setEditing(true)} aria-label="Edit name" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white">
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}

          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
                <dt className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-white/45"><Icon className="h-3.5 w-3.5" />{label}</dt>
                <dd className="mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-white/90">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/jobs" className="btn-glow inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold">
              Browse jobs <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/preparation/coding-practice" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5">
              Practice coding
            </Link>
            {canReset && (
              <button onClick={reset} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-white/60 dark:hover:bg-white/10">
                <KeyRound className="h-4 w-4" /> Change password
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
