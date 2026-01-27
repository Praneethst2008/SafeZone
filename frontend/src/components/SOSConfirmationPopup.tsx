import { useEffect, useRef, useState } from "react";
import {
  threatSessionActive,
  setThreatSessionActive,
  startThreatDetection,
  isManualSOS,
  resetManualSOS,
} from "../utils/threatDetectionManager";

const SOSConfirmationPopup = () => {
  const [visible, setVisible] = useState(false);
  const [count, setCount] = useState(10);
  const timerRef = useRef<number | null>(null);

  /* 🚨 SHOW POPUP */
  useEffect(() => {
    const show = () => {
      setVisible(true);
      setCount(10);
    };
    window.addEventListener("threat-detected", show);
    return () => window.removeEventListener("threat-detected", show);
  }, []);

  /* ⏱ AUTO TIMER */
  useEffect(() => {
    if (!visible) return;

    timerRef.current = window.setInterval(() => {
      setCount((c) => c - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible]);

  /* ⛔ AUTO SOS */
  useEffect(() => {
    if (count <= 0) confirmSOS();
  }, [count]);

  /* 🧠 ML EVENTS */
  useEffect(() => {
    const onSafe = () => {
      if (isManualSOS) {
        console.log("🛡️ ML SAFE IGNORED — MANUAL SOS ACTIVE");
        return;
      }
      cancelSOS();
    };
    const onConfirmed = () => confirmSOS();

    window.addEventListener("ml-threat-safe", onSafe);
    window.addEventListener("ml-threat-confirmed", onConfirmed);

    return () => {
      window.removeEventListener("ml-threat-safe", onSafe);
      window.removeEventListener("ml-threat-confirmed", onConfirmed);
    };
  }, []);

  /* 🚨 CONFIRM SOS */
  const confirmSOS = () => {
    if (!threatSessionActive) {
      console.log("🟢 SOS BLOCKED — ML SAFE");
      cleanup();
      return;
    }

    setThreatSessionActive(false);
    resetManualSOS();
    cleanup();
    window.dispatchEvent(new Event("sos-confirmed"));
  };

  /* 🟢 USER SAFE */
  const cancelSOS = () => {
    setThreatSessionActive(false);
    resetManualSOS();
    cleanup();
    setTimeout(() => startThreatDetection(), 1000);
  };

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center">
      <div className="bg-white p-6 rounded-xl w-[90%] max-w-sm text-center">
        <h2 className="text-lg font-bold text-red-600">Threat Detected</h2>
        <p className="mt-2">Are you safe?</p>
        <p className="text-sm text-gray-500 mt-1">
          Auto SOS in <b>{count}</b>s
        </p>

        <div className="flex gap-4 mt-4">
          <button
            onClick={cancelSOS}
            className="flex-1 bg-gray-200 py-2 rounded"
          >
            I’m Safe
          </button>

          <button
            onClick={confirmSOS}
            className="flex-1 bg-red-500 text-white py-2 rounded"
          >
            I’m in Danger
          </button>
        </div>
      </div>
    </div>
  );
};

export default SOSConfirmationPopup;
