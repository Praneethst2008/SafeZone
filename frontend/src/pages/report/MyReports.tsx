import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const MyReports = ({ setPage }: { setPage: (p: string) => void }) => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------- FETCH REPORTS ---------------- */
  useEffect(() => {
    apiFetch("/api/reports/my")
      .then(res => res.json())
      .then(data => {
        setReports(data || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load reports");
        setLoading(false);
      });
  }, []);

  /* ---------------- STATUS BADGE ---------------- */
  const badge = (status: string) =>
    status === "pending"
      ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
      : status === "processing"
        ? "bg-blue-100 text-blue-700 border border-blue-200"
        : status === "genuine"
          ? "bg-green-100 text-green-700 border border-green-200"
          : "bg-red-100 text-red-700 border border-red-200";

  /* ---------------- DELETE REPORT ---------------- */
  const deleteReport = async (id: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    const res = await apiFetch(`/api/reports/${id}`, {
      method: "DELETE"
    });

    if (res.ok) {
      toast.success("Report deleted successfully");
      setReports(prev => prev.filter(r => r._id !== id));
    } else {
      const data = await res.json();
      toast.error(data.message || "Delete failed");
    }
  };

  /* ---------------- LOADING ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading your reports...</p>
        </div>
      </div>
    );
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <button
            onClick={() => setPage("home")}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors duration-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back
          </button>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Reports</h1>
                <p className="text-gray-600 mt-1">Track and manage your submitted reports</p>
              </div>
              <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-100">
                <span className="font-semibold">{reports.length}</span> report{reports.length !== 1 ? 's' : ''} total
              </div>
            </div>
          </div>
        </div>

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="max-w-sm mx-auto">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-600 mb-6">You haven't submitted any reports. Reports you submit will appear here.</p>
              <button
                onClick={() => setPage("report")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                Submit Your First Report
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {reports.map(r => (
              <div
                key={r._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-gray-100 overflow-hidden"
              >
                {/* Status Header */}
                <div className={`px-6 py-3 ${r.status === 'genuine' ? 'bg-green-50' : r.status === 'fake' ? 'bg-red-50' : r.status === 'processing' ? 'bg-blue-50' : 'bg-yellow-50'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">
                      {r.category}
                    </span>
                    <span
                      className={`px-3 py-1 text-xs rounded-full font-semibold ${badge(
                        r.status
                      )}`}
                    >
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Description */}
                  <div className="mb-6">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</h4>
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {r.description}
                    </p>
                  </div>

                  {/* Evidence Preview */}
                  {r.files?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Evidence</h4>
                      <div className="grid grid-cols-4 gap-2">
                        {r.files.map((f: string, i: number) => (
                          <div key={i} className="relative aspect-square">
                            <img
                              src={`${import.meta.env.VITE_API_BASE}/${f}`}
                              alt="evidence"
                              className="w-full h-full object-cover rounded-lg border border-gray-200 hover:border-blue-300 transition-colors duration-200"
                            />
                            <div className="absolute inset-0 bg-opacity-0 hover:bg-opacity-10 transition-opacity duration-200 rounded-lg" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {r.statusHistory?.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status History</h4>
                      <div className="space-y-2">
                        {r.statusHistory.map((s: any, i: number) => (
                          <div key={i} className="flex items-start gap-3 text-sm">
                            <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded-full mt-1 ${s.status === 'pending' ? 'bg-yellow-400' :
                                s.status === 'processing' ? 'bg-blue-400' :
                                  s.status === 'genuine' ? 'bg-green-400' : 'bg-red-400'
                                }`} />
                              {i < r.statusHistory.length - 1 && (
                                <div className="w-0.5 h-4 bg-gray-200"></div>
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex justify-between">
                                <span className="font-medium text-gray-900 capitalize">{s.status}</span>
                                <span className="text-gray-500 text-xs">
                                  {new Date(s.updatedAt).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="text-gray-500 text-xs mt-0.5">
                                {new Date(s.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Remark */}
                  {r.adminRemark && (
                    <div className="mb-6">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Admin Remark</h4>
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-700 leading-relaxed">{r.adminRemark}</p>
                      </div>
                    </div>
                  )}

                  {/* Delete Button */}
                  {["pending", "processing"].includes(r.status) && (
                    <div className="pt-4 border-t border-gray-100">
                      <button
                        onClick={() => deleteReport(r._id)}
                        className="inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors duration-200"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Report
                      </button>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                  <div className="text-xs text-gray-500">
                    Submitted on {new Date(r.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyReports;