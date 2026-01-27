import { useEffect, useRef, useState } from "react";
import Header from "../../components/Header";
import NavBar from "../../components/NavBar";
import { startHeadlessRecording } from "../../utils/headlessRecorder";
import { startThreatDetection, stopThreatDetection, setThreatSessionActive, setIsManualSOS, resetManualSOS } from "../../utils/threatDetectionManager";
import SafePlacesMap from "../../components/SafePlacesMap";
import { Edit2, Trash2 } from "lucide-react";
import { apiFetch } from "../../utils/api";
import { toast } from "react-toastify";

type Contact = {
  name: string;
  phone: string;
};

const safetyQuotes = [
  "Your safety matters more than anything.",
  "Help is just one tap away.",
  "You are never alone — SafeZone is with you.",
  "Stay alert. Stay safe.",
  "Courage is asking for help when you need it.",
];

const HomePage = ({ setPage }: { setPage: (p: string) => void }) => {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [quoteIndex, setQuoteIndex] = useState(0);

  const [isSOSActive, setIsSOSActive] = useState(false);
  const [isSOSLoading, setIsSOSLoading] = useState(false);
  const [activationMessage, setActivationMessage] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const autoTimerRef = useRef<number | null>(null);

  /* ================= ROTATING QUOTES ================= */
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % safetyQuotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  /* ================= LOAD CONTACTS ================= */
  useEffect(() => {
    apiFetch("/api/auth/contacts")
      .then(res => res.json())
      .then(data => {
        if (data.contacts) {
          setContacts(data.contacts);
        }
      })
      .catch(() => toast.error("Failed to load contacts"));
  }, []);

  /* ================= LIVE LOCATION ================= */
  useEffect(() => {
    if (!navigator.geolocation) return;

    const success = (pos: GeolocationPosition) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    };

    const error = () => { };

    navigator.geolocation.getCurrentPosition(success, error, {
      enableHighAccuracy: false,
      maximumAge: 60000
    });

    const watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    const onSOSConfirmed = () => {
      if (isSOSActive) return;

      console.warn("🚨 SOS CONFIRMED (Manual or Auto)");

      setIsSOSActive(true);
      setIsSOSLoading(false);
      setActivationMessage("SOS Activated");

      startHeadlessRecording();

      // ⏱ AUTO RESET AFTER 3.01 MINUTES
      setTimeout(() => {
        resetSOSSystem();
      }, 180100);
    };

    window.addEventListener("sos-confirmed", onSOSConfirmed);
    return () =>
      window.removeEventListener("sos-confirmed", onSOSConfirmed);
  }, [isSOSActive]);



  /* ================= RESET SOS ================= */
  const resetSOSSystem = () => {
    console.warn("🔄 Resetting SOS & Threat Detection");

    setIsSOSActive(false);
    setIsSOSLoading(false);
    setActivationMessage("");

    // Restart threat detection
    stopThreatDetection();
    resetManualSOS();
    setTimeout(() => {
      startThreatDetection();
      console.warn("🎧 Threat detection restarted");
    }, 1000);
  };

  /* ================= ACTIVATE SOS ================= */
  const activateSOS = () => {
    console.warn("🆘 Manual SOS triggered");

    // 🛑 Stop ML detection so it doesn't interfere
    stopThreatDetection();

    // 🚨 Ensure the session is marked active so the popup can confirm it
    setThreatSessionActive(true);
    setIsManualSOS(true);

    // SAME FLOW AS THREAT DETECTION
    window.dispatchEvent(new Event("threat-detected"));
  };



  /* ================= MANUAL SOS CLICK ================= */
  const triggerSOS = () => {
    if (isSOSLoading) {
      clearTimeout(autoTimerRef.current!);
      setIsSOSLoading(false);
      setActivationMessage("");
      return;
    }

    if (isSOSActive) return;

    setIsSOSLoading(true);
    setActivationMessage("");

    autoTimerRef.current = window.setTimeout(() => {
      setActivationMessage("Checking safety…");
      activateSOS();
    }, 1000); // 🚀 Reduced delay for faster SOS
  };



  /* ================= CONTACT CRUD ================= */
  const saveContact = async () => {
    if (!name || !phone) return;

    let updated = [...contacts];

    if (editIndex !== null) {
      updated[editIndex] = { name, phone };
    } else {
      updated.push({ name, phone });
    }

    try {
      const res = await apiFetch("/api/auth/contacts", {
        method: "PUT",
        body: JSON.stringify({ contacts: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
        toast.success(editIndex !== null ? "Contact updated" : "Contact added");
      } else {
        toast.error(data.message || "Failed to save contact");
      }
    } catch (err) {
      toast.error("Network error");
    }

    closeModal();
  };

  const editContact = (index: number) => {
    setEditIndex(index);
    setName(contacts[index].name);
    setPhone(contacts[index].phone);
    setShowModal(true);
  };

  const deleteContact = async (index: number) => {
    const updated = contacts.filter((_, i) => i !== index);

    try {
      const res = await apiFetch("/api/auth/contacts", {
        method: "PUT",
        body: JSON.stringify({ contacts: updated })
      });
      const data = await res.json();
      if (res.ok) {
        setContacts(data.contacts);
        toast.success("Contact deleted");
      } else {
        toast.error(data.message || "Failed to delete contact");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setName("");
    setPhone("");
    setEditIndex(null);
  };

  /* ================= UI ================= */
  return (
    <div className="min-h-screen bg-gray-200 pt-20 pb-36">
      <Header onNavigate={(p) => setPage(p)} />

      {/* SOS BUTTON */}
      <div className="flex flex-col items-center mt-12">
        <button
          onClick={triggerSOS}
          className="relative w-56 h-56 rounded-full flex items-center justify-center"
        >
          {isSOSLoading && (
            <span className="absolute inset-0 rounded-full border-4 border-red-500 animate-spin" />
          )}

          {!isSOSActive && !isSOSLoading && (
            <>
              <span className="absolute inset-9 rounded-full bg-red-200 animate-ping opacity-60" />
              <span className="absolute w-44 h-44 rounded-full bg-red-300 opacity-50" />
            </>
          )}

          <span
            className={`relative z-10 w-36 h-36 rounded-full flex items-center justify-center
              text-white text-4xl font-bold
              ${isSOSActive ? "bg-gray-500" : "bg-red-500"}`}
          >
            SOS
          </span>
        </button>

        {activationMessage && (
          <p className="mt-3 text-sm text-red-600">
            {activationMessage}
          </p>
        )}
        <br />
        <button
          onClick={() => setShowModal(true)}
          className="mt-6 px-6 py-2 bg-red-500 text-white rounded-full shadow"
        >
          + Add Contacts
        </button>
      </div>

      {/* QUOTES */}
      <div className="mt-10 text-center text-gray-700">
        “{safetyQuotes[quoteIndex]}”
      </div>
      {/* SAFE PLACES MAP */}
      <div className="px-4 mt-10">
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {lat !== null && lng !== null ? (
            <SafePlacesMap lat={lat} lng={lng} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Fetching your live location…
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-2 text-center">
          Showing nearby police stations, hospitals, and fire stations
        </p>
      </div>

      {/* CONTACT LIST */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-bold text-red-600 mb-2">
            Emergency Contacts
          </h3>
          {contacts.length === 0 ? (
            <p className="text-gray-500 text-sm">No contacts added</p>
          ) : (
            <ul className="space-y-2">
              {contacts.map((c, i) => (
                <li
                  key={i}
                  className="flex justify-between bg-gray-100 px-3 py-2 rounded"
                >
                  <span>{c.name}</span>
                  <span>{c.phone}</span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => editContact(i)}
                      className="text-blue-600 text-sm"
                    >
                      <Edit2 />
                    </button>
                    <button
                      onClick={() => deleteContact(i)}
                      className="text-red-600 text-sm"
                    >
                      <Trash2 />
                    </button>
                  </div>

                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ADD CONTACT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl w-[90%] max-w-sm p-6 shadow-lg">
            <h2 className="text-xl font-bold text-red-600 mb-4">
              {editIndex !== null
                ? "Edit Emergency Contact"
                : "Add Emergency Contact"}
            </h2>

            <input
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full mb-3 px-4 py-2 border rounded"
            />

            <input
              placeholder="Phone Number"
              maxLength={10}
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value.replace(/\D/g, ""))
              }
              className="w-full mb-4 px-4 py-2 border rounded"
            />

            <div className="flex justify-end gap-3">
              <button onClick={closeModal}>Cancel</button>
              <button
                onClick={saveContact}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                {editIndex !== null ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NavBar onNavigate={(p) => setPage(p)} />
    </div>
  );
};

export default HomePage;
