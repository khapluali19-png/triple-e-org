"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { DEFAULT_BRANDING } from "@/lib/constants";
import { WebsiteBrandingConfig } from "@/lib/types";

function getClientCountdownCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)countdown_enabled=([^;]+)/);
  if (!match) return null;
  return match[1] === "true";
}

interface HeaderProps {
  branding?: WebsiteBrandingConfig;
}

export default function Header({ branding = DEFAULT_BRANDING }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCountdown, setIsCountdown] = useState(() => {
    const cookieState = getClientCountdownCookie();
    if (cookieState !== null) return cookieState;
    return Boolean(branding.countdown?.enabled);
  });

  useEffect(() => {
    const cookieState = getClientCountdownCookie();
    if (cookieState !== null) {
      setIsCountdown(cookieState);
    } else {
      setIsCountdown(Boolean(branding.countdown?.enabled));
    }
  }, [branding.countdown?.enabled]);

  useEffect(() => {
    async function syncStatus() {
      try {
        const res = await fetch("/api/branding", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.branding?.countdown) {
            setIsCountdown(Boolean(data.branding.countdown.enabled));
          }
        }
      } catch {}
    }
    syncStatus();

    const handleEvent = (e: any) => {
      if (typeof e.detail === "boolean") {
        setIsCountdown(e.detail);
      }
    };
    window.addEventListener("countdown-toggle", handleEvent);
    return () => window.removeEventListener("countdown-toggle", handleEvent);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#E6E9EE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Left: Organization Logo & Title */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-full overflow-hidden border border-slate-200 group-hover:border-[#183153] transition-colors bg-white shrink-0">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={branding.organizationName}
                fill
                className="object-contain p-0.5"
                priority
              />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-heading font-bold text-sm sm:text-base text-[#183153] leading-tight tracking-tight">
                {branding.organizationName}
              </span>
              <span className="text-[10px] text-[#737B85] tracking-wider uppercase font-medium hidden sm:block">
                {branding.organizationRegion || "District Ghanche, Gilgit-Baltistan, Pakistan"}
              </span>
            </div>
          </Link>

          {/* Center: Slim Horizontal Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-[#20252B] hover:text-[#183153] transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#about"
              className="text-sm font-medium text-[#737B85] hover:text-[#183153] transition-colors"
            >
              About the Competition
            </Link>
            <Link
              href="/#categories"
              className="text-sm font-medium text-[#737B85] hover:text-[#183153] transition-colors"
            >
              Competition Levels
            </Link>
            <Link
              href="/#instructions"
              className="text-sm font-medium text-[#737B85] hover:text-[#183153] transition-colors"
            >
              How to Check
            </Link>
          </nav>

          {/* Right: Simple, Prominent "Check Result" Action */}
          <div className="hidden sm:flex items-center">
            <Link
              href={isCountdown ? "/#result-announcement" : "/#result-lookup"}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-[#183153] hover:bg-[#12243d] text-white shadow-xs transition-colors"
            >
              {isCountdown ? "Announcement" : "Check Result"}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-[#20252B] hover:bg-slate-100 transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E6E9EE] px-4 pt-3 pb-5 space-y-2.5 shadow-sm animate-in slide-in-from-top-1 duration-150">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#20252B] hover:bg-slate-50"
          >
            Home
          </Link>
          <Link
            href="/#about"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#737B85] hover:bg-slate-50 hover:text-[#183153]"
          >
            About the Competition
          </Link>
          <Link
            href="/#categories"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#737B85] hover:bg-slate-50 hover:text-[#183153]"
          >
            Competition Levels
          </Link>
          <Link
            href="/#instructions"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-medium text-[#737B85] hover:bg-slate-50 hover:text-[#183153]"
          >
            How to Check
          </Link>
          <div className="pt-2">
            <Link
              href={isCountdown ? "/#result-announcement" : "/#result-lookup"}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold bg-[#183153] hover:bg-[#12243d] text-white transition-colors"
            >
              {isCountdown ? "Announcement" : "Check Result"}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
