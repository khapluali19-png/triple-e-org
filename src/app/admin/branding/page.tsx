"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { 
  Settings, 
  Save, 
  Check, 
  Upload, 
  Eye, 
  ToggleLeft, 
  ToggleRight, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Type, 
  HelpCircle,
  RefreshCw,
  Sliders,
  ExternalLink,
  Clock
} from "lucide-react";
import CountdownControlCard from "@/components/admin/CountdownControlCard";
import { WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING } from "@/lib/constants";

export default function AdminBrandingPage() {
  const [config, setConfig] = useState<WebsiteBrandingConfig>(DEFAULT_BRANDING);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"countdown" | "identity" | "labels" | "visibility" | "partner">("countdown");
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    async function loadBranding() {
      try {
        const res = await fetch("/api/admin/branding", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.branding) {
            setConfig(data.branding);
          }
        }
      } catch (err) {
        console.error("Failed to fetch branding:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBranding();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    try {
      // Exclude countdown and resultsPublished from general branding save to preserve toggle state
      const { countdown, resultsPublished, ...brandingUpdates } = config;
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brandingUpdates),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        alert(data.message || "Failed to save branding settings.");
      }
    } catch (err: any) {
      alert(err.message || "Network error.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logoUrl" | "heroImageUrl") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setConfig((prev) => ({ ...prev, [field]: data.url }));
        alert("Image uploaded successfully! Remember to click 'Save All Branding Settings' to persist.");
      } else {
        alert(data.message || "Upload failed.");
      }
    } catch (err: any) {
      alert(err.message || "Upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading website branding settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 shrink-0">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-navy-950">
              Website Branding &amp; Portal Customization
            </h2>
            <p className="text-xs text-slate-500">
              Customize portal headers, typography, announcements, scorecard labels, and field visibility in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            <span>View Public Website</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("countdown")}
          className={`px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 ${
            activeTab === "countdown"
              ? "bg-navy-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-gold-400" />
          <span>Result Announcement Countdown</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("identity")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "identity"
              ? "bg-navy-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Identity &amp; Headlines
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("labels")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "labels"
              ? "bg-navy-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Lookup &amp; Card Labels
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("visibility")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "visibility"
              ? "bg-navy-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Field Visibility
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("partner")}
          className={`px-4 py-2 rounded-lg transition-all ${
            activeTab === "partner"
              ? "bg-navy-950 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Partner Attribution
        </button>
      </div>

      {/* Tab: Announcement Countdown */}
      {activeTab === "countdown" && (
        <div className="space-y-6">
          <CountdownControlCard 
            initialCountdown={config.countdown} 
            onStatusChange={(enabled) => {
              setConfig((prev) => ({
                ...prev,
                countdown: { ...(prev.countdown || {} as any), enabled },
                resultsPublished: !enabled,
              }));
            }}
          />
        </div>
      )}

      {activeTab !== "countdown" && (
        <form onSubmit={handleSave} className="space-y-8">
        {/* Tab 1: Identity & Headlines */}
        {activeTab === "identity" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
              <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
                Core Identity &amp; Editorial Typography
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={config.organizationName}
                    onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Regional Chapter
                  </label>
                  <input
                    type="text"
                    value={config.organizationRegion}
                    onChange={(e) => setConfig({ ...config, organizationRegion: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Three Pillars Motto
                  </label>
                  <input
                    type="text"
                    value={config.organizationTagline}
                    onChange={(e) => setConfig({ ...config, organizationTagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Competition Title
                  </label>
                  <input
                    type="text"
                    value={config.competitionTitle}
                    onChange={(e) => setConfig({ ...config, competitionTitle: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Main Hero Headline
                </label>
                <input
                  type="text"
                  value={config.mainHeadline}
                  onChange={(e) => setConfig({ ...config, mainHeadline: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-serif font-bold text-sm focus:ring-2 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hero Subtitle Ribbon
                </label>
                <input
                  type="text"
                  value={config.mainSubtitle}
                  onChange={(e) => setConfig({ ...config, mainSubtitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Competition Editorial Description
                </label>
                <textarea
                  rows={3}
                  value={config.competitionDescription}
                  onChange={(e) => setConfig({ ...config, competitionDescription: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 leading-relaxed focus:ring-2 focus:ring-navy-900"
                />
              </div>
            </div>

            {/* Logo & Hero Image Assets */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
              <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
                Visual Assets (Logo &amp; Hero Photography)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Logo section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Official Organization Logo
                  </span>
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-white p-1 border-2 border-slate-300 shrink-0">
                      <Image
                        src={config.logoUrl || "/images/logos/triple-e-logo.jpg"}
                        alt="Triple E Logo"
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="space-y-1 flex-1">
                      <p className="text-xs text-slate-700 font-mono truncate">{config.logoUrl}</p>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-950 hover:bg-navy-900 text-white text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5 text-gold-400" />
                        <span>{uploadingLogo ? "Uploading..." : "Upload New Logo"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload(e, "logoUrl")}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Using authentic workspace asset: /public/images/logos/triple-e-logo.jpg. Max upload 2 MB.
                  </p>
                </div>

                {/* Hero image section */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Hero Showcase Photograph
                  </span>
                  <div className="relative h-24 w-full rounded-lg overflow-hidden border border-slate-300">
                    <Image
                      src={config.heroImageUrl || "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80"}
                      alt="Hero Showcase"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <input
                    type="text"
                    value={config.heroImageUrl}
                    onChange={(e) => setConfig({ ...config, heroImageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Top Announcement Banner */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-serif text-base font-bold text-navy-950">
                    Top Announcement Ribbon
                  </h4>
                  <p className="text-xs text-slate-500">
                    Broadcast competition dates, verification notices, or updates to visitors.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, announcementActive: !config.announcementActive })}
                  className="focus:outline-none"
                >
                  {config.announcementActive ? (
                    <ToggleRight className="w-8 h-8 text-emerald-600" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-400" />
                  )}
                </button>
              </div>

              <input
                type="text"
                value={config.announcementText}
                onChange={(e) => setConfig({ ...config, announcementText: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Lookup & Result Card Labels */}
        {activeTab === "labels" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
              <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
                Candidate Result Lookup Section Labels
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Lookup Section Title
                  </label>
                  <input
                    type="text"
                    value={config.lookupLabels.searchTitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lookupLabels: { ...config.lookupLabels, searchTitle: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Search Button Text
                  </label>
                  <input
                    type="text"
                    value={config.lookupLabels.buttonText}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        lookupLabels: { ...config.lookupLabels, buttonText: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Lookup Instructions / Subtitle
                </label>
                <input
                  type="text"
                  value={config.lookupLabels.searchSubtitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lookupLabels: { ...config.lookupLabels, searchSubtitle: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Input Field Placeholder
                </label>
                <input
                  type="text"
                  value={config.lookupLabels.inputPlaceholder}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      lookupLabels: { ...config.lookupLabels, inputPlaceholder: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono"
                />
              </div>
            </div>

            {/* Scorecard Labels */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
              <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
                Official Scorecard Labels &amp; Signatures
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Certificate / Scorecard Title
                  </label>
                  <input
                    type="text"
                    value={config.resultCardLabels.scorecardTitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        resultCardLabels: { ...config.resultCardLabels, scorecardTitle: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Examination Controller Title
                  </label>
                  <input
                    type="text"
                    value={config.resultCardLabels.controllerTitle}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        resultCardLabels: { ...config.resultCardLabels, controllerTitle: e.target.value },
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Committee Verification Seal Text
                </label>
                <input
                  type="text"
                  value={config.resultCardLabels.remarksTitle}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      resultCardLabels: { ...config.resultCardLabels, remarksTitle: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Field Visibility Settings */}
        {activeTab === "visibility" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-base font-bold text-navy-950">
                Scorecard Optional Fields Visibility
              </h3>
              <p className="text-xs text-slate-500">
                Control which attributes appear on the public digital scorecard and printable certificates.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(config.fieldVisibility).map(([key, val]) => {
                const labelMap: Record<string, string> = {
                  showFatherName: "Father / Guardian Name",
                  showSchoolName: "School / Institution",
                  showDistrict: "District",
                  showClassOrSection: "Class / Section",
                  showRank: "Standing / Position Rank",
                  showGrade: "Letter Grade",
                  showPassFailStatus: "Pass/Fail Status",
                  showSubjectBreakdown: "Subject-wise Scores",
                };

                return (
                  <div
                    key={key}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between"
                  >
                    <span className="text-xs font-semibold text-slate-700">
                      {labelMap[key] || key}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          fieldVisibility: {
                            ...config.fieldVisibility,
                            [key]: !val,
                          },
                        })
                      }
                      className="focus:outline-none"
                    >
                      {val ? (
                        <ToggleRight className="w-7 h-7 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-400" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 4: Partner Attribution */}
        {activeTab === "partner" && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-serif text-base font-bold text-navy-950">
                  Digital Partner Attribution Settings
                </h3>
                <p className="text-xs text-slate-500">
                  Configure footer partner attribution for Siachen Mark or technology collaborators.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setConfig({
                    ...config,
                    partnerAttribution: {
                      ...config.partnerAttribution,
                      enabled: !config.partnerAttribution.enabled,
                    },
                  })
                }
                className="focus:outline-none"
              >
                {config.partnerAttribution.enabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-600" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-400" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Partner Agency Name
                </label>
                <input
                  type="text"
                  value={config.partnerAttribution.partnerName || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        partnerName: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="e.g. Siachen Mark Agency"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Partner Role Title
                </label>
                <input
                  type="text"
                  value={config.partnerAttribution.partnerRole || ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        partnerRole: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="e.g. Digital & Technology Partner"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Attribution Headline / Tagline
                </label>
                <input
                  type="text"
                  value={config.partnerAttribution.tagline ?? "Designed & Developed by Siachen Mark Agency"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        tagline: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="Designed & Developed by Siachen Mark Agency"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Location / City
                </label>
                <input
                  type="text"
                  value={config.partnerAttribution.location ?? "Islamabad"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        location: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="e.g. Islamabad"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Partner Website URL
                </label>
                <input
                  type="url"
                  value={config.partnerAttribution.partnerWebsiteUrl ?? "https://siachen-mark.vercel.app/"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        partnerWebsiteUrl: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="https://siachen-mark.vercel.app/"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Developer & Leadership Credit
                </label>
                <input
                  type="text"
                  value={config.partnerAttribution.developerCredit ?? "Basharat Ali | Former Social Media Head, Triple E Organization"}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      partnerAttribution: {
                        ...config.partnerAttribution,
                        developerCredit: e.target.value,
                      },
                    })
                  }
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                  placeholder="Basharat Ali | Former Social Media Head, Triple E Organization"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white p-1 border border-slate-300 shrink-0">
                <Image
                  src={config.partnerAttribution.partnerLogoUrl || "/images/logos/siachen-mark-logo.jpg"}
                  alt="Partner Logo"
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-800">
                  Logo Asset: {config.partnerAttribution.partnerLogoUrl || "/images/logos/siachen-mark-logo.jpg"}
                </span>
                <p className="text-[10px] text-slate-400">
                  Authentic Siachen Mark emblem located in workspace (`partner/logo.jpg`). Links directly to {config.partnerAttribution.partnerWebsiteUrl || "https://siachen-mark.vercel.app/"}.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div>
            {saved && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Branding Configuration Saved Successfully! Live on public website.</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-400 text-white text-xs font-bold transition-all shadow-card"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                <span>Saving Changes...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-gold-400" />
                <span>Save All Branding Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}
