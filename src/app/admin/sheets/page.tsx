"use client";

import { useState, useEffect } from "react";
import { 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Key, 
  Save, 
  Check, 
  Unlink, 
  HelpCircle,
  Copy,
  Table,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  AlertTriangle
} from "lucide-react";
import { 
  CategoryId, 
  CategorySheetConnection, 
  CategoryColumnMappings, 
  SheetPreviewData 
} from "@/lib/types";

const CATEGORY_TABS: { id: CategoryId; name: string; subtitle: string; color: string }[] = [
  { id: "lower", name: "Lower Class", subtitle: "Primary Grades Ledger", color: "emerald" },
  { id: "middle", name: "Middle Class", subtitle: "Junior Secondary Ledger", color: "blue" },
  { id: "overall", name: "Overall Championship", subtitle: "Open Championship Ledger", color: "amber" },
];

export default function AdminSheetsPage() {
  const [activeCategory, setActiveCategory] = useState<CategoryId>("lower");
  const [connections, setConnections] = useState<Record<CategoryId, CategorySheetConnection> | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Active form state for selected category
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [worksheetName, setWorksheetName] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(1);
  const [columnMappings, setColumnMappings] = useState<CategoryColumnMappings>({
    rollNumber: "",
    studentName: "",
    obtainedMarks: "",
  });

  // Testing & preview state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    suggestedAction?: string;
  } | null>(null);
  const [previewData, setPreviewData] = useState<SheetPreviewData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string>("");
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Diagnostic Test Lookup state
  const [testLookupRoll, setTestLookupRoll] = useState("222");
  const [isTestingLookup, setIsTestingLookup] = useState(false);
  const [lookupDiagnosticResult, setLookupDiagnosticResult] = useState<{
    success: boolean;
    message?: string;
    result?: {
      rollNumber: string;
      studentName: string;
      fatherName?: string;
      obtainedMarks: number;
      totalMarks: number;
      percentage: number;
      grade: string;
    };
    detectedColumns?: {
      rollNumber?: string | null;
      studentName?: string | null;
      fatherName?: string | null;
      obtainedMarks?: string | null;
      totalMarks?: string | null;
    };
    diagnosticNote?: string;
    code?: string;
    duplicateDetected?: boolean;
  } | null>(null);

  const handleTestRollLookup = async () => {
    if (!testLookupRoll.trim()) {
      alert("Please enter a Roll Number to test.");
      return;
    }

    setIsTestingLookup(true);
    setLookupDiagnosticResult(null);

    try {
      const res = await fetch("/api/admin/sheets/test-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "triple-e-2026",
        },
        body: JSON.stringify({
          categoryId: activeCategory,
          rollNumber: testLookupRoll.trim(),
          spreadsheetUrl,
          worksheetName,
          headerRowIndex,
          columnMappings,
        }),
      });

      const data = await res.json();
      setLookupDiagnosticResult(data);
    } catch (err: any) {
      setLookupDiagnosticResult({
        success: false,
        message: err.message || "Failed to execute candidate lookup test.",
      });
    } finally {
      setIsTestingLookup(false);
    }
  };

  // Load configuration from server store
  useEffect(() => {
    async function loadStore() {
      try {
        const res = await fetch("/api/admin/sheets/config", {
          headers: {
            "x-admin-token": "triple-e-2026",
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.store) {
            setConnections(data.store.categories);
            setServiceAccountEmail(
              data.store.serviceAccountEmail || "triple-e-sheets-sync@triple-e-org.iam.gserviceaccount.com"
            );
          }
        }
      } catch (err) {
        console.error("Failed to load category connections:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadStore();
  }, []);

  // Update form fields when activeCategory or connections change
  useEffect(() => {
    if (connections && connections[activeCategory]) {
      const conn = connections[activeCategory];
      setSpreadsheetUrl(conn.spreadsheetUrl || "");
      setWorksheetName(conn.worksheetName || "");
      setHeaderRowIndex(conn.headerRowIndex || 1);
      setColumnMappings(conn.columnMappings || { rollNumber: "", studentName: "", obtainedMarks: "" });
      setTestResult(null);
      setPreviewData(null);
      setSaveSuccess(false);
    }
  }, [activeCategory, connections]);

  // Extract spreadsheet ID dynamically
  const getExtractedId = (urlOrId: string) => {
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    if (/^[a-zA-Z0-9-_]{20,80}$/.test(urlOrId.trim())) return urlOrId.trim();
    return null;
  };

  const extractedId = getExtractedId(spreadsheetUrl);

  const handleTestConnection = async () => {
    if (!spreadsheetUrl.trim()) {
      setTestResult({
        success: false,
        message: "Please enter a Google Spreadsheet URL or Spreadsheet ID.",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/sheets/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "triple-e-2026",
        },
        body: JSON.stringify({
          spreadsheetUrl,
          worksheetName,
          headerRowIndex,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message,
        });
        setPreviewData(data.preview);

        // If worksheetName was empty, set to first available worksheet
        if (!worksheetName && data.preview.availableWorksheets?.length > 0) {
          setWorksheetName(data.preview.availableWorksheets[0]);
        }

        // Apply suggested mappings if current mappings are incomplete
        if (data.preview.suggestedMappings) {
          setColumnMappings((prev) => ({
            ...prev,
            rollNumber: prev.rollNumber || data.preview.suggestedMappings.rollNumber || "",
            studentName: prev.studentName || data.preview.suggestedMappings.studentName || "",
            obtainedMarks: prev.obtainedMarks || data.preview.suggestedMappings.obtainedMarks || "",
            fatherName: prev.fatherName || data.preview.suggestedMappings.fatherName || "",
            schoolName: prev.schoolName || data.preview.suggestedMappings.schoolName || "",
            district: prev.district || data.preview.suggestedMappings.district || "",
            classOrSection: prev.classOrSection || data.preview.suggestedMappings.classOrSection || "",
            totalMarks: prev.totalMarks || data.preview.suggestedMappings.totalMarks || "",
            percentage: prev.percentage || data.preview.suggestedMappings.percentage || "",
            grade: prev.grade || data.preview.suggestedMappings.grade || "",
            passFailStatus: prev.passFailStatus || data.preview.suggestedMappings.passFailStatus || "",
            rank: prev.rank || data.preview.suggestedMappings.rank || "",
          }));
        }
      } else {
        setTestResult({
          success: false,
          message: data.message || "Failed to connect to Google Sheets.",
          suggestedAction: data.errorDetails?.suggestedAction,
        });
        setPreviewData(null);
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || "Network error while connecting to server.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!extractedId) {
      alert("Please provide a valid Google Spreadsheet URL or ID.");
      return;
    }

    if (!columnMappings.rollNumber || !columnMappings.studentName || !columnMappings.obtainedMarks) {
      alert("Please map at least: Roll Number, Student Name, and Obtained Marks.");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/admin/sheets/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "triple-e-2026",
        },
        body: JSON.stringify({
          categoryId: activeCategory,
          connection: {
            spreadsheetUrl,
            spreadsheetId: extractedId,
            worksheetName: worksheetName || "Sheet1",
            headerRowIndex,
            status: "connected",
            lastTestedAt: new Date().toISOString(),
            columnMappings,
            availableWorksheets: previewData?.availableWorksheets || connections?.[activeCategory]?.availableWorksheets,
            detectedHeaders: previewData?.headers || connections?.[activeCategory]?.detectedHeaders,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        // Update local state
        setConnections((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [activeCategory]: data.connection,
          };
        });
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        alert(data.message || "Failed to save configuration.");
      }
    } catch (err: any) {
      alert(err.message || "Error saving configuration.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDisconnectModal = () => {
    setShowDisconnectModal(true);
  };

  const handleConfirmDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const res = await fetch("/api/admin/sheets/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": "triple-e-2026",
        },
        body: JSON.stringify({
          categoryId: activeCategory,
          connection: {
            status: "disconnected",
          },
        }),
      });

      if (res.ok) {
        setConnections((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            [activeCategory]: {
              ...prev[activeCategory],
              status: "disconnected",
            },
          };
        });
        setPreviewData(null);
        setTestResult(null);
        setShowDisconnectModal(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to disconnect category.");
      }
    } catch (err: any) {
      alert(err.message || "Error disconnecting category.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const currentConn = connections?.[activeCategory];
  const availableHeaders = previewData?.headers || currentConn?.detectedHeaders || [];

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Service Account Security Protocol Banner */}
      <div className="bg-navy-950 rounded-2xl p-6 sm:p-7 border border-navy-800 text-white shadow-elevated relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-900 border border-gold-500/40 text-gold-300 text-xs font-semibold">
              <Key className="w-3.5 h-3.5 text-gold-400" />
              <span>Official Google Sheets API • Service Account Integration</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
              Independent Category Sheet Connections
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              To keep private competition results secure without publishing spreadsheets to the public web, share each Google Sheet as <strong className="text-white font-semibold">Viewer</strong> with the authorized Triple-E Service Account email.
            </p>
          </div>

          <div className="bg-navy-900/90 border border-navy-700 p-4 rounded-xl space-y-2 shrink-0 max-w-md w-full">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block">
              Authorized Service Account Email:
            </span>
            <div className="flex items-center justify-between gap-2 bg-navy-950 p-2 rounded-lg border border-navy-800">
              <span className="font-mono text-xs text-gold-300 truncate select-all">
                {serviceAccountEmail || "Loading service account..."}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="px-2.5 py-1 rounded bg-navy-800 hover:bg-navy-700 text-white text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                title="Copy service account email"
              >
                {copiedEmail ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-300" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Click &quot;Share&quot; in Google Sheets → Add this email → Role: &quot;Viewer&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Categories Tab Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CATEGORY_TABS.map((tab) => {
          const isSelected = activeCategory === tab.id;
          const conn = connections?.[tab.id];
          const isConnected = conn?.status === "connected";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id)}
              className={`p-5 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? "bg-white border-navy-900 shadow-card ring-2 ring-navy-900/20"
                  : "bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-2xs"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                    {tab.subtitle}
                  </span>
                  <h3 className="font-serif text-base font-bold text-navy-950 mt-0.5">
                    {tab.name}
                  </h3>
                </div>

                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    isConnected
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-100 text-slate-600 border-slate-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                    }`}
                  />
                  <span>{isConnected ? "Connected" : "Disconnected"}</span>
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                <span className="truncate max-w-[170px]">
                  {conn?.worksheetName ? `Tab: ${conn.worksheetName}` : "No sheet connected"}
                </span>
                <span className="font-semibold text-navy-900 flex items-center gap-1">
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Connection Form for Selected Category */}
      <form onSubmit={handleSaveConnection} className="space-y-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-blue-700">
                Category Ledger Settings
              </span>
              <h3 className="font-serif text-xl font-bold text-navy-950">
                {currentConn?.categoryTitle || `${activeCategory.toUpperCase()} Category`}
              </h3>
              <p className="text-xs text-slate-500">
                Attach an independent spreadsheet or worksheet specifically for this category&apos;s candidates.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {currentConn?.status === "connected" && (
                <button
                  type="button"
                  onClick={handleOpenDisconnectModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Unlink className="w-3.5 h-3.5 text-red-500" />
                  <span>Disconnect</span>
                </button>
              )}

              {extractedId && (
                <a
                  href={`https://docs.google.com/spreadsheets/d/${extractedId}/edit`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  <span>Open Sheet</span>
                </a>
              )}
            </div>
          </div>

          {/* URL & Worksheet Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Google Spreadsheet Link or ID
              </label>
              <input
                type="text"
                value={spreadsheetUrl}
                onChange={(e) => setSpreadsheetUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none shadow-xs"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Accepts full Google Sheets browser URL or raw 44-character spreadsheet ID.</span>
                {extractedId && (
                  <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ID: {extractedId.slice(0, 8)}...{extractedId.slice(-6)}
                  </span>
                )}
              </div>
            </div>

            <div className="md:col-span-4 space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Worksheet / Tab Name
              </label>
              {previewData?.availableWorksheets && previewData.availableWorksheets.length > 0 ? (
                <select
                  value={worksheetName}
                  onChange={(e) => setWorksheetName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                >
                  {previewData.availableWorksheets.map((ws) => (
                    <option key={ws} value={ws}>
                      {ws}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={worksheetName}
                  onChange={(e) => setWorksheetName(e.target.value)}
                  placeholder="e.g. LowerClass, Sheet1, Results"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
                />
              )}
              <span className="block text-[11px] text-slate-400">
                The exact tab title at the bottom of your Google Sheet.
              </span>
            </div>
          </div>

          {/* Header Row Index & Test Button */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Header Row Index:
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={headerRowIndex}
                onChange={(e) => setHeaderRowIndex(Number(e.target.value))}
                className="w-16 px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs text-center"
              />
              <span className="text-[11px] text-slate-500">
                (Row number containing column headings, usually 1)
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || !spreadsheetUrl}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${isTesting ? "animate-spin" : ""}`} />
              <span>{isTesting ? "Verifying Sheet Connection..." : "Test Connection & Fetch Headers"}</span>
            </button>
          </div>

          {/* Test Connection Status Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-1 animate-in fade-in duration-200 ${
                testResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-red-50 border-red-200 text-red-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{testResult.success ? "Connection Verified" : "Connection Failed"}</span>
              </div>
              <p className="leading-relaxed">{testResult.message}</p>
              {testResult.suggestedAction && (
                <p className="text-[11px] font-semibold text-red-800 pt-1">
                  💡 Suggested Action: {testResult.suggestedAction}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Flexible Column Mapping Interface */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-navy-800">
                <Table className="w-4 h-4 text-gold-500" />
                <span>Column Header Mapping</span>
              </div>
              <h3 className="font-serif text-lg font-bold text-navy-950">
                Map Spreadsheet Columns to Scorecard Attributes
              </h3>
              <p className="text-xs text-slate-500">
                Map sheet columns to student attributes. Leading zeros in Roll Numbers are strictly preserved.
              </p>
            </div>

            {availableHeaders.length > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                {availableHeaders.length} Column Headers Detected
              </span>
            )}
          </div>

          {availableHeaders.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-semibold text-slate-700">
                No column headers loaded yet.
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Click &quot;Test Connection &amp; Fetch Headers&quot; above to inspect the worksheet columns.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mandatory Fields */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block mb-3">
                  Mandatory Fields (Required for Result Query)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Roll Number */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-navy-950">
                      Roll Number Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMappings.rollNumber}
                      onChange={(e) => setColumnMappings({ ...columnMappings, rollNumber: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-navy-900"
                    >
                      <option value="">-- Select Column --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">
                      Matches admit card roll number (zeros preserved).
                    </span>
                  </div>

                  {/* Student Name */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-navy-950">
                      Student Name Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMappings.studentName}
                      onChange={(e) => setColumnMappings({ ...columnMappings, studentName: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-navy-900"
                    >
                      <option value="">-- Select Column --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">
                      Full name of the candidate.
                    </span>
                  </div>

                  {/* Obtained Marks */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <label className="block text-xs font-bold text-navy-950">
                      Obtained Marks Column <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={columnMappings.obtainedMarks}
                      onChange={(e) => setColumnMappings({ ...columnMappings, obtainedMarks: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-semibold bg-white focus:ring-2 focus:ring-navy-900"
                    >
                      <option value="">-- Select Column --</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">
                      Score obtained out of total points.
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Fields */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  Optional Fields (Scorecard Enrichment)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Father Name */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Father / Guardian
                    </label>
                    <select
                      value={columnMappings.fatherName || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, fatherName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* School Name */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      School / Institution
                    </label>
                    <select
                      value={columnMappings.schoolName || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, schoolName: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* District */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      District (GB)
                    </label>
                    <select
                      value={columnMappings.district || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, district: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Class / Section */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Class / Section
                    </label>
                    <select
                      value={columnMappings.classOrSection || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, classOrSection: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Total Marks */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Total Marks Base
                    </label>
                    <select
                      value={columnMappings.totalMarks || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, totalMarks: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(Default: 100 Marks)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Percentage */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Percentage
                    </label>
                    <select
                      value={columnMappings.percentage || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, percentage: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(Auto-calculate from Marks)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Grade */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Grade (A+, A, B...)
                    </label>
                    <select
                      value={columnMappings.grade || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, grade: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Position / Rank */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Position / Rank
                    </label>
                    <select
                      value={columnMappings.rank || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, rank: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sample Rows Preview (Masked & Carefully Formatted) */}
        {previewData?.sampleRows && previewData.sampleRows.length > 0 && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-serif text-base font-bold text-navy-950">
                  Sample Rows Preview (First 3 Data Rows)
                </h4>
                <p className="text-xs text-slate-500">
                  Verify that data values correspond with your column mappings. Sensitive phone/CNIC values are masked.
                </p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Worksheet: {previewData.worksheetName}
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold">
                  <tr>
                    <th className="px-3.5 py-2.5">Row #</th>
                    {previewData.headers.map((h) => (
                      <th key={h} className="px-3.5 py-2.5 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {previewData.sampleRows.map((sample) => (
                    <tr key={sample.rowIndex} className="hover:bg-slate-50/70">
                      <td className="px-3.5 py-2 font-mono text-slate-400 text-[11px]">
                        {sample.rowIndex}
                      </td>
                      {previewData.headers.map((h) => (
                        <td key={h} className="px-3.5 py-2 whitespace-nowrap font-mono text-[11px]">
                          {sample.values[h] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detected Columns & Dynamic Grading Standards Summary */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-navy-800">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Detected Ledger Columns &amp; Evaluation Standard</span>
              </div>
              <h4 className="font-serif text-base font-bold text-navy-950">
                Active Column Aliases &amp; Dynamic Grading
              </h4>
              <p className="text-xs text-slate-500">
                Headers are detected flexibly (e.g. Roll No, Name, obtain Mark, Total number). Grades are dynamically computed from percentage.
              </p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200 flex items-center gap-1 shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Dynamic Grading Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Roll Number</span>
              <p className="text-xs font-mono font-bold text-navy-900 mt-1 truncate">
                {columnMappings.rollNumber || previewData?.detectedColumns?.rollNumber || "Auto-detect"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Candidate Name</span>
              <p className="text-xs font-mono font-bold text-navy-900 mt-1 truncate">
                {columnMappings.studentName || previewData?.detectedColumns?.studentName || "Auto-detect"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Father Name</span>
              <p className="text-xs font-mono font-bold text-navy-900 mt-1 truncate">
                {columnMappings.fatherName || previewData?.detectedColumns?.fatherName || "(Optional)"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Obtained Marks</span>
              <p className="text-xs font-mono font-bold text-navy-900 mt-1 truncate">
                {columnMappings.obtainedMarks || previewData?.detectedColumns?.obtainedMarks || "Auto-detect"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Marks</span>
              <p className="text-xs font-mono font-bold text-navy-900 mt-1 truncate">
                {columnMappings.totalMarks || previewData?.detectedColumns?.totalMarks || "(Default 100)"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Status Column</span>
              <p className="text-xs font-medium text-amber-700 mt-1 truncate">
                Ignored for Grade
              </p>
            </div>
          </div>
        </div>

        {/* Candidate Lookup Diagnostic Tool */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-navy-800">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Test Candidate Lookup Diagnostic</span>
              </div>
              <h4 className="font-serif text-base font-bold text-navy-950">
                Verify Sheet Candidate Lookup &amp; Dynamic Grading
              </h4>
              <p className="text-xs text-slate-500">
                Test roll number lookups (e.g. 222 or 123) directly before students search. Verifies flexible column matching and dynamic grading without saving.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={testLookupRoll}
                onChange={(e) => setTestLookupRoll(e.target.value)}
                placeholder="Enter Roll Number to test (e.g. 222, 123, 0042)"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleTestRollLookup}
              disabled={isTestingLookup || !testLookupRoll.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${isTestingLookup ? "animate-spin" : ""}`} />
              <span>{isTestingLookup ? "Testing Lookup..." : "Test Roll Number Lookup"}</span>
            </button>
          </div>

          {/* Diagnostic Result Display */}
          {lookupDiagnosticResult && (
            <div
              className={`p-5 rounded-xl border text-xs space-y-3 animate-in fade-in duration-200 ${
                lookupDiagnosticResult.success
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : lookupDiagnosticResult.code === "DUPLICATE_ROLL"
                  ? "bg-amber-50 border-amber-200 text-amber-950"
                  : "bg-red-50/70 border-red-200 text-red-950"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold">
                  {lookupDiagnosticResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>
                    {lookupDiagnosticResult.success
                      ? `Candidate Record Verified: ${lookupDiagnosticResult.result?.studentName} (Roll #${lookupDiagnosticResult.result?.rollNumber})`
                      : lookupDiagnosticResult.message}
                  </span>
                </div>
                {lookupDiagnosticResult.result?.grade && (
                  <span className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 font-bold text-xs text-emerald-800">
                    Calculated Grade: {lookupDiagnosticResult.result.grade}
                  </span>
                )}
              </div>

              {lookupDiagnosticResult.success && lookupDiagnosticResult.result && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3.5 rounded-lg border border-emerald-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Candidate</span>
                    <p className="font-bold text-navy-950 text-xs mt-0.5">{lookupDiagnosticResult.result.studentName}</p>
                    {lookupDiagnosticResult.result.fatherName && (
                      <p className="text-[11px] text-slate-500">Father: {lookupDiagnosticResult.result.fatherName}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Roll Number</span>
                    <p className="font-mono font-bold text-navy-950 text-xs mt-0.5">{lookupDiagnosticResult.result.rollNumber}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Marks Scored</span>
                    <p className="font-bold text-navy-950 text-xs mt-0.5">
                      {lookupDiagnosticResult.result.obtainedMarks} / {lookupDiagnosticResult.result.totalMarks}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Percentage &amp; Grade</span>
                    <p className="font-bold text-navy-950 text-xs mt-0.5">
                      {lookupDiagnosticResult.result.percentage}% ({lookupDiagnosticResult.result.grade})
                    </p>
                  </div>
                </div>
              )}

              {lookupDiagnosticResult.diagnosticNote && (
                <p className="text-[11px] font-mono bg-white/60 p-2.5 rounded-md border border-slate-200 text-slate-700">
                  ℹ️ {lookupDiagnosticResult.diagnosticNote}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {currentConn?.lastTestedAt && (
              <span>Last Tested: {new Date(currentConn.lastTestedAt).toLocaleString()}</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 animate-in fade-in">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Connection and Mappings Saved!</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving || !spreadsheetUrl}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-400 text-white text-xs font-bold transition-all shadow-card"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>Save {activeCategory.toUpperCase()} Connection Settings</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-bold text-navy-950">
                  Disconnect {currentConn?.categoryTitle || `${activeCategory.toUpperCase()} Category`}?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to disconnect this Google Sheet? Candidates in this category will not be able to lookup live results until a new spreadsheet is connected.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
              <p className="font-semibold text-slate-700">Target Category: {activeCategory.toUpperCase()}</p>
              <p className="truncate text-slate-500 mt-0.5">Sheet ID: {currentConn?.spreadsheetId || extractedId || "N/A"}</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDisconnectModal(false)}
                disabled={isDisconnecting}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDisconnect}
                disabled={isDisconnecting}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                {isDisconnecting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Confirm Disconnect</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
