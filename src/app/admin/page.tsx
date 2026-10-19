"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Table, 
  Award, 
  Settings, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  RefreshCw, 
  FileSpreadsheet, 
  ShieldCheck, 
  ChevronRight, 
  History, 
  Share2,
  AlertCircle,
  HelpCircle
} from "lucide-react";

interface CategoryHealthItem {
  id: string;
  title: string;
  status: string;
  hasSpreadsheetId: boolean;
  worksheetName: string;
  lastTestedAt: string | null;
  lastSyncedAt: string | null;
  lastError?: string;
  missingRollNumberMapping: boolean;
  missingNameMapping: boolean;
  missingMarksMapping: boolean;
}

interface OverviewData {
  connectedCategoriesCount: number;
  totalCategoriesCount: number;
  categoryHealth: CategoryHealthItem[];
  missingWarnings: string[];
  serviceAccountConfigured: boolean;
  serviceAccountEmail?: string;
  recentActivities: {
    id: string;
    timestamp: string;
    action: string;
    actor: string;
    details: string;
  }[];
  brandingSummary: {
    competitionTitle: string;
    organizationName: string;
    resultsPublished: boolean;
  };
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        const json = await res.json();
        if (json.overview) {
          setData(json.overview);
        }
      }
    } catch (err) {
      console.error("Failed to load admin overview:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 rounded-2xl p-6 sm:p-8 text-white border border-navy-800 shadow-elevated relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-wider text-gold-400 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Triple-E Organization Examination Board</span>
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight">
              {data?.brandingSummary.competitionTitle || "2nd Quiz Competition Results Dashboard"}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Real-time Google Sheets ledger synchronization, category mapping health, website branding, and candidate verification controls across Gilgit-Baltistan.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href="/admin/sheets"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-navy-950 text-xs font-bold transition-all shadow-xs"
            >
              <Table className="w-4 h-4" />
              <span>Manage Sheets</span>
            </Link>
            <Link
              href="/admin/preview"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-white text-xs font-semibold border border-navy-700 transition-colors"
            >
              <Eye className="w-4 h-4 text-slate-300" />
              <span>Live Portal Preview</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row: Real Verified Connection Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Verified Connected Sheets */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Connected Tracks</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-serif font-bold text-navy-950">
              {data ? `${data.connectedCategoriesCount} / ${data.totalCategoriesCount}` : "..."}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Independently verified ledgers</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Service Account Pipeline Health */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">API Authentication</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl font-serif font-bold text-navy-950">
              Service Account
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {data?.serviceAccountConfigured ? "GCP Keyfile Active" : "Local Benchmark Ready"}
            </p>
          </div>
        </div>

        {/* Metric 3: Public Result Portal Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Public Status</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-navy-950">
              Live &amp; Searchable
            </div>
            <p className="text-xs text-emerald-700 font-medium mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Result lookup active</span>
            </p>
          </div>
        </div>

        {/* Metric 4: Configuration Integrity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-subtle space-y-3">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Config Warnings</span>
            <div className={`p-2 rounded-lg ${
              data?.missingWarnings && data.missingWarnings.length > 0 
                ? "bg-amber-50 text-amber-700" 
                : "bg-emerald-50 text-emerald-700"
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-serif font-bold text-navy-950">
              {data ? data.missingWarnings.length : 0} Items
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {data?.missingWarnings && data.missingWarnings.length === 0
                ? "All requirements satisfied"
                : "Requires admin attention"}
            </p>
          </div>
        </div>
      </div>

      {/* Warnings Banner (If any missing configurations exist) */}
      {data?.missingWarnings && data.missingWarnings.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Missing Configuration Checklist</span>
          </div>
          <ul className="space-y-1 text-xs text-amber-800">
            {data.missingWarnings.map((warn, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-amber-500 font-bold">•</span>
                <span>{warn}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Google Sheets Connection Health per Category */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-serif text-lg font-bold text-navy-950">
              Category Sheet Connection Health
            </h3>
            <p className="text-xs text-slate-500">
              Independently linked Google Sheets and worksheet tabs powering student scorecard verification.
            </p>
          </div>
          <Link
            href="/admin/sheets"
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>Open Sheets Manager</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {data?.categoryHealth.map((cat) => {
            const isConn = cat.status === "connected" && cat.hasSpreadsheetId;
            return (
              <div
                key={cat.id}
                className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 transition-all ${
                  isConn
                    ? "bg-slate-50/70 border-slate-200"
                    : "bg-red-50/50 border-red-200"
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Category Track
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isConn
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-red-50 text-red-800 border-red-200"
                      }`}
                    >
                      {isConn ? "Verified" : "Unconnected"}
                    </span>
                  </div>

                  <h4 className="font-serif text-base font-bold text-navy-950">
                    {cat.title}
                  </h4>

                  <div className="space-y-1 text-xs text-slate-600 font-mono text-[11px]">
                    <p className="truncate">Tab: {cat.worksheetName || "Not assigned"}</p>
                    <p className="text-[10px] text-slate-400">
                      Last Check: {cat.lastTestedAt ? new Date(cat.lastTestedAt).toLocaleDateString() : "Never"}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px]">
                    {cat.missingRollNumberMapping ? "⚠️ Mapping needed" : "✓ Columns mapped"}
                  </span>
                  <Link
                    href="/admin/sheets"
                    className="text-navy-900 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>Configure</span>
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Links & Administrative Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 space-y-5">
          <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
            Management Shortcuts
          </h3>

          <div className="space-y-2.5">
            <Link
              href="/admin/sheets"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <Table className="w-4 h-4" />
                </div>
                <span>Google Sheets Manager</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/branding"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <Settings className="w-4 h-4" />
                </div>
                <span>Website Branding &amp; Headlines</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/social"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                  <Share2 className="w-4 h-4" />
                </div>
                <span>Social Media &amp; Candidate Helpline</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>

            <Link
              href="/admin/preview"
              className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-xs font-semibold text-slate-800"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Eye className="w-4 h-4" />
                </div>
                <span>Live Viewport Simulator</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Right: Recent Administrative Activity Trail (Without Student PII) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-subtle p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-navy-800" />
              <h3 className="font-serif text-base font-bold text-navy-950">
                Recent Administrative Activity
              </h3>
            </div>
            <span className="text-[11px] text-slate-400">PII Redacted</span>
          </div>

          <div className="space-y-3">
            {data?.recentActivities && data.recentActivities.length > 0 ? (
              data.recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-950">{act.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px]">{act.details}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    By: {act.actor}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">
                No recent activity logged yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
