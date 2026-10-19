"use client";

import { Menu, ExternalLink, RefreshCw, Database, KeyRound, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  adminEmail?: string;
  onOpenMobile?: () => void;
  onSyncTrigger?: () => void;
  onOpenChangePassword?: () => void;
  isSyncing?: boolean;
}

export default function AdminHeader({
  title,
  subtitle,
  adminEmail = "khapluali19@gmail.com",
  onOpenMobile,
  onSyncTrigger,
  onOpenChangePassword,
  isSyncing = false,
}: AdminHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3">
        {onOpenMobile && (
          <button
            onClick={onOpenMobile}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-navy-950 hover:bg-slate-100"
            aria-label="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="font-serif text-lg sm:text-xl font-bold text-navy-950 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Admin User Pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-xs">
          <User className="w-3.5 h-3.5 text-navy-700" />
          <span className="font-mono text-slate-700 font-medium">{adminEmail}</span>
        </div>

        {/* Change Password Button */}
        {onOpenChangePassword && (
          <button
            onClick={onOpenChangePassword}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
            title="Change administrator password"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-500" />
            <span>Password</span>
          </button>
        )}

        {/* Sync Trigger button */}
        {onSyncTrigger && (
          <button
            onClick={onSyncTrigger}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-900 disabled:bg-slate-300 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">{isSyncing ? "Syncing..." : "Sync Sheets"}</span>
          </button>
        )}

        {/* View Public Portal */}
        <a
          href="/"
          target="_blank"
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          <span>Public Portal</span>
        </a>

        {/* Sign Out Action */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-red-700 hover:bg-red-50 text-xs font-medium transition-colors border border-transparent hover:border-red-200"
          title="Sign out of admin session"
        >
          <LogOut className="w-3.5 h-3.5 text-red-500" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
