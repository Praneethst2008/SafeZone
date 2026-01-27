import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

type StatusFilter = "all" | "pending" | "processing";

const AdminReport = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [sortOrder, setSortOrder] = useState<"new" | "old">("new");

  useEffect(() => {
    apiFetch("/api/reports/all", {}, true)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setReports(data);
          // auto-select first pending report
          const firstPending = data.find((r: any) => r.status === "pending");
          setSelected(firstPending || data[0] || null);
        } else {
          toast.error(data.message || "Failed to load reports");
        }
      })
      .catch(() => toast.error("Failed to load reports"));
  }, []);

  /* ---------------- FILTER + SORT LOGIC ---------------- */

  const filteredReports = useMemo(() => {
    let list = [...reports];

    // filter
    if (statusFilter !== "all") {
      list = list.filter(r => r.status === statusFilter);
    }

    // pending first always
    list.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;

      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sortOrder === "new" ? db - da : da - db;
    });

    return list;
  }, [reports, statusFilter, sortOrder]);

  /* ---------------- ACTIONS ---------------- */

  const updateStatus = async (status: string, remark: string) => {
    if (!selected) return;

    try {
      await apiFetch(`/api/reports/${selected._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminRemark: remark,
          internalNote: selected._internalDraft   // ✅ ADD HERE
        })
      },
        true
      );

      toast.success("Report updated");

      setReports(prev =>
        prev.map(r =>
          r._id === selected._id
            ? { ...r, status, adminRemark: remark }
            : r
        )
      );

      setSelected((prev: any) => ({ ...prev, status, adminRemark: remark }));
    } catch {
      toast.error("Update failed");
    }
  };

  /* ---------------- FILE PREVIEW ---------------- */

  const renderFile = (file: string) => {
    const url = `${API_BASE}/${file}`;
    if (file.match(/\.(jpg|jpeg|png)$/i))
      return (
        <div className="relative group">
          <img
            src={url}
            className="w-40 h-40 rounded-lg object-cover shadow-sm hover:shadow-md transition-shadow duration-200"
            alt="Evidence"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200" />
        </div>
      );
    if (file.match(/\.(mp4|webm)$/i))
      return (
        <div className="bg-gray-900 rounded-lg p-2">
          <video src={url} controls className="w-64 rounded" />
        </div>
      );
    if (file.match(/\.(mp3|wav)$/i))
      return (
        <div className="bg-gray-50 p-4 rounded-lg">
          <audio src={url} controls className="w-64" />
        </div>
      );
    if (file.match(/\.pdf$/i))
      return (
        <a
          href={url}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
          View PDF
        </a>
      );
    return null;
  };

  /* ---------------- STATUS BADGE ---------------- */
  const getStatusBadge = (status: string) => {
    const base = "px-3 py-1 rounded-full text-xs font-semibold";
    switch (status) {
      case 'pending': return `${base} bg-yellow-100 text-yellow-800`;
      case 'processing': return `${base} bg-blue-100 text-blue-800`;
      case 'genuine': return `${base} bg-green-100 text-green-800`;
      case 'fake': return `${base} bg-red-100 text-red-800`;
      default: return `${base} bg-gray-100 text-gray-800`;
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => window.location.href = "/admin/dashboard"}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 group"
          >
            <svg className="w-4 h-4 transform group-hover:-translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Report Administration</h1>
              <p className="text-gray-600 mt-1">Review and manage submitted reports</p>
            </div>
            {/* ... rest of your header buttons ... */}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT PANEL - Reports List */}
          <div className="lg:col-span-1 space-y-4">
            {/* Filters Card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Filters & Sorting</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status Filter
                  </label>
                  <div className="flex gap-2">
                    {(['pending', 'processing', 'all'] as StatusFilter[]).map(filter => (
                      <button
                        key={filter}
                        onClick={() => setStatusFilter(filter)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${statusFilter === filter
                          ? filter === 'pending' ? 'bg-yellow-100 text-yellow-800'
                            : filter === 'processing' ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {filter.charAt(0).toUpperCase() + filter.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sort Order
                  </label>
                  <div className="flex gap-2">
                    {(['new', 'old'] as const).map(order => (
                      <button
                        key={order}
                        onClick={() => setSortOrder(order)}
                        className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${sortOrder === order
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {order === 'new' ? 'Newest First' : 'Oldest First'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Reports List Card */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-gray-900">Reports</h3>
                  <span className="text-sm text-gray-500">
                    {filteredReports.length} found
                  </span>
                </div>
              </div>

              <div className="max-h-[calc(85vh-180px)] overflow-y-auto">
                {filteredReports.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">No reports found</p>
                  </div>
                ) : (
                  filteredReports.map(r => (
                    <div
                      key={r._id}
                      onClick={() => setSelected(r)}
                      className={`p-4 cursor-pointer transition-all duration-200 ${selected?._id === r._id
                        ? r.status === 'pending' ? 'bg-yellow-50'
                          : r.status === 'processing' ? 'bg-blue-50'
                            : r.status === 'genuine' ? 'bg-green-50'
                              : 'bg-red-50'
                        : 'hover:bg-gray-50'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-gray-900 truncate mr-2">{r.category}</div>
                        <span className={getStatusBadge(r.status)}>
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {r.description}
                      </div>

                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>
                          {r.userId?.username || 'Anonymous'}
                        </span>
                        <span>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {r.files?.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {r.files.length} file{r.files.length !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - Report Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm h-[85vh] overflow-hidden flex flex-col">
              {!selected ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Report</h3>
                  <p className="text-gray-600 text-center max-w-sm">
                    Choose a report from the list to view detailed information and take action
                  </p>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Report Details</h2>
                        <div className="flex items-center gap-2">
                          <span className={getStatusBadge(selected.status)}>
                            {selected.status.charAt(0).toUpperCase() + selected.status.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            Created {new Date(selected.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{selected.category}</div>
                        <div className="text-xs text-gray-500">Category</div>
                      </div>
                    </div>
                    {/* AI ANALYSIS */}
                    {selected.aiAnalysis && (
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-3 mb-4">
                        <h3 className="font-semibold text-purple-700 mb-1">
                          AI Assisted Analysis
                        </h3>

                        <p className="text-sm">
                          <strong>Priority Score:</strong>{" "}
                          {selected.aiAnalysis.score} / 100
                        </p>

                        <p className="text-sm">
                          <strong>Risk Level:</strong>{" "}
                          {selected.aiAnalysis.level}
                        </p>

                        {selected.aiAnalysis.flags.length > 0 && (
                          <ul className="list-disc list-inside text-sm mt-1">
                            {selected.aiAnalysis.flags.map((f: string, i: number) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Reporter Information */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Reporter Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="font-medium">Name:</span>
                            <span>{selected.fullName || "Anonymous"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                            </svg>
                            <span className="font-medium">User:</span>
                            <span>{selected.userId?.username || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="font-medium">Phone:</span>
                            <span>{selected.userId?.phoneNumber || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Incident Details */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Incident Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Location</div>
                          <div className="font-medium">{selected.location || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Date</div>
                          <div className="font-medium">{selected.date || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1">Time</div>
                          <div className="font-medium">{selected.time || "N/A"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Description</h3>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-700 leading-relaxed">{selected.description}</p>
                      </div>
                    </div>



                    {/* Evidence */}
                    {selected.files?.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Evidence</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {selected.files.map((f: string, i: number) => (
                            <div key={i} className="flex flex-col items-center">
                              <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
                                {renderFile(f)}
                              </div>
                              <div className="text-xs text-gray-500 mt-2 truncate w-full text-center">
                                File {i + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Admin Remarks */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Public Remark</h3>
                        <textarea
                          defaultValue={selected.adminRemark || ""}
                          placeholder="Enter remark visible to the user..."
                          className="w-full p-3 text-sm rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          rows={3}
                          onChange={e => (selected._remarkDraft = e.target.value)}
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3">Internal Notes</h3>
                        <textarea
                          defaultValue={selected.internalNote || ""}
                          placeholder="Private notes for admin reference only..."
                          className="w-full p-3 text-sm rounded-lg bg-yellow-50 focus:bg-yellow-100 focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all duration-200"
                          rows={3}
                          onChange={e => (selected._internalDraft = e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => updateStatus("processing", selected._remarkDraft)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Mark as Processing
                      </button>
                      <button
                        onClick={() => updateStatus("genuine", selected._remarkDraft)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Mark as Genuine
                      </button>
                      <button
                        onClick={() => updateStatus("fake", selected._remarkDraft)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Mark as Fake
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReport;