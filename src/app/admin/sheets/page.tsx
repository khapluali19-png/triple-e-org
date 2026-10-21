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
  Copy,
  Table,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  MapPin,
  Search,
  GraduationCap,
  Building2,
  User,
  Layers
} from "lucide-react";
import { 
  CenterId, 
  CenterSheetConnection, 
  CenterColumnMappings, 
  SheetPreviewData,
  StudentResult 
} from "@/lib/types";
import { 
  EXAMINATION_CENTERS, 
  DEFAULT_CENTER_SHEETS_CONFIG,
  getLevelDescription 
} from "@/lib/constants";

export default function AdminSheetsPage() {
  const [activeCenterId, setActiveCenterId] = useState<string>("khaplu");
  const [centerConnections, setCenterConnections] = useState<Record<string, CenterSheetConnection>>(DEFAULT_CENTER_SHEETS_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [applyToAllCenters, setApplyToAllCenters] = useState(false);

  // Active form state for selected center
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [worksheetName, setWorksheetName] = useState("");
  const [headerRowIndex, setHeaderRowIndex] = useState(1);
  const [columnMappings, setColumnMappings] = useState<CenterColumnMappings>({
    studentName: "",
    fatherName: "",
    schoolName: "",
    classOrSection: "",
    tehsil: "",
    totalMarks: "",
    obtainedMarks: "",
    level: "",
    rollNumber: "",
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

  // Diagnostic Test Lookup state for student search
  const [testStudentName, setTestStudentName] = useState("Ali Raza");
  const [testFatherName, setTestFatherName] = useState("");
  const [testSchoolName, setTestSchoolName] = useState("");
  const [testRollNumber, setTestRollNumber] = useState("");
  const [isTestingLookup, setIsTestingLookup] = useState(false);
  const [lookupDiagnosticResult, setLookupDiagnosticResult] = useState<{
    success: boolean;
    message?: string;
    result?: StudentResult;
    detectedColumns?: Record<string, string | null | undefined>;
    diagnosticNote?: string;
    code?: string;
    ambiguityDetected?: boolean;
  } | null>(null);

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
            if (data.store.centers) {
              setCenterConnections({
                ...DEFAULT_CENTER_SHEETS_CONFIG,
                ...data.store.centers,
              });
            }
            setServiceAccountEmail(
              data.store.serviceAccountEmail || "triple-e-sheets-sync@triple-e-org.iam.gserviceaccount.com"
            );
          }
        }
      } catch (err) {
        console.error("Failed to load center sheet connections:", err);
      } finally {
        setLoadingConfig(false);
      }
    }
    loadStore();
  }, []);

  // Update form fields when activeCenterId or connections change
  useEffect(() => {
    const conn = centerConnections[activeCenterId] || DEFAULT_CENTER_SHEETS_CONFIG[activeCenterId];
    if (conn) {
      setSpreadsheetUrl(conn.spreadsheetUrl || "");
      setWorksheetName(conn.worksheetName || conn.centerName || "");
      setHeaderRowIndex(conn.headerRowIndex || 1);
      setColumnMappings(
        conn.columnMappings || {
          studentName: "Name",
          fatherName: "Father Name",
          schoolName: "School",
          classOrSection: "Class",
          tehsil: "Tehsil",
          totalMarks: "Total Marks",
          obtainedMarks: "Obt. Marks",
          level: "Level",
          rollNumber: "Roll No",
        }
      );
      setTestResult(null);
      setPreviewData(null);
      setSaveSuccess(false);
      setLookupDiagnosticResult(null);
    }
  }, [activeCenterId, centerConnections]);

  // Extract spreadsheet ID dynamically
  const getExtractedId = (urlOrId: string) => {
    const match = urlOrId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) return match[1];
    if (/^[a-zA-Z0-9-_]{20,80}$/.test(urlOrId.trim())) return urlOrId.trim();
    return null;
  };

  const extractedId = getExtractedId(spreadsheetUrl);
  const activeCenter = EXAMINATION_CENTERS.find((c) => c.id === activeCenterId);
  const currentConn = centerConnections[activeCenterId] || DEFAULT_CENTER_SHEETS_CONFIG[activeCenterId];

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

        // Apply suggested mappings if available
        if (data.preview.suggestedMappings) {
          setColumnMappings((prev) => ({
            ...prev,
            studentName: prev.studentName || data.preview.suggestedMappings.studentName || "",
            obtainedMarks: prev.obtainedMarks || data.preview.suggestedMappings.obtainedMarks || "",
            fatherName: prev.fatherName || data.preview.suggestedMappings.fatherName || "",
            schoolName: prev.schoolName || data.preview.suggestedMappings.schoolName || "",
            tehsil: prev.tehsil || data.preview.suggestedMappings.tehsil || "",
            classOrSection: prev.classOrSection || data.preview.suggestedMappings.classOrSection || "",
            level: prev.level || data.preview.suggestedMappings.level || "",
            totalMarks: prev.totalMarks || data.preview.suggestedMappings.totalMarks || "",
            rollNumber: prev.rollNumber || data.preview.suggestedMappings.rollNumber || "",
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

    if (!columnMappings.studentName || !columnMappings.obtainedMarks) {
      alert("Please map at least: Student Name and Obtained Marks.");
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
          centerId: activeCenterId,
          applyToAllCenters,
          connection: {
            centerId: activeCenterId,
            centerName: activeCenter?.name || activeCenterId,
            spreadsheetUrl,
            spreadsheetId: extractedId,
            worksheetName: worksheetName || activeCenter?.name || "Sheet1",
            headerRowIndex,
            status: "connected",
            lastTestedAt: new Date().toISOString(),
            columnMappings,
            availableWorksheets: previewData?.availableWorksheets || currentConn?.availableWorksheets,
            detectedHeaders: previewData?.headers || currentConn?.detectedHeaders,
          },
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSuccess(true);
        // Update local state for all centers or active center
        if (data.centers) {
          setCenterConnections(data.centers);
        } else if (data.connection) {
          setCenterConnections((prev) => ({
            ...prev,
            [activeCenterId]: data.connection,
          }));
        }
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
          centerId: activeCenterId,
          connection: {
            status: "disconnected",
          },
        }),
      });

      if (res.ok) {
        setCenterConnections((prev) => ({
          ...prev,
          [activeCenterId]: {
            ...prev[activeCenterId],
            status: "disconnected",
          },
        }));
        setPreviewData(null);
        setTestResult(null);
        setShowDisconnectModal(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to disconnect center.");
      }
    } catch (err: any) {
      alert(err.message || "Error disconnecting center.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleTestCandidateLookup = async () => {
    if (!testStudentName.trim() && !testRollNumber.trim()) {
      alert("Please enter a Student Name to test.");
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
          centerId: activeCenterId,
          studentName: testStudentName.trim() || undefined,
          fatherName: testFatherName.trim() || undefined,
          schoolName: testSchoolName.trim() || undefined,
          rollNumber: testRollNumber.trim() || undefined,
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

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(serviceAccountEmail);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const availableHeaders = previewData?.headers || currentConn?.detectedHeaders || [];

  const filteredCenters = EXAMINATION_CENTERS.filter((c) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.tehsil && c.tehsil.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-8 max-w-6xl pb-16">
      {/* Service Account Security Protocol Banner */}
      <div className="bg-navy-950 rounded-2xl p-6 sm:p-7 border border-navy-800 text-white shadow-elevated relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-navy-900 border border-gold-500/40 text-gold-300 text-xs font-semibold">
              <Key className="w-3.5 h-3.5 text-gold-400" />
              <span>Official Google Sheets API • 15 Examination Centers Integration</span>
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-white tracking-tight">
              Independent Examination Center Ledgers
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Connect a dedicated Google Spreadsheet or worksheet tab for each of the 15 examination centers across Gilgit-Baltistan. Share your Google Sheets as <strong className="text-white font-semibold">Viewer</strong> with the authorized Triple-E Service Account email.
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

      {/* Examination Centers Selector Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-blue-700">
              <MapPin className="w-4 h-4 text-gold-500" />
              <span>Select Examination Center ({EXAMINATION_CENTERS.length} Centers)</span>
            </div>
            <h3 className="font-serif text-xl font-bold text-navy-950">
              Configure Google Sheet Connection per Center
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter centers or tehsils..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
            />
          </div>
        </div>

        {/* 15 Centers Interactive Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {filteredCenters.map((center) => {
            const isSelected = activeCenterId === center.id;
            const conn = centerConnections[center.id] || DEFAULT_CENTER_SHEETS_CONFIG[center.id];
            const isConnected = conn?.status === "connected";

            return (
              <button
                key={center.id}
                type="button"
                onClick={() => setActiveCenterId(center.id)}
                className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? "bg-white border-navy-950 shadow-card ring-2 ring-navy-950/20"
                    : "bg-slate-50/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-2xs"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono text-slate-400 uppercase">
                      {center.tehsil || "GB"}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isConnected ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-slate-300"
                      }`}
                      title={isConnected ? "Sheet Connected" : "Disconnected"}
                    />
                  </div>
                  <h4 className="font-serif text-sm font-bold text-navy-950 leading-tight">
                    {center.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className={`font-semibold ${isConnected ? "text-emerald-700" : "text-slate-500"}`}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                  {isSelected && <ArrowRight className="w-3 h-3 text-navy-950" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Connection Form for Selected Center */}
      <form onSubmit={handleSaveConnection} className="space-y-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-bold uppercase tracking-wider mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeCenter?.tehsil ? `Tehsil ${activeCenter.tehsil}` : "Examination Center"}</span>
              </div>
              <h3 className="font-serif text-2xl font-bold text-navy-950">
                {activeCenter?.name || activeCenterId} Center Ledger Settings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Attach an independent spreadsheet or worksheet tab specifically for candidate results from {activeCenter?.name}.
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
                <span>Accepts full Google Sheets browser URL or raw spreadsheet ID.</span>
                {extractedId && (
                  <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ID: {extractedId.slice(0, 8)}...{extractedId.slice(-6)}
                  </span>
                )}
              </div>
              <div className="pt-1.5">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={applyToAllCenters}
                    onChange={(e) => setApplyToAllCenters(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-navy-950 focus:ring-navy-900 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Apply this Google Sheet connection to all 15 examination centers
                  </span>
                </label>
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
                  placeholder={`e.g. ${activeCenter?.name || "Sheet1"}`}
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
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
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
                Map Spreadsheet Columns to Candidate Attributes
              </h3>
              <p className="text-xs text-slate-500">
                Student Name is the primary lookup key. Results can be verified using Father Name and School Name.
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student Name */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
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
                      Full candidate name (primary search key for lookup).
                    </span>
                  </div>

                  {/* Obtained Marks */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
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
                      Numerical score obtained out of total points.
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification & Scorecard Fields */}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                  Verification &amp; Scorecard Enrichment Fields
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
                    <span className="text-[10px] text-slate-400 block">Secondary verification</span>
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
                    <span className="text-[10px] text-slate-400 block">Additional verification</span>
                  </div>

                  {/* Class / Section */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Class / Grade
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
                    <span className="text-[10px] text-slate-400 block">e.g. Class 8, Class 10</span>
                  </div>

                  {/* Tehsil */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Tehsil
                    </label>
                    <select
                      value={columnMappings.tehsil || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, tehsil: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">e.g. Khaplu, Keris</span>
                  </div>

                  {/* Level */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Level (1, 2, 3)
                    </label>
                    <select
                      value={columnMappings.level || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, level: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">Level 1, 2, or 3</span>
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
                    <span className="text-[10px] text-slate-400 block">Denominator score</span>
                  </div>

                  {/* Roll Number */}
                  <div className="p-3 rounded-lg border border-slate-200 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      Roll Number (Optional)
                    </label>
                    <select
                      value={columnMappings.rollNumber || ""}
                      onChange={(e) => setColumnMappings({ ...columnMappings, rollNumber: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-300 text-xs bg-white"
                    >
                      <option value="">(None / Omit)</option>
                      {availableHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                    <span className="text-[10px] text-slate-400 block">Shown if present</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sample Rows Preview */}
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

        {/* Diagnostic Candidate Lookup Tool */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-card space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-navy-800">
                <Sparkles className="w-4 h-4 text-gold-500" />
                <span>Test Candidate Lookup Diagnostic ({activeCenter?.name})</span>
              </div>
              <h4 className="font-serif text-base font-bold text-navy-950">
                Verify Sheet Candidate Lookup &amp; Verification Rules
              </h4>
              <p className="text-xs text-slate-500">
                Test lookup directly against this center&apos;s connected sheet by Student Name, with optional Father Name or School Name disambiguation.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Student Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={testStudentName}
                onChange={(e) => setTestStudentName(e.target.value)}
                placeholder="e.g. Ali Raza"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Father Name (Optional)
              </label>
              <input
                type="text"
                value={testFatherName}
                onChange={(e) => setTestFatherName(e.target.value)}
                placeholder="Secondary verification"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                School Name (Optional)
              </label>
              <input
                type="text"
                value={testSchoolName}
                onChange={(e) => setTestSchoolName(e.target.value)}
                placeholder="Additional verification"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium text-xs text-navy-950 focus:ring-2 focus:ring-navy-900 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleTestCandidateLookup}
                disabled={isTestingLookup || !testStudentName.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-300 text-white text-xs font-bold transition-all shadow-xs cursor-pointer h-[38px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-gold-400 ${isTestingLookup ? "animate-spin" : ""}`} />
                <span>{isTestingLookup ? "Searching..." : "Test Candidate Lookup"}</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Result Display */}
          {lookupDiagnosticResult && (
            <div
              className={`p-5 rounded-xl border text-xs space-y-3 animate-in fade-in duration-200 ${
                lookupDiagnosticResult.success
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                  : lookupDiagnosticResult.ambiguityDetected
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
                      ? `Candidate Record Verified: ${lookupDiagnosticResult.result?.studentName}`
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
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Center &amp; Level</span>
                    <p className="font-bold text-navy-950 text-xs mt-0.5">
                      {lookupDiagnosticResult.result.examinationCenter}
                    </p>
                    {lookupDiagnosticResult.result.level && (
                      <p className="text-[11px] text-slate-500">
                        {lookupDiagnosticResult.result.level} ({getLevelDescription(lookupDiagnosticResult.result.level)})
                      </p>
                    )}
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
                <span>{activeCenter?.name} Sheet Connection Saved!</span>
              </span>
            )}

            <button
              type="submit"
              disabled={isSaving || !spreadsheetUrl}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-navy-950 hover:bg-navy-900 disabled:bg-slate-400 text-white text-xs font-bold transition-all shadow-card cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-gold-400" />
                  <span>Saving Configuration...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-gold-400" />
                  <span>Save {activeCenter?.name || activeCenterId} Connection</span>
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
                  Disconnect {activeCenter?.name || activeCenterId} Center Sheet?
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Are you sure you want to disconnect this Google Sheet? Students selecting {activeCenter?.name} will receive a notice asking them to contact the administration until a new spreadsheet is connected.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 font-mono">
              <p className="font-semibold text-slate-700">Target Center: {activeCenter?.name || activeCenterId}</p>
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
