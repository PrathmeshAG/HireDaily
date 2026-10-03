import { useEffect, useState, type FormEvent } from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import { toast } from "sonner";
import { Chrome, Eye, EyeOff, Loader2, Lock, Mail, User, X } from "lucide-react";
import { auth } from "../lib/firebase";

type Mode = "signin" | "signup";

const friendly = (code?: string) => {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled yet.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
};

const fieldCls =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 text-base text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0891a6] focus:bg-white focus:ring-4 focus:ring-[#00e5ff]/10 sm:text-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:placeholder:text-white/25 dark:focus:border-[#00e5ff]/50 dark:focus:bg-white/[0.06]";

function Field({
  label, icon: Icon, value, onChange, type = "text", placeholder, autoComplete,
}: {
  label: string; icon: typeof Mail; value: string; onChange: (v: string) => void;
  type?: string; placeholder: string; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-white/60">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/35" />
        <input
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          type={isPassword && show ? "text" : type}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={`${fieldCls} ${isPassword ? "pr-12" : "pr-4"}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:text-white/35 dark:hover:text-white/70"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

export function AuthSheet({
  mode, onClose, onSwitch,
}: {
  mode: Mode | null;
  onClose: () => void;
  onSwitch: (m: Mode) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    setReset(false);
  }, [mode]);

  if (!mode) return null;

  const done = (message: string) => {
    toast.success(message);
    setPassword("");
    setConfirm("");
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!reset && mode === "signup") {
      if (name.trim().length < 2) return setError("Please enter your full name.");
      if (password !== confirm) return setError("Passwords do not match.");
    }
    setBusy(true);
    try {
      if (reset) {
        await sendPasswordResetEmail(auth, email.trim());
        toast.success("Password reset link sent. Check your inbox and spam folder.");
        setReset(false);
      } else if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        done("Signed in successfully");
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.trim() });
        done("Account created. Welcome to Hire Daily!");
      }
    } catch (err) {
      setError(friendly((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError("");
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      done("Signed in with Google");
    } catch (err) {
      setError(friendly((err as { code?: string }).code));
    } finally {
      setBusy(false);
    }
  };

  const title = reset ? "Reset password" : mode === "signin" ? "Welcome back" : "Create your account";
  const sub = reset
    ? "Enter your email and we will send you a reset link."
    : mode === "signin"
      ? "Sign in to see your profile on Hire Daily."
      : "A free account gives you a profile. It takes less than a minute.";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-md sm:items-center sm:p-4 dark:bg-black/70"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <div
        className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.25)] sm:rounded-3xl dark:border-white/10 dark:bg-[#090b12] dark:shadow-[0_30px_100px_rgba(0,0,0,0.6)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="h-1 bg-gradient-to-r from-[#00e5ff] via-[#7c3aed] to-[#00e5ff]" />
        <div className="flex justify-end px-3 pt-2 sm:px-4 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pb-8">
          <div className="text-center">
            <h2 id="auth-title" className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-white/50">{sub}</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {!reset && mode === "signup" && (
              <Field label="Full name" icon={User} value={name} onChange={setName} placeholder="Your name" autoComplete="name" />
            )}
            <Field label="Email address" icon={Mail} type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            {!reset && (
              <Field label="Password" icon={Lock} type="password" value={password} onChange={setPassword} placeholder="At least 6 characters" autoComplete={mode === "signin" ? "current-password" : "new-password"} />
            )}
            {!reset && mode === "signup" && (
              <Field label="Re-enter password" icon={Lock} type="password" value={confirm} onChange={setConfirm} placeholder="Repeat password" autoComplete="new-password" />
            )}

            {mode === "signin" && !reset && (
              <button type="button" onClick={() => { setReset(true); setError(""); }} className="text-xs font-semibold text-[#0891a6] hover:underline dark:text-[#00e5ff]">
                Forgot password?
              </button>
            )}

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-glow flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {reset ? "Send reset link" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            {!reset && (
              <>
                <div className="flex items-center gap-3 py-1">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                  <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-white/30">or</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                </div>
                <button type="button" onClick={google} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">
                  <Chrome className="h-4 w-4" /> Continue with Google
                </button>
              </>
            )}
          </form>

          <p className="mt-5 text-center text-sm text-slate-600 dark:text-white/45">
            {reset ? (
              <button type="button" onClick={() => setReset(false)} className="font-semibold text-[#0891a6] hover:underline dark:text-[#00e5ff]">Back to sign in</button>
            ) : (
              <>
                {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
                <button type="button" onClick={() => onSwitch(mode === "signin" ? "signup" : "signin")} className="font-semibold text-[#0891a6] hover:underline dark:text-[#00e5ff]">
                  {mode === "signin" ? "Create an account" : "Sign in"}
                </button>
              </>
            )}
          </p>
          <p className="mt-4 text-center text-[11px] leading-5 text-slate-400 dark:text-white/30">
            By continuing you agree to our Terms and Privacy Policy. Sign-in is handled by Firebase Authentication.
          </p>
        </div>
      </div>
    </div>
  );
}
