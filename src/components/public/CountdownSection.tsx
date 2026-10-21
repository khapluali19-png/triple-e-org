"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Calendar, MapPin, Award, Clock } from "lucide-react";
import { WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING } from "@/lib/constants";

interface CountdownSectionProps {
  branding?: WebsiteBrandingConfig;
}

interface TimeRemaining {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

const DEFAULT_TARGET_ISO = "2026-10-25T11:30:00+05:00";

function calculateTimeRemaining(targetIso: string): TimeRemaining {
  const targetEpoch = new Date(targetIso).getTime();
  const nowEpoch = Date.now();
  const diff = Math.max(0, targetEpoch - nowEpoch);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return {
    total: diff,
    days,
    hours,
    minutes,
    seconds,
    isComplete: diff <= 0,
  };
}

function getClientCountdownCookie(): boolean | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)countdown_enabled=([^;]+)/);
  if (!match) return null;
  return match[1] === "true";
}

export default function CountdownSection({ branding = DEFAULT_BRANDING }: CountdownSectionProps) {
  const countdown = branding.countdown;
  const targetIso = countdown?.targetDate || DEFAULT_TARGET_ISO;

  const [isVisible, setIsVisible] = useState(() => {
    const cookieState = getClientCountdownCookie();
    if (cookieState !== null) return cookieState;
    return Boolean(branding.countdown?.enabled);
  });
  const [timeLeft, setTimeLeft] = useState<TimeRemaining>(() => calculateTimeRemaining(targetIso));

  // Sync with prop updates and cookie
  useEffect(() => {
    const cookieState = getClientCountdownCookie();
    if (cookieState !== null) {
      setIsVisible(cookieState);
    } else {
      setIsVisible(Boolean(branding.countdown?.enabled));
    }
  }, [branding.countdown?.enabled]);

  // Client-side synchronization with /api/branding and custom events
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
            setIsVisible(Boolean(data.branding.countdown.enabled));
          }
        }
      } catch {
        // non-blocking fallback
      }
    }
    syncStatus();

    const handleEvent = (e: any) => {
      if (typeof e.detail === "boolean") {
        setIsVisible(e.detail);
      }
    };
    window.addEventListener("countdown-toggle", handleEvent);
    return () => window.removeEventListener("countdown-toggle", handleEvent);
  }, []);

  useEffect(() => {
    // Initial sync
    setTimeLeft(calculateTimeRemaining(targetIso));

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetIso));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetIso]);

  // If disabled by admin, hide completely from public website
  if (!isVisible) {
    return null;
  }

  const organization = countdown?.organization || "Triple E Organization Gilgit-Baltistan";
  const eventTitle = countdown?.eventTitle || "Taqreeb-e-Taqseem Inaamaat wa Taleemi Seminar";
  const competitionName = countdown?.competitionName || "Al Ghanche General Knowledge Quiz Competition 2026";
  const announcementDateDisplay = countdown?.announcementDateDisplay || "25 October 2026, Sunday, at 11:30 AM";
  const venue = countdown?.venue || "Government Boys High School Khaplu";

  return (
    <section 
      id="result-announcement" 
      className="relative py-14 sm:py-20 lg:py-24 bg-white border-b border-[#E6E9EE] scroll-mt-20 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Mobile / Tablet: Logos on top row blending naturally without artificial boxes */}
        <div className="lg:hidden flex items-center justify-center gap-8 sm:gap-14 mb-8">
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={organization}
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="mt-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#183153] text-center">
              Triple E Org
            </span>
          </div>

          <div className="h-14 w-[1px] bg-[#E6E9EE]" />

          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24">
              <Image
                src={branding.partnerAttribution?.partnerLogoUrl || "/images/logos/siachen-mark-logo.jpg"}
                alt="Siachen Mark Marketing Agency"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="mt-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#183153] text-center">
              Siachen Mark
            </span>
          </div>
        </div>

        {/* Desktop: 3-column layout with Left Logo, Central Content, Right Logo */}
        <div className="flex items-center justify-between gap-6 xl:gap-12">
          {/* Left: Triple E Organization Logo (Natural blend, original proportions, no artificial container) */}
          <div className="hidden lg:flex flex-col items-center justify-center w-40 xl:w-48 shrink-0 text-center">
            <div className="relative w-28 h-28 xl:w-36 xl:h-36">
              <Image
                src={branding.logoUrl || "/images/logos/triple-e-logo.jpg"}
                alt={organization}
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#183153] leading-tight">
              Triple E Organization<br />
              <span className="text-[11px] font-semibold text-[#737B85] normal-case">Gilgit-Baltistan</span>
            </p>
          </div>

          {/* Center: Main Announcement & Countdown Details */}
          <div className="flex-1 max-w-3xl mx-auto text-center space-y-5">
            {/* Event & Competition Badges */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F7F8FA] border border-[#E6E9EE] text-[#183153] text-xs font-semibold">
                <Award className="w-3.5 h-3.5 text-[#183153]" />
                <span>{organization}</span>
              </div>

              <h3 className="font-heading text-lg sm:text-xl md:text-2xl font-bold text-[#0E2A47]">
                {eventTitle}
              </h3>

              <p className="text-xs sm:text-sm font-semibold text-[#0D7B54] tracking-wide uppercase">
                {competitionName}
              </p>
            </div>

            {/* Main Section Heading */}
            <div className="space-y-3 pt-1">
              <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-light text-[#183153] tracking-tight uppercase leading-tight">
                RESULT <span className="font-semibold text-[#20252B]">ANNOUNCEMENT</span>
              </h2>

              {/* Prominent "COMING SOON" banner */}
              <div className="pt-1">
                <span className="inline-block px-5 py-2 rounded-full bg-[#183153] text-white text-xs sm:text-sm font-bold tracking-[0.25em] uppercase shadow-sm">
                  COMING SOON
                </span>
              </div>
            </div>

            {/* Live Countdown Timer Grid (Days, Hours, Minutes, Seconds) */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 max-w-xl mx-auto pt-4 pb-2">
              {/* Days */}
              <div className="flex flex-col items-center justify-center py-4 px-2 sm:py-6 sm:px-4 rounded-xl sm:rounded-2xl bg-[#F7F8FA] border border-[#E6E9EE] shadow-subtle hover:border-[#183153]/30 transition-all">
                <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#183153] tracking-tight">
                  {String(timeLeft.days).padStart(2, "0")}
                </span>
                <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737B85]">
                  Days
                </span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center justify-center py-4 px-2 sm:py-6 sm:px-4 rounded-xl sm:rounded-2xl bg-[#F7F8FA] border border-[#E6E9EE] shadow-subtle hover:border-[#183153]/30 transition-all">
                <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#183153] tracking-tight">
                  {String(timeLeft.hours).padStart(2, "0")}
                </span>
                <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737B85]">
                  Hours
                </span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center justify-center py-4 px-2 sm:py-6 sm:px-4 rounded-xl sm:rounded-2xl bg-[#F7F8FA] border border-[#E6E9EE] shadow-subtle hover:border-[#183153]/30 transition-all">
                <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#183153] tracking-tight">
                  {String(timeLeft.minutes).padStart(2, "0")}
                </span>
                <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737B85]">
                  Minutes
                </span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center justify-center py-4 px-2 sm:py-6 sm:px-4 rounded-xl sm:rounded-2xl bg-[#F7F8FA] border border-[#E6E9EE] shadow-subtle hover:border-[#183153]/30 transition-all">
                <span className="font-mono text-2xl sm:text-4xl md:text-5xl font-extrabold text-[#0D7B54] tracking-tight">
                  {String(timeLeft.seconds).padStart(2, "0")}
                </span>
                <span className="mt-1 sm:mt-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-[#737B85]">
                  Seconds
                </span>
              </div>
            </div>

            {/* Official Announcement Date & Venue Details */}
            <div className="pt-3 space-y-2">
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-[#20252B]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#183153] shrink-0" />
                  <span className="font-semibold">{announcementDateDisplay}</span>
                  <span className="text-[11px] text-[#737B85]">(PKT, UTC+05:00)</span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0D7B54] shrink-0" />
                  <span className="font-semibold">{venue}</span>
                </div>
              </div>

              <p className="text-xs text-[#737B85] max-w-xl mx-auto leading-relaxed pt-1">
                Official competition results and Certificates of Achievement will be made available for online verification following the ceremony.
              </p>
            </div>
          </div>

          {/* Right: Siachen Mark Logo (Natural blend, original proportions, no artificial container) */}
          <div className="hidden lg:flex flex-col items-center justify-center w-40 xl:w-48 shrink-0 text-center">
            <div className="relative w-28 h-28 xl:w-36 xl:h-36">
              <Image
                src={branding.partnerAttribution?.partnerLogoUrl || "/images/logos/siachen-mark-logo.jpg"}
                alt="Siachen Mark Marketing Agency"
                fill
                className="object-contain"
                priority
              />
            </div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-[#183153] leading-tight">
              Siachen Mark<br />
              <span className="text-[11px] font-semibold text-[#737B85] normal-case">Marketing Agency</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
