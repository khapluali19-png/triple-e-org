import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOrdinal(num: number): string {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

export function calculatePercentage(obtained: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((obtained / total) * 100 * 10) / 10;
}

export function getAwardBadgeVariant(percentage: number, rank?: number): {
  label: string;
  badgeClass: string;
} {
  if (rank === 1) {
    return {
      label: "1st Position (Champion)",
      badgeClass: "bg-amber-100 text-amber-900 border-amber-300 ring-amber-400/30",
    };
  }
  if (rank === 2) {
    return {
      label: "2nd Position (Runner Up)",
      badgeClass: "bg-slate-100 text-slate-800 border-slate-300 ring-slate-400/30",
    };
  }
  if (rank === 3) {
    return {
      label: "3rd Position (2nd Runner Up)",
      badgeClass: "bg-amber-50 text-amber-800 border-amber-200 ring-amber-300/30",
    };
  }
  if (percentage >= 85) {
    return {
      label: "High Distinction",
      badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300 ring-emerald-400/30",
    };
  }
  if (percentage >= 70) {
    return {
      label: "Distinction",
      badgeClass: "bg-blue-50 text-blue-800 border-blue-300 ring-blue-400/30",
    };
  }
  return {
    label: "Certificate of Participation",
    badgeClass: "bg-slate-50 text-slate-700 border-slate-200 ring-slate-300/20",
  };
}
