// src/pages/admin/Login.tsx
import React, { useState } from "react";

const AdminLogin: React.FC = () => {
  const [number, setNumber] = useState("9999999999");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // simple client validation
    if (!number.trim() || !password) {
      setError("Please enter phone number and password");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        setLoading(false);
        return;
      }
      localStorage.setItem("adminToken", data.token);
      // redirect to dashboard
      window.location.href = "/admin/dashboard";
    } catch (err) {
      console.error(err);
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-red-700 drop-shadow-sm">SafeZone</h1>
        </div>

        <form
          onSubmit={submit}
          className="bg-white/95 backdrop-blur-sm border border-gray-100 rounded-2xl shadow-lg p-8"
        >
          <div className="mb-6">
            <label className="block text-red-600 font-medium mb-2">Phone Number</label>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter your phone number"
              className="w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 placeholder-gray-400"
            />
          </div>

          <div className="mb-2">
            <label className="block text-red-600 font-medium mb-2">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="Enter your password here"
              className="w-full px-5 py-4 rounded-xl border border-gray-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-200 placeholder-gray-400"
            />
          </div><br/>

          {error && <div className="mb-3 text-sm text-red-700">{error}</div>}

          <button
            type="submit"
            className={`w-full py-4 rounded-2xl text-white text-lg font-semibold shadow-md transition-transform active:translate-y-0.5
              ${loading ? "opacity-80 cursor-wait" : "hover:scale-[1.01]"}
              bg-gradient-to-r from-red-500 to-red-600`}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
