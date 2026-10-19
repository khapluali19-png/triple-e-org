"use client";

import { useState } from "react";
import { Eye, ExternalLink, Monitor, Smartphone, Tablet, RefreshCw } from "lucide-react";

export default function AdminPreviewPage() {
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [key, setKey] = useState(0);

  const getContainerWidth = () => {
    if (device === "mobile") return "max-w-sm";
    if (device === "tablet") return "max-w-2xl";
    return "w-full";
  };

  return (
    <div className="space-y-6">
      {/* Top Preview Controls */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center text-navy-900">
            <Eye className="w-5 h-5 text-navy-800" />
          </div>
          <div>
            <h2 className="font-serif text-base font-bold text-navy-950">
              Live Public Portal Viewport
            </h2>
            <p className="text-xs text-slate-500">
              Inspect responsiveness and student result lookup exactly as candidates experience it.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Toggles */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setDevice("desktop")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                device === "desktop"
                  ? "bg-white text-navy-950 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Desktop Viewport"
            >
              <Monitor className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("tablet")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                device === "tablet"
                  ? "bg-white text-navy-950 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Tablet Viewport"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDevice("mobile")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                device === "mobile"
                  ? "bg-white text-navy-950 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Mobile Viewport"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => setKey((prev) => prev + 1)}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Reload Preview Frame"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <a
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold transition-colors"
          >
            <span>Open in New Tab</span>
            <ExternalLink className="w-3.5 h-3.5 text-gold-400" />
          </a>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center bg-slate-200/80 p-4 sm:p-6 rounded-2xl border border-slate-300 min-h-[750px]">
        <div
          className={`${getContainerWidth()} w-full bg-white rounded-xl shadow-elevated border border-slate-400/40 overflow-hidden transition-all duration-300 flex flex-col`}
          style={{ height: "800px" }}
        >
          {/* Mock Browser Header */}
          <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            </div>
            <span className="font-mono text-[11px] text-slate-600 truncate max-w-xs">
              https://results.triple-e.org (Preview)
            </span>
            <div className="w-10" />
          </div>

          {/* Embedded Live IFrame */}
          <iframe
            key={key}
            src="/"
            title="Public Results Portal Preview"
            className="w-full flex-1 border-0"
          />
        </div>
      </div>
    </div>
  );
}
