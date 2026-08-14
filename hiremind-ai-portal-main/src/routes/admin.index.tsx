import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  LayoutDashboard, Plus, List, LogOut, Lock, ShieldAlert, Loader2, Trash2, Pencil,
  Search, Upload, Save, X, Briefcase, TrendingUp, Database, Calendar
} from "lucide-react";
import { auth, ADMIN_EMAIL, type Job } from "../lib/firebase";
import { useAuth } from "../lib/auth-context";
import { fetchJobs, createJob, updateJob, deleteJob, uploadLogo } from "../lib/jobs";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin — Hire Daily" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Tab = "dashboard" | "add" | "manage";

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00e5ff]" />
      </div>
    );
  }
  if (!user) return <LoginCard />;
  if (!isAdmin) return <AccessDenied />;
  return <AdminDashboard />;
}

export function LoginCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      toast.success("Signed in");
    } catch (err) {
      toast.error((err as Error).message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <form onSubmit={onSubmit} className="glass-strong w-full rounded-3xl p-8 animate-scale-in">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] shadow-[0_0_40px_rgba(0,229,255,0.4)]">
          <Lock className="h-6 w-6 text-[#050816]" strokeWidth={2.5} />
        </div>
        <h1 className="mt-6 text-center text-2xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
          Admin Sign In
        </h1>
        <p className="mt-1 text-center text-sm text-white/60">Restricted to authorized personnel only.</p>
        <div className="mt-8 space-y-3">
          <input
            type="email" required autoComplete="email" placeholder="Email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50"
          />
          <input
            type="password" required autoComplete="current-password" placeholder="Password"
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50"
          />
          <button
            type="submit" disabled={busy}
            className="btn-glow flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>
        </div>
      </form>
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="glass w-full rounded-3xl p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 ring-1 ring-red-500/40">
          <ShieldAlert className="h-7 w-7 text-red-400" />
        </div>
        <h1 className="mt-6 text-2xl font-bold text-white">Access Denied</h1>
        <p className="mt-2 text-sm text-white/60">
          This account is not authorized. Only the designated admin email can access this area.
        </p>
        <button onClick={() => signOut(auth)} className="btn-ghost-glow mt-6 rounded-xl px-5 py-2.5 text-sm">
          Sign out
        </button>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const { user } = useAuth();

  const tabs: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "add", label: "Add Job", icon: Plus },
    { id: "manage", label: "Manage Jobs", icon: List },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="glass h-fit rounded-2xl p-3 md:sticky md:top-24">
          <div className="mb-3 px-3 py-2 text-xs text-white/50">
            Signed in as
            <div className="mt-0.5 truncate text-sm text-white">{user?.email}</div>
          </div>
          <nav className="flex flex-row gap-1 md:flex-col">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                  tab === t.id
                    ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
            <button
              onClick={() => signOut(auth).then(() => toast.success("Signed out"))}
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </nav>
        </aside>

        <div>
          {tab === "dashboard" && <DashboardTab />}
          {tab === "add" && <AddJobTab onDone={() => setTab("manage")} />}
          {tab === "manage" && <ManageJobsTab />}
        </div>
      </div>
    </div>
  );
}

function DashboardTab() {
  const { data: jobs } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const list = jobs ?? [];
  const today = list.filter((j) => Date.now() - j.createdAt < 86400000).length;
  const cards = [
    { label: "Today's Jobs", value: today, icon: Calendar, color: "from-[#00e5ff]/20 to-[#22d3ee]/20" },
    { label: "Total Jobs", value: list.length, icon: Briefcase, color: "from-[#7c3aed]/20 to-[#00e5ff]/20" },
    { label: "This Week", value: list.filter((j) => Date.now() - j.createdAt < 7 * 86400000).length, icon: TrendingUp, color: "from-[#22d3ee]/20 to-[#7c3aed]/20" },
    { label: "Storage", value: `${list.filter((j) => j.companyLogo).length} logos`, icon: Database, color: "from-[#7c3aed]/20 to-[#22d3ee]/20" },
  ];
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c, i) => (
          <div key={i} className={`glass gradient-border rounded-2xl bg-gradient-to-br ${c.color} p-5 animate-fade-up`} style={{ animationDelay: `${i * 60}ms` }}>
            <c.icon className="h-6 w-6 text-[#00e5ff]" />
            <div className="mt-4 text-3xl font-bold text-white">{c.value}</div>
            <div className="mt-1 text-xs uppercase tracking-widest text-white/60">{c.label}</div>
          </div>
        ))}
      </div>
      <div className="glass rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white">Recent Jobs</h2>
        <div className="mt-4 space-y-2">
          {list.slice(0, 5).map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-4 py-3 ring-1 ring-white/5">
              <div>
                <div className="font-medium text-white">{j.role}</div>
                <div className="text-xs text-white/50">{j.companyName} · {j.location}</div>
              </div>
              <div className="text-xs text-white/40">{new Date(j.createdAt).toLocaleDateString()}</div>
            </div>
          ))}
          {list.length === 0 && <p className="text-sm text-white/50">No jobs yet.</p>}
        </div>
      </div>
    </div>
  );
}

const EMPTY: Omit<Job, "id" | "createdAt" | "updatedAt"> = {
  companyName: "", companyLogo: "", role: "", salary: "",category:"", location: "",
  experience: "", skills: "", jobType: "Full-time", description: "", applyLink: "", lastDate: "",
};

function AddJobTab({ onDone, editing, onCancel }: { onDone?: () => void; editing?: Job; onCancel?: () => void }) {
  const [form, setForm] = useState<Omit<Job, "id" | "createdAt" | "updatedAt">>(() => {
    if (!editing) return EMPTY;
    const { id, createdAt, updatedAt, ...rest } = editing;
    return rest;
  });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let logoUrl = form.companyLogo;
      if (file) logoUrl = await uploadLogo(file);
      const payload = { ...form, companyLogo: logoUrl };
      if (editing) {
        await updateJob(editing.id, payload);
        toast.success("Job updated");
      } else {
        await createJob(payload);
        toast.success("Job posted successfully");
        setForm(EMPTY); setFile(null);
      }
      qc.invalidateQueries({ queryKey: ["jobs"] });
      onDone?.();
    } catch (err) {
      toast.error((err as Error).message || "Failed to save");
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full rounded-xl bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/50";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>
          {editing ? "Edit Job" : "Add New Job"}
        </h1>
        {editing && onCancel && (
          <button onClick={onCancel} className="btn-ghost-glow flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm">
            <X className="h-4 w-4" /> Cancel
          </button>
        )}
      </div>
      <form onSubmit={submit} className="glass mt-6 space-y-4 rounded-2xl p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <input required placeholder="Company Name" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} className={input} />
          <input required placeholder="Role / Title" value={form.role} onChange={(e) => set("role", e.target.value)} className={input} />
          <select
  required
  value={form.category}
  onChange={(e) => set("category", e.target.value)}
  className={input}
>
  <option value="" className="bg-[#111827]">
    Select Category
  </option>

  <option value="Software Development" className="bg-[#111827]">
    Software Development
  </option>

  <option value="Data Analytics" className="bg-[#111827]">
    Data Analytics
  </option>

  <option value="Data Science" className="bg-[#111827]">
    Data Science
  </option>

  <option value="Cybersecurity" className="bg-[#111827]">
    Cybersecurity
  </option>

  <option value="Cloud & DevOps" className="bg-[#111827]">
    Cloud & DevOps
  </option>

  <option value="AI / ML" className="bg-[#111827]">
    AI / ML
  </option>

  <option value="Business Analyst" className="bg-[#111827]">
    Business Analyst
  </option>

  <option value="QA / Testing" className="bg-[#111827]">
    QA / Testing
  </option>

  <option value="UI / UX" className="bg-[#111827]">
    UI / UX
  </option>

  <option value="Data Engineer" className="bg-[#111827]">
    Data Engineer
  </option>

  <option value="IT Support" className="bg-[#111827]">
    IT Support
  </option>

  <option value="Other" className="bg-[#111827]">
    Other
  </option>
</select>
          <input placeholder="Expected Salary (e.g. 8–12 LPA)" value={form.salary} onChange={(e) => set("salary", e.target.value)} className={input} />

          <select
  value={form.location}
  onChange={(e) => set("location", e.target.value)}
  className={input}
>
  <option value="" className="bg-[#111827]">Select Location</option>

  <option value="Pune" className="bg-[#111827]">Pune</option>
  <option value="Bengaluru" className="bg-[#111827]">Bengaluru</option>
  <option value="Hyderabad" className="bg-[#111827]">Hyderabad</option>
  <option value="Chennai" className="bg-[#111827]">Chennai</option>
  <option value="Mumbai" className="bg-[#111827]">Mumbai</option>
  <option value="Navi Mumbai" className="bg-[#111827]">Navi Mumbai</option>
  <option value="Noida" className="bg-[#111827]">Noida</option>
  <option value="Gurugram" className="bg-[#111827]">Gurugram</option>
  <option value="Kolkata" className="bg-[#111827]">Kolkata</option>
  <option value="Ahmedabad" className="bg-[#111827]">Ahmedabad</option>
  <option value="Remote" className="bg-[#111827]">Remote</option>
   <option value="PAN India" className="bg-[#111827]">PAN India</option>
</select>
<select
  value={form.experience}
  onChange={(e) => set("experience", e.target.value)}
  className={input}
>
  <option value="" className="bg-[#111827]">Select Experience</option>

  <option value="Fresher" className="bg-[#111827]">Fresher</option>
  <option value="0-1 Years" className="bg-[#111827]">0-1 Years</option>
  <option value="1-2 Years" className="bg-[#111827]">1-2 Years</option>
  <option value="2-3 Years" className="bg-[#111827]">2-3 Years</option>
  <option value="3-5 Years" className="bg-[#111827]">3-5 Years</option>
  <option value="5+ Years" className="bg-[#111827]">5+ Years</option>
</select>
          <select value={form.jobType} onChange={(e) => set("jobType", e.target.value)} className={input}>
            {["Full-time", "Part-time", "Internship", "Contract", "Remote","Hybrid"].map((t) => (
              <option key={t} value={t} className="bg-[#111827]">{t}</option>
            ))}
          </select>
          <input placeholder="Skills (comma-separated)" value={form.skills} onChange={(e) => set("skills", e.target.value)} className={`${input} md:col-span-2`} />
          <input required type="url" placeholder="Apply Link (https://…)" value={form.applyLink} onChange={(e) => set("applyLink", e.target.value)} className={input} />
          <div>
            <label className="mb-1.5 block text-xs text-white/45">Application deadline *</label>
            <input
              required
              type="date"
              min={!editing ? new Date().toISOString().slice(0, 10) : undefined}
              value={form.lastDate}
              onChange={(e) => set("lastDate", e.target.value)}
              className={input}
            />
            <p className="mt-1 text-[11px] text-white/40">
              Every new job must have an application deadline. Existing expired jobs can be edited without changing their stored date.
            </p>
          </div>
        </div>
        <textarea required placeholder="Job description…" value={form.description} onChange={(e) => set("description", e.target.value)} rows={6} className={input} />

        <div>
          <label className="btn-ghost-glow flex cursor-pointer items-center gap-2 rounded-xl px-4 py-3 text-sm w-fit">
            <Upload className="h-4 w-4" />
            {file ? file.name : form.companyLogo ? "Replace logo" : "Upload company logo"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          {(file || form.companyLogo) && (
            <div className="mt-3 flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl ring-1 ring-white/10">
              <img src={file ? URL.createObjectURL(file) : form.companyLogo} alt="preview" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        <button type="submit" disabled={busy} className="btn-glow flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? "Update Job" : "Post Job"}
        </button>
      </form>
    </div>
  );
}

function ManageJobsTab() {
  const { data: jobs, isLoading } = useQuery({ queryKey: ["jobs"], queryFn: fetchJobs });
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Job | null>(null);
  const [confirmDel, setConfirmDel] = useState<Job | null>(null);
  const perPage = 8;

  const list = (jobs ?? []).filter((j) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return `${j.role} ${j.companyName} ${j.location}`.toLowerCase().includes(t);
  });
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const paged = list.slice((page - 1) * perPage, page * perPage);

  if (editing) {
    return <AddJobTab editing={editing} onCancel={() => setEditing(null)} onDone={() => setEditing(null)} />;
  }

  const doDelete = async () => {
    if (!confirmDel) return;
    try {
      await deleteJob(confirmDel.id, confirmDel.companyLogo);
      toast.success("Job deleted");
      qc.invalidateQueries({ queryKey: ["jobs"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setConfirmDel(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Manage Jobs</h1>
      </div>
      <div className="glass mt-6 rounded-2xl">
        <div className="border-b border-white/5 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <input
              placeholder="Search jobs…"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="w-full rounded-xl bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-[#00e5ff]/40"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-white/50">Loading…</div>
        ) : paged.length === 0 ? (
          <div className="p-12 text-center text-white/50">No jobs found.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {paged.map((j) => (
              <div key={j.id} className="flex items-center gap-3 p-4 hover:bg-white/[0.02]">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
                  {j.companyLogo ? <img src={j.companyLogo} alt="" className="h-full w-full object-cover" /> : <span className="text-sm font-bold text-white/70">{j.companyName[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-white">{j.role}</div>
                  <div className="truncate text-xs text-white/50">{j.companyName} · {j.location}</div>
                </div>
                <div className="hidden text-xs text-white/40 md:block">{new Date(j.createdAt).toLocaleDateString()}</div>
                <button onClick={() => setEditing(j)} className="btn-ghost-glow rounded-lg p-2" aria-label="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                <button onClick={() => setConfirmDel(j)} className="btn-ghost-glow rounded-lg p-2 hover:!bg-red-500/10 hover:!border-red-500/30 hover:!text-red-300" aria-label="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 p-4">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost-glow rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
            <span className="text-xs text-white/60">Page {page} / {totalPages}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="btn-ghost-glow rounded-lg px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
          </div>
        )}
      </div>

      {confirmDel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-up">
          <div className="glass-strong w-full max-w-md rounded-2xl p-6 animate-scale-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/20 ring-1 ring-red-500/40">
              <Trash2 className="h-5 w-5 text-red-400" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-white">Delete this job?</h2>
            <p className="mt-1 text-sm text-white/60">
              This will permanently remove <span className="text-white">{confirmDel.role}</span> at {confirmDel.companyName}. This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="btn-ghost-glow rounded-xl px-4 py-2 text-sm">Cancel</button>
              <button onClick={doDelete} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// keep TS from complaining about unused import
void ADMIN_EMAIL;