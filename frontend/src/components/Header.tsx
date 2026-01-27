import { useEffect, useState } from "react";
import MenuIcon from "@mui/icons-material/Menu";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { apiFetch } from "../utils/api";

const Header = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  // 🔔 fetch unread notification count
  useEffect(() => {
    apiFetch("/api/notifications/unread-count")
      .then(res => res.json())
      .then(data => setNotifCount(data.count || 0))
      .catch(() => { });
  }, []);

  return (
    <>
      {/* FIXED TOP HEADER */}
      <div
        className="
          bg-white 
          p-4 
          shadow-md 
          flex 
          items-center 
          justify-between 
          fixed 
          top-0 
          left-0 
          w-full 
          z-50
        "
      >
        {/* Left Menu Icon */}
        <MenuIcon
          sx={{ fontSize: 32 }}
          className="text-black cursor-pointer"
          onClick={() => setMenuOpen(true)}
        />

        {/* Title */}
        <h1 className="text-3xl font-bold text-red-600">SafeZone</h1>

        {/* Right Icons */}
        <div className="flex items-center gap-4">

          {/* 🔔 Notification Icon */}
          <div
            className="relative cursor-pointer"
            onClick={() => onNavigate("notifications")}
          >
            <NotificationsIcon sx={{ fontSize: 30 }} />

            {notifCount > 0 && (
              <span
                className="
                  absolute 
                  -top-1 
                  -right-1 
                  bg-red-600 
                  text-white 
                  text-xs 
                  px-1.5 
                  rounded-full
                "
              >
                {notifCount}
              </span>
            )}
          </div>

          {/* 👤 Profile Icon */}
          <AccountCircleIcon
            sx={{ fontSize: 35 }}
            className="text-black cursor-pointer"
            onClick={() => onNavigate("profile")}
          />
        </div>
      </div>

      {/* SIDE MENU BACKDROP */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* SLIDING SIDE MENU */}
      <div
        className={`
          fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 
          transform transition-transform duration-300 
          ${menuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-6 mt-12">
          <h2 className="text-2xl font-bold text-red-600 mb-6">
            Menu
          </h2>

          <ul className="space-y-4 text-lg font-medium">
            <li onClick={() => { onNavigate("home"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">Home</li>
            <li onClick={() => { onNavigate("community"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">Community</li>
            <li onClick={() => { onNavigate("vaultpasscode"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">Vault</li>
            <li onClick={() => { onNavigate("report"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">Report Abuse</li>
            <li onClick={() => { onNavigate("recorder"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">Recorder</li>
            <li onClick={() => { onNavigate("myreports"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">My Reports</li>
            <li onClick={() => { onNavigate("analyser"); setMenuOpen(false); }} className="cursor-pointer hover:text-red-500">False Accusation Analyzer</li>
          </ul>

          <button
            onClick={handleLogout}
            className="mt-10 w-full py-3 bg-red-500 text-white rounded-xl shadow-md text-lg"
          >
            Logout
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
