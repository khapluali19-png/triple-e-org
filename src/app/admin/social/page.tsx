"use client";

import { useState, useEffect } from "react";
import { 
  Share2, 
  Save, 
  Check, 
  Globe, 
  Plus, 
  Trash2, 
  AlertCircle, 
  RefreshCw,
  Phone,
  Mail,
  ExternalLink
} from "lucide-react";
import { SocialLinksConfig, WebsiteBrandingConfig } from "@/lib/types";
import { DEFAULT_BRANDING } from "@/lib/constants";

export default function AdminSocialPage() {
  const [links, setLinks] = useState<SocialLinksConfig>(DEFAULT_BRANDING.socialLinks);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSocial() {
      try {
        const res = await fetch("/api/admin/branding");
        if (res.ok) {
          const data = await res.json();
          if (data.branding?.socialLinks) {
            setLinks(data.branding.socialLinks);
          }
        }
      } catch (err) {
        console.error("Failed to load social links:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSocial();
  }, []);

  const handleAddCustomLink = () => {
    setLinks((prev) => ({
      ...prev,
      customLinks: [...(prev.customLinks || []), { label: "", url: "" }],
    }));
  };

  const handleRemoveCustomLink = (index: number) => {
    setLinks((prev) => ({
      ...prev,
      customLinks: (prev.customLinks || []).filter((_, i) => i !== index),
    }));
  };

  const handleUpdateCustomLink = (index: number, field: "label" | "url", value: string) => {
    setLinks((prev) => {
      const updated = [...(prev.customLinks || [])];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, customLinks: updated };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ socialLinks: links }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        setError(data.message || "Failed to save social channels.");
      }
    } catch (err: any) {
      setError(err.message || "Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-navy-800 mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading social media settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl pb-16">
      {/* Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-navy-950">
              Social Media Channels &amp; Candidate Helplines
            </h2>
            <p className="text-xs text-slate-500">
              Configure communication channels. Only URLs configured here will be displayed on the public portal.
            </p>
          </div>
        </div>

        {saved && (
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Channels Saved</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Primary Social Networks */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
          <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
            Primary Social Networks
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Facebook Page URL
              </label>
              <input
                type="url"
                value={links.facebook || ""}
                onChange={(e) => setLinks({ ...links, facebook: e.target.value })}
                placeholder="https://facebook.com/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Instagram Profile URL
              </label>
              <input
                type="url"
                value={links.instagram || ""}
                onChange={(e) => setLinks({ ...links, instagram: e.target.value })}
                placeholder="https://instagram.com/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                YouTube Educational Channel URL
              </label>
              <input
                type="url"
                value={links.youtube || ""}
                onChange={(e) => setLinks({ ...links, youtube: e.target.value })}
                placeholder="https://youtube.com/@..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                LinkedIn Organization Page URL
              </label>
              <input
                type="url"
                value={links.linkedin || ""}
                onChange={(e) => setLinks({ ...links, linkedin: e.target.value })}
                placeholder="https://linkedin.com/company/..."
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono focus:ring-2 focus:ring-navy-900"
              />
            </div>
          </div>
        </div>

        {/* Helplines & Contact Links */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
          <h3 className="font-serif text-base font-bold text-navy-950 border-b border-slate-100 pb-3">
            Helpline Direct Links
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                WhatsApp Candidate Helpline Link
              </label>
              <input
                type="url"
                value={links.whatsapp || ""}
                onChange={(e) => setLinks({ ...links, whatsapp: e.target.value })}
                placeholder="https://wa.me/923000000000"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono focus:ring-2 focus:ring-navy-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Official Support Email Address
              </label>
              <input
                type="email"
                value={links.email || ""}
                onChange={(e) => setLinks({ ...links, email: e.target.value })}
                placeholder="contact@triple-e.org"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900"
              />
            </div>
          </div>
        </div>

        {/* Custom Additional Links */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-serif text-base font-bold text-navy-950">
                Additional Custom Community Links
              </h3>
              <p className="text-xs text-slate-500">
                Add extra organizational portals, newsletters, or partner pages.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddCustomLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Link</span>
            </button>
          </div>

          <div className="space-y-3">
            {(links.customLinks || []).length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                No custom links added yet. Click &quot;Add Link&quot; above to create one.
              </p>
            ) : (
              (links.customLinks || []).map((custom, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    value={custom.label}
                    onChange={(e) => handleUpdateCustomLink(idx, "label", e.target.value)}
                    placeholder="Link Label (e.g. Annual Report)"
                    className="w-1/3 px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                  <input
                    type="url"
                    value={custom.url}
                    onChange={(e) => handleUpdateCustomLink(idx, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCustomLink(idx)}
                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                    title="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-400 text-white text-xs font-bold transition-all shadow-card"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                <span>Saving Links...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 text-gold-400" />
                <span>Save Social Media Settings</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
