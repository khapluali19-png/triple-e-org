"use client";

import { useState } from "react";
import { Award, Check, Save, ToggleLeft, ToggleRight, Plus, Trash2 } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { CategoryInfo } from "@/lib/types";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryInfo[]>(CATEGORIES);
  const [saved, setSaved] = useState(false);

  const toggleCategoryActive = (id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  };

  const handleUpdateCategory = (id: string, field: keyof CategoryInfo, value: any) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-lg font-bold text-navy-950">
              Competition Category Management
            </h2>
            <p className="text-xs text-slate-500">
              Configure curriculum subjects, grade thresholds, and visibility for all 3 competition tracks.
            </p>
          </div>
        </div>

        {saved && (
          <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Categories Saved</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="space-y-6">
          {categories.map((cat, idx) => (
            <div
              key={cat.id}
              className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-subtle space-y-6"
            >
              {/* Category Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-navy-950 text-white text-xs font-bold flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="font-serif text-base font-bold text-navy-950">
                      {cat.title}
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Category Identifier: {cat.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {cat.isActive ? "Active / Visible" : "Hidden"}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleCategoryActive(cat.id)}
                    className="text-navy-900 focus:outline-none"
                  >
                    {cat.isActive ? (
                      <ToggleRight className="w-8 h-8 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Display Title
                  </label>
                  <input
                    type="text"
                    value={cat.title}
                    onChange={(e) => handleUpdateCategory(cat.id, "title", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Target Academic Grades
                  </label>
                  <input
                    type="text"
                    value={cat.grades}
                    onChange={(e) => handleUpdateCategory(cat.id, "grades", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-navy-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Total Marks Base
                  </label>
                  <input
                    type="number"
                    value={cat.totalMarks}
                    onChange={(e) => handleUpdateCategory(cat.id, "totalMarks", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-navy-950 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Category Description
                </label>
                <textarea
                  rows={2}
                  value={cat.description}
                  onChange={(e) => handleUpdateCategory(cat.id, "description", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs text-navy-950"
                />
              </div>

              {/* Subject Tags */}
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Evaluated Subject Areas
                </label>
                <div className="flex flex-wrap gap-2">
                  {cat.subjects.map((sub, sIdx) => (
                    <span
                      key={sIdx}
                      className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-800 font-medium"
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-navy-950 hover:bg-navy-900 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Save className="w-4 h-4 text-gold-400" />
            <span>Save Categories Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
}
