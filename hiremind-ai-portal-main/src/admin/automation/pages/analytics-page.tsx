import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { getAnalytics } from "../services/automation-service";

const tooltipStyle = {
  background: "#0b1220",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#fff",
};

export function AnalyticsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["automation", "analytics"], queryFn: getAnalytics });

  const dailyData = (data?.daily ?? []).map((d) => ({
    date: d.date.slice(5),
    Comments: d.repliesSent,
    DMs: d.dmsSent,
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-white" style={{ fontFamily: "'Space Grotesk'" }}>Analytics</h1>
      <p className="mt-1 text-sm text-white/50">Last 14 days of automation activity.</p>

      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Daily Activity</h2>
        <div className="mt-4 h-64">
          {isLoading ? (
            <div className="shimmer-loading h-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="commentsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5ff" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dmsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="Comments" stroke="#00e5ff" fill="url(#commentsGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="DMs" stroke="#7c3aed" fill="url(#dmsGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-white/60">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#00e5ff]" /> Comments</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#7c3aed]" /> DMs</span>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top Keywords</h2>
          <div className="mt-4 h-56">
            {isLoading ? (
              <div className="shimmer-loading h-full rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.topKeywords ?? []} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" stroke="rgba(255,255,255,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="keyword" type="category" stroke="rgba(255,255,255,0.6)" fontSize={12} tickLine={false} axisLine={false} width={70} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="count" fill="#00e5ff" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white/50">Top Posts</h2>
          <div className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }, (_, i) => <div key={i} className="shimmer-loading h-8 rounded-lg" />)
            ) : (
              (data?.topPosts ?? []).map((p) => {
                const max = data?.topPosts[0]?.triggers || 1;
                return (
                  <div key={p.postLabel}>
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate text-white/75">{p.postLabel}</span>
                      <span className="shrink-0 text-white/50">{p.triggers}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-[#00e5ff] to-[#7c3aed]"
                        style={{ width: `${(p.triggers / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
