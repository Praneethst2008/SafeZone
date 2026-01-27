import { useEffect, useState } from "react";
import { apiFetch } from "../../utils/api";

type AdminItem = { id: string; phoneNumber: string; name?: string };

const Dashboard: React.FC = () => {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      window.location.href = "/admin";
      return;
    }
    // try to fetch existing admins
    (async function fetchAdmins() {
      setFetching(true);
      try {
        const res = await apiFetch("/api/admin/list", {}, true);
        if (res.ok) {
          const data = await res.json();
          setAdmins(Array.isArray(data.admins) ? data.admins.map((a: any) => ({ id: a._id || a.id, phoneNumber: a.phoneNumber, name: a.name })) : []);
        }
      } catch (err) {
        // ignore if network error
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  const logout = () => {
    localStorage.removeItem("adminToken");
    window.location.href = "/";
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // client validation
    if (!phoneNumber.trim() || !password) {
      setMessage({ type: "error", text: "Phone number and password are required." });
      return;
    }
    if (!/^\d{6,15}$/.test(phoneNumber.trim())) {
      setMessage({ type: "error", text: "Enter a valid phone number (digits only)." });
      return;
    }
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password should be at least 6 characters." });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/create-admin", {
        method: "POST",
        body: JSON.stringify({ phoneNumber: phoneNumber.trim(), password, name: name.trim() || undefined }),
      }, true);
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.message || "Failed to create admin" });
        setLoading(false);
        return;
      }

      setMessage({ type: "success", text: "Admin created successfully." });
      // append to admins list
      setAdmins((prev) => [...prev, { id: data.admin?.id || Date.now().toString(), phoneNumber: data.admin?.phoneNumber || phoneNumber.trim(), name: data.admin?.name || name.trim() }]);
      setPhoneNumber("");
      setPassword("");
      setName("");
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
              <p className="text-gray-600">Manage administrators and system access</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => window.location.href = "/admin/reports"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Manage Reports
              </button>

              <button
                onClick={() => window.location.href = "/admin/community"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Manage Community
              </button>

              <button
                onClick={() => window.location.href = "/"}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to App
              </button>

              <button
                onClick={logout}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors duration-200"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Total Admins</div>
              <div className="text-2xl font-bold text-gray-900">{admins.length}</div>
              <div className="text-xs text-gray-400 mt-1">Registered administrators</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Status</div>
              <div className="text-2xl font-bold text-green-600">Active</div>
              <div className="text-xs text-gray-400 mt-1">System operational</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-sm text-gray-500 mb-1">Last Created</div>
              <div className="text-2xl font-bold text-blue-600">
                {admins.length > 0 ? new Date().toLocaleDateString() : '--/--/----'}
              </div>
              <div className="text-xs text-gray-400 mt-1">Most recent admin</div>
            </div>
          </div>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Admin Form */}
          <section className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9h-15M4.5 9.5a3 3 0 01-3-3v-1a3 3 0 013-3h15a3 3 0 013 3v1a3 3 0 01-3 3" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Create New Admin</h2>
              </div>

              <form onSubmit={createAdmin} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name <span className="text-gray-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all duration-200"
                      placeholder="John Doe"
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <div className="relative">
                    <input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      inputMode="numeric"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all duration-200"
                      placeholder="10-digit number"
                      required
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Digits only, 6-15 characters</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-red-100 focus:border-red-300 transition-all duration-200"
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <svg className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Secure password for admin access</p>
                </div>

                {message && (
                  <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                    <div className="flex items-center gap-2">
                      {message.type === "success" ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-sm font-medium">{message.text}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-lg text-white font-medium transition-colors duration-200 ${loading ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                      }`}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      "Create Admin Account"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setName("");
                      setPhoneNumber("");
                      setPassword("");
                      setMessage(null);
                    }}
                    className="px-4 py-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors duration-200"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* Admin List */}
          <section className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Administrators</h2>
                    <p className="text-gray-600 text-sm mt-1">All registered admin users in the system</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                      {fetching ? "Loading..." : `${admins.length} admin${admins.length !== 1 ? 's' : ''}`}
                    </div>
                    <button
                      onClick={() => {
                        const csvContent = admins.map(a => `${a.name || ''},${a.phoneNumber}`).join('\n');
                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'admins.csv';
                        a.click();
                      }}
                      className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      Export
                    </button>
                  </div>
                </div>
              </div>

              {admins.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9h-15M4.5 9.5a3 3 0 01-3-3v-1a3 3 0 013-3h15a3 3 0 013 3v1a3 3 0 01-3 3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Administrators Yet</h3>
                  <p className="text-gray-600 max-w-sm mx-auto mb-4">
                    Create your first admin account to manage the system. They will have full access to the admin panel.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {admins.map((a, index) => (
                    <div key={a.id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-red-100 to-red-50 rounded-lg flex items-center justify-center">
                            <span className="text-lg font-semibold text-red-600">
                              {(a.name?.[0] || a.phoneNumber[0] || 'A').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-gray-900">{a.name || "Unnamed Admin"}</h3>
                              {index === 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                  Primary
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {a.phoneNumber}
                              </div>
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Added recently
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(a.phoneNumber);
                              setMessage({ type: "success", text: `Copied ${a.phoneNumber} to clipboard` });
                              setTimeout(() => setMessage(null), 2000);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Admins created here can log in using their phone number and password.
                    For live admin listing, implement a protected <code className="bg-white px-1 rounded">GET /api/admin/list</code> endpoint.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;