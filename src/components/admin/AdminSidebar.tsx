"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Table, 
  Award, 
  Settings, 
  Share2, 
  ExternalLink, 
  Eye, 
  LogOut,
  ShieldCheck,
  ChevronRight,
  KeyRound
} from "lucide-react";

interface AdminSidebarProps {
  onCloseMobile?: () => void;
  onOpenChangePassword?: () => void;
}

export default function AdminSidebar({ onCloseMobile, onOpenChangePassword }: AdminSidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Google Sheets Sync", href: "/admin/sheets", icon: Table },
    { name: "Result Categories", href: "/admin/categories", icon: Award },
    { name: "Website Branding", href: "/admin/branding", icon: Settings },
    { name: "Social & Contact", href: "/admin/social", icon: Share2 },
    { name: "Portal Live Preview", href: "/admin/preview", icon: Eye },
  ];

  return (
    <aside className="w-64 bg-navy-950 text-white flex flex-col h-full border-r border-navy-800 shrink-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-navy-800">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white p-0.5 border border-gold-400 shrink-0">
            <Image
              src="/images/logos/triple-e-logo.jpg"
              alt="Triple E Organization"
              fill
              className="object-contain"
            />
          </div>
          <div className="overflow-hidden">
            <h2 className="font-serif font-bold text-sm tracking-tight text-white truncate">
              Triple-E Admin
            </h2>
            <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold block">
              2nd Quiz Competition
            </span>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Management Console
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? "bg-navy-850 text-gold-300 border border-gold-500/30 shadow-xs"
                  : "text-slate-300 hover:bg-navy-900 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-gold-400" : "text-slate-400"}`} />
                <span>{item.name}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-gold-400" />}
            </Link>
          );
        })}

        {onOpenChangePassword && (
          <div className="pt-2 border-t border-navy-900 mt-2">
            <button
              type="button"
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
                onOpenChangePassword();
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold text-slate-300 hover:bg-navy-900 hover:text-white transition-all text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-gold-400" />
                <span>Change Password</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>
        )}
      </nav>

      {/* Footer / Exit */}
      <div className="p-4 border-t border-navy-800 space-y-2">
        <Link
          href="/"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:bg-navy-900 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-slate-400" />
            <span>Open Public Portal</span>
          </div>
          <span className="text-[10px] bg-navy-800 text-slate-300 px-1.5 py-0.5 rounded">Live</span>
        </Link>

        <Link
          href="/admin/login"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-300 hover:bg-red-950/40 hover:text-red-200 transition-colors"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Exit / Sign Out</span>
        </Link>

        <div className="pt-2 px-1 text-[10px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Session: Examination Cell</span>
        </div>
      </div>
    </aside>
  );
}
