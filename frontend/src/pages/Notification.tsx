import { useEffect, useState } from "react";
import { apiFetch } from "../utils/api";

const Notifications = ({ setPage }: { setPage: (p: string) => void }) => {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    apiFetch("/api/notifications")
      .then(res => res.json())
      .then(async (data) => {
        setNotifications(data || []);

        // 🗑️ Auto-delete after viewing
        if (data && data.length > 0) {
          await apiFetch("/api/notifications", {
            method: "DELETE"
          });
        }
      });
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-4 pb-20">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setPage("home")}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold">Notifications</h2>
        </div>

        {notifications.length === 0 ? (
          <div className="bg-white p-6 rounded-xl shadow-sm text-center text-gray-500">
            No notifications
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n._id}
              className="p-4 mb-3 rounded-xl shadow-sm bg-white border-l-4 border-red-500 transition-transform active:scale-[0.98]"
            >
              <p className="text-sm text-gray-800 font-medium">{n.message}</p>
              <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wider">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
