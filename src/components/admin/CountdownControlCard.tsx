"use client";

import { useState, useEffect } from "react";
import { 
  Clock, 
  Power, 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  MapPin, 
  Loader2, 
  ShieldAlert, 
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { CountdownConfig } from "@/lib/types";

interface CountdownControlCardProps {
  initialCountdown?: CountdownConfig;
  onStatusChange?: (enabled: boolean) => void;
}

const DEFAULT_TARGET_ISO = "2026-10-25T11:30:00+05:00";

function calculateTimeRemaining(targetIso: string) {
  const targetEpoch = new Date(targetIso).getTime();
  const nowEpoch = Date.now();
  const diff = Math.max(0, targetEpoch - nowEpoch);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { total: diff, days, hours, minutes, seconds };
}

export default function CountdownControlCard({ 
  initialCountdown, 
  onStatusChange 
}: CountdownControlCardProps) {
  const [countdown, setCountdown] = useState<CountdownConfig>(() => ({
    enabled: initialCountdown?.enabled ?? true,
    targetDate: initialCountdown?.targetDate || DEFAULT_TARGET_ISO,
    organization: initialCountdown?.organization || "Triple E Organization Gilgit-Baltistan",
    eventTitle: initialCountdown?.eventTitle || "Taqreeb-e-Taqseem Inaamaat wa Taleemi Seminar",
    competitionName: initialCountdown?.competitionName || "Al Ghanche General Knowledge Quiz Competition 2026",
    announcementDateDisplay: initialCountdown?.announcementDateDisplay || "25 October 2026, Sunday, at 11:30 AM",
    venue: initialCountdown?.venue || "Government Boys High School Khaplu",
  }));

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeRemaining(countdown.targetDate));

  // Live countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(countdown.targetDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown.targetDate]);

  // Fetch latest saved status from backend on load
  useEffect(() => {
    async function fetchStatus() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/countdown", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.countdown) {
            setCountdown((prev) => ({
              ...prev,
              ...data.countdown,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch countdown status:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
  }, []);

  const handleToggle = async () => {
    const nextState = !countdown.enabled;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCountdown((prev) => ({ ...prev, enabled: nextState }));
        if (typeof document !== "undefined") {
          document.cookie = "countdown_enabled=; path=/; max-age=0; SameSite=Lax";
        }
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("countdown-toggle", { detail: nextState }));
        }
        setFeedback({
          type: "success",
          message: nextState
            ? "Result Announcement Countdown is now ON. Public search is locked."
            : "Result Announcement Countdown is now OFF. Public search is live.",
        });
        if (onStatusChange) {
          onStatusChange(nextState);
        }
      } else {
        setFeedback({
          type: "error",
          message: data.message || "Failed to update countdown setting.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "Network error occurred while updating setting.",
      });
    } finally {
      setSaving(false);
    }
  };

  const isEnabled = countdown.enabled;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6 text-left">
      {/* Header Row: Title & Current Status Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
            isEnabled ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}>
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-navy-950">
                Result Announcement Countdown
              </h3>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
            </div>
            <p className="text-xs text-slate-500">
              Admin control for public result announcement countdown and search availability.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase ${
            isEnabled 
              ? "bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs" 
              : "bg-slate-100 text-slate-700 border border-slate-300"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
            }`} />
            <span>{isEnabled ? "STATUS: ON (ACTIVE)" : "STATUS: OFF (DISABLED)"}</span>
          </span>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
          feedback.type === "success" 
            ? "bg-emerald-50 border border-emerald-200 text-emerald-800" 
            : "bg-red-50 border border-red-200 text-red-800"
        }`}>
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Main Control Panel: Toggle & Mode Descriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Column: Switch Action Button */}
        <div className="lg:col-span-5 space-y-3">
          <button
            type="button"
            onClick={handleToggle}
            disabled={saving || loading}
            className={`w-full py-4 px-5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 shadow-xs cursor-pointer ${
              isEnabled
                ? "bg-amber-600 hover:bg-amber-700 text-white"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Saving setting...</span>
              </>
            ) : isEnabled ? (
              <>
                <EyeOff className="w-4 h-4 text-white" />
                <span>Turn Countdown OFF (Enable Search)</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-white" />
                <span>Turn Countdown ON (Lock Search)</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            Click to switch the portal mode instantly. Setting persists in storage without code redeployment.
          </p>
        </div>

        {/* Right Column: Live Event & Target Schedule */}
        <div className="lg:col-span-7 bg-[#F7F8FA] p-4 sm:p-5 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-navy-950 uppercase tracking-wider text-[11px]">
              Official Announcement Target
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
              PKT (UTC+05:00)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-navy-800 shrink-0" />
              <span>{countdown.announcementDateDisplay}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="truncate">{countdown.venue}</span>
            </div>
          </div>

          {/* Mini Live Countdown Preview */}
          <div className="pt-2 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">
                Time Remaining:
              </span>
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-navy-950">
                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{timeLeft.days}d</span>
                <span>:</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{String(timeLeft.hours).padStart(2, "0")}h</span>
                <span>:</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200">{String(timeLeft.minutes).padStart(2, "0")}m</span>
                <span>:</span>
                <span className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-emerald-700">{String(timeLeft.seconds).padStart(2, "0")}s</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Explanations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 text-xs">
        {/* When ON Explanation */}
        <div className={`p-4 rounded-xl border transition-all ${
          isEnabled 
            ? "bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs" 
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1.5 text-emerald-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>When Countdown is ON (Active)</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
            <li>Displays the live countdown timer on the public result portal.</li>
            <li>Shows Triple E and Siachen Mark logos on either side.</li>
            <li>Disables result searching with announcement notice.</li>
            <li>Blocks direct API requests with HTTP 403 (RESULTS_PENDING).</li>
          </ul>
        </div>

        {/* When OFF Explanation */}
        <div className={`p-4 rounded-xl border transition-all ${
          !isEnabled 
            ? "bg-blue-50/70 border-blue-300 text-blue-950 shadow-2xs" 
            : "bg-slate-50 border-slate-200 text-slate-600"
        }`}>
          <div className="flex items-center gap-2 font-bold mb-1.5 text-navy-950">
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>When Countdown is OFF (Disabled)</span>
          </div>
          <ul className="space-y-1 list-disc list-inside text-[11px] leading-relaxed">
            <li>Completely hides the countdown section from the public portal.</li>
            <li>Enables public result searching across all 15 examination centers.</li>
            <li>Allows students to search by name and print/download certificates.</li>
            <li>Restores standard API lookups.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
