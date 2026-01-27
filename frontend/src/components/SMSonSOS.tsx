import { useEffect, useState } from "react";
import { startHeadlessRecording } from "../utils/headlessRecorder";
import { getCachedLocation } from "../utils/locationCache";
import { apiFetch } from "../utils/api";

type Contact = {
  name: string;
  phone: string;
};

const SMSonSOS = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    // 🛸 Pre-fetch contacts from DB
    apiFetch("/api/auth/contacts")
      .then(res => res.json())
      .then(data => {
        if (data.contacts) {
          setContacts(data.contacts);
        }
      })
      .catch(() => {
        // Fallback or silent fail
        console.error("Failed to pre-fetch contacts for SMS");
      });
  }, []);

  useEffect(() => {
    const onSOSConfirmed = () => {
      console.warn("🚨 SOS CONFIRMED — FAST SMS MODE");

      startHeadlessRecording();

      if (!contacts.length) {
        console.warn("⚠️ No emergency contacts found to alert.");
        return;
      }

      const userName =
        localStorage.getItem("userName") || "A SafeZone User";

      const cached = getCachedLocation();

      const locationText = cached
        ? `https://www.google.com/maps?q=${cached.lat},${cached.lng}`
        : "Location updating…";

      const time = new Date().toLocaleString();

      const message = `
🚨 EMERGENCY ALERT – SafeZone 🚨

⚠️ ${userName} may be in danger.

📍 Location:
${locationText}

🕒 Time: ${time}

Please contact immediately or reach local emergency services.
      `.trim();

      // 🚀 INSTANT dispatch
      contacts.forEach((c) => {
        console.log("📨 SOS SMS");
        console.log("To:", c.name, c.phone);
        console.log(message);
        console.log("————————————");
      });
    };

    window.addEventListener("sos-confirmed", onSOSConfirmed);
    return () =>
      window.removeEventListener("sos-confirmed", onSOSConfirmed);
  }, [contacts]);

  return null;
};

export default SMSonSOS;
