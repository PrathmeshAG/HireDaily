import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { signOut } from "firebase/auth";
import { toast } from "sonner";
import {
  LayoutDashboard, Link2, ListChecks, MessageSquareText, Users, ScrollText,
  BarChart3, Settings, LogOut, Loader2, ArrowLeft, Instagram,
} from "lucide-react";
import { auth } from "../../lib/firebase";
import { useAuth } from "../../lib/auth-context";
import { LoginCard, AccessDenied } from "../../routes/admin.index";

import { DashboardPage } from "./pages/dashboard-page";
import { PostMappingPage } from "./pages/post-mapping-page";
import { RulesPage } from "./pages/rules-page";
import { TemplatesPage } from "./pages/templates-page";
import { UsersPage } from "./pages/users-page";
import { LogsPage } from "./pages/logs-page";
import { AnalyticsPage } from "./pages/analytics-page";
import { SettingsPage } from "./pages/settings-page";

export type PageId =
  | "dashboard" | "mappings" | "rules" | "templates" | "users" | "logs" | "analytics" | "settings";

// Top-level export for the /admin/automation route. Reuses the exact same
// auth gate as /admin (LoginCard / AccessDenied / loading spinner) — nothing
// here duplicates that logic, it's imported from admin.index.tsx.
export function AutomationApp() {
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
  return <AutomationDashboard />;
}

function AutomationDashboard() {
  const [page, setPage] = useState<PageId>("dashboard");
  const { user } = useAuth();

  const nav: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "mappings", label: "Post Mapping", icon: Link2 },
    { id: "rules", label: "Rules", icon: ListChecks },
    { id: "templates", label: "Templates", icon: MessageSquareText },
    { id: "users", label: "Users", icon: Users },
    { id: "logs", label: "Logs", icon: ScrollText },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="glass h-fit rounded-2xl p-3 md:sticky md:top-24">
          <div className="mb-3 px-3 py-2">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <Instagram className="h-3.5 w-3.5 text-[#00e5ff]" /> Automation
            </div>
            <div className="mt-0.5 truncate text-sm text-white">{user?.email}</div>
          </div>
          <nav className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap">
            {nav.map((t) => (
              <button
                key={t.id}
                onClick={() => setPage(t.id)}
                className={`flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition md:flex-none ${
                  page === t.id
                    ? "bg-gradient-to-r from-[#00e5ff]/20 to-[#7c3aed]/20 text-white ring-1 ring-[#00e5ff]/30"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden md:inline">{t.label}</span>
              </button>
            ))}
            <Link
              to="/admin"
              className="mt-2 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden md:inline">Job Admin</span>
            </Link>
            <button
              onClick={() => signOut(auth).then(() => toast.success("Signed out"))}
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/70 hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </button>
          </nav>
        </aside>

        <div>
          {page === "dashboard" && <DashboardPage onNavigate={setPage} />}
          {page === "mappings" && <PostMappingPage />}
          {page === "rules" && <RulesPage />}
          {page === "templates" && <TemplatesPage />}
          {page === "users" && <UsersPage />}
          {page === "logs" && <LogsPage />}
          {page === "analytics" && <AnalyticsPage />}
          {page === "settings" && <SettingsPage onNavigate={(target) => setPage(target)} />}
        </div>
      </div>
    </div>
  );
}
