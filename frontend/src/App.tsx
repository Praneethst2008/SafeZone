import { useState, useEffect } from "react";

// auth pages
import Login from "./pages/auth/Login";
import SignUp from "./pages/auth/SignUp";
import ForgotPassword from "./pages/auth/ForgotPassword";


// user pages
import Home from "./pages/home/Home";
import Recorder from "./pages/recorder/Recorder";
import AbuseReport from "./pages/report/AbuseReport";
import Community from "./pages/socialcommunity/Community";
import Vault from "./pages/vault/Vault";
import Profile from "./pages/Profile";
import MyReports from "./pages/report/MyReports";
import FalseAccusationAnalyser from "./pages/Analyser/FalseAccusationAnalyser";

// admin pages
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/adminDashboard";
import AdminReport from "./pages/admin/adminReport";
import AdminCommunity from "./pages/admin/adminCommunity";

import Notifications from "./pages/Notification";
import VaultPasscode from "./pages/vault/VaultPasscode";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import SOSConfirmationPopup from "./components/SOSConfirmationPopup";
import SMSonSOS from "./components/SMSonSOS";
import { startLocationCache } from "./utils/locationCache";

import {
  startThreatDetection,
  stopThreatDetection,
} from "./utils/threatDetectionManager";

const App = () => {
  const [page, setPage] = useState("home");

  useEffect(() => {
    startLocationCache();
  }, []);

  /* 🔥 SYNC THREAT DETECTION FROM DB */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    // Optimization - Don't fetch if we already have it for this session
    const isFirstRun = !sessionStorage.getItem("threatSyncDone");
    if (!isFirstRun) {
      if (localStorage.getItem("threatDetectionEnabled") === "true") startThreatDetection();
      else stopThreatDetection();
      return;
    }

    fetch(`${import.meta.env.VITE_API_BASE}/api/auth/threat-detection`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        localStorage.setItem(
          "threatDetectionEnabled",
          data.enabled.toString()
        );
        sessionStorage.setItem("threatSyncDone", "true");

        if (data.enabled) startThreatDetection();
        else stopThreatDetection();
      })
      .catch(() => {
        if (localStorage.getItem("threatDetectionEnabled") === "true") {
          startThreatDetection();
        } else {
          stopThreatDetection();
        }
      });
  }, []);

  /* ADMIN ROUTES */
  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";

  if (pathname === "/admin") return <AdminLogin />;
  if (pathname === "/admin/dashboard") return <AdminDashboard />;
  if (pathname === "/admin/reports") return <AdminReport />;
  if (pathname === "/admin/community") return <AdminCommunity />;

  /* AUTH */
  const [authView, setAuthView] = useState<"login" | "signup" | "forgot-password">("login");
  const token = localStorage.getItem("token");

  if (!token) {
    return (
      <div className="bg-gray-200 min-h-screen">
        {authView === "login" && <Login onNavigate={setAuthView} />}
        {authView === "signup" && <SignUp onNavigate={setAuthView} />}
        {authView === "forgot-password" && <ForgotPassword onNavigate={setAuthView} />}
        <ToastContainer />
      </div>
    );
  }

  /* MAIN APP */
  return (
    <>
      {/* 🚨 GLOBAL EMERGENCY LOGIC */}
      <SOSConfirmationPopup />
      <SMSonSOS />

      {page === "home" && <Home setPage={setPage} />}
      {page === "recorder" && <Recorder setPage={setPage} />}
      {page === "report" && <AbuseReport setPage={setPage} />}
      {page === "vault" && <Vault setPage={setPage} />}
      {page === "vaultpasscode" && <VaultPasscode setPage={setPage} />}
      {page === "community" && <Community setPage={setPage} />}
      {page === "profile" && <Profile setPage={setPage} />}
      {page === "myreports" && <MyReports setPage={setPage} />}
      {page === "notifications" && <Notifications setPage={setPage} />}
      {page === "analyser" && (<FalseAccusationAnalyser setPage={setPage} />)}
    </>
  );
};

export default App;
