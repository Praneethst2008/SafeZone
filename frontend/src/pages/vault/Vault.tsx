import React, { useEffect, useMemo, useRef, useState } from "react";
import Header from "../../components/Header";
import NavBar from "../../components/NavBar";
import { apiFetch } from "../../utils/api";

type StoredFile = {
  _id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

const TYPE_TABS = ["All", "image", "videos", "audio", "docs"];

const humanDate = (iso: string) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString() +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
};

const Vault: React.FC<{ setPage: (p: string) => void }> = ({ setPage }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [activeTab, setActiveTab] = useState("All");
  const fileRef = useRef<HTMLInputElement | null>(null);


  const [showUpdate, setShowUpdate] = useState(false);

  const [oldPass, setOldPass] = useState<string[]>([]);
  const [newPass, setNewPass] = useState<string[]>([]);
  const [confirmPass, setConfirmPass] = useState<string[]>([]);

  const [step, setStep] = useState<"old" | "new" | "confirm">("old");


  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000";

  /* ---------------- LOAD FILES ---------------- */
  const loadFiles = async () => {
    try {
      const res = await apiFetch("/api/vault/files");
      const data = await res.json();
      setFiles(data);
    } catch {
      console.error("Failed to load vault files");
    }
  };

  useEffect(() => {
    loadFiles();
  }, []);

  /* ---------------- FILE TYPE ---------------- */
  const getTypeLabel = (mime: string) => {
    if (mime.startsWith("image/")) return "image";
    if (mime.startsWith("video/")) return "videos";
    if (mime.startsWith("audio/")) return "audio";
    return "docs";
  };

  /* ---------------- UPLOAD ---------------- */
  const handleAddFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const fd = new FormData();
    Array.from(e.target.files).forEach(f => fd.append("files", f));

    await fetch(`${API_BASE}/api/vault/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: fd
    });

    if (fileRef.current) fileRef.current.value = "";
    loadFiles();
  };

  const openEncryptedFile = async (fileId: string, mimeType: string) => {
    try {
      const res = await fetch(
        `${API_BASE}/api/vault/open/${fileId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
        }
      );

      if (!res.ok) {
        throw new Error("Unauthorized");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: mimeType })
      );

      window.open(url, "_blank");

      // cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 5000);
    } catch (err) {
      alert("Failed to open file. Please unlock vault again.");
    }
  };

  const addDigit = (d: string) => {
    if (step === "old" && oldPass.length < 4)
      setOldPass(p => [...p, d]);

    if (step === "new" && newPass.length < 4)
      setNewPass(p => [...p, d]);

    if (step === "confirm" && confirmPass.length < 4)
      setConfirmPass(p => [...p, d]);
  };

  const delDigit = () => {
    if (step === "confirm")
      setConfirmPass(p => p.slice(0, -1));
    else if (step === "new")
      setNewPass(p => p.slice(0, -1));
    else
      setOldPass(p => p.slice(0, -1));
  };


  const updatePasscode = async () => {
    if (oldPass.length < 4 || newPass.length < 4 || confirmPass.length < 4) {
      alert("Enter all passcodes");
      return;
    }

    if (newPass.join("") !== confirmPass.join("")) {
      alert("New passcodes do not match");
      setNewPass([]);
      setConfirmPass([]);
      setStep("new");
      return;
    }

    const res = await apiFetch("/api/vault/change-passcode", {
      method: "POST",
      body: JSON.stringify({
        oldPasscode: oldPass.join(""),
        newPasscode: newPass.join("")
      })
    });

    if (!res.ok) {
      alert("Old passcode incorrect");
      setOldPass([]);
      setStep("old");
      return;
    }

    alert("Vault passcode updated successfully");
    setShowUpdate(false);
    setOldPass([]);
    setNewPass([]);
    setConfirmPass([]);
    setStep("old");
  };

  
  /* ---------------- FILTER ---------------- */
  const filtered = useMemo(() => {
    if (activeTab === "All") return files;
    return files.filter(f => getTypeLabel(f.mimeType) === activeTab);
  }, [files, activeTab]);

  return (
    <div className="min-h-screen bg-gray-200 pt-20 pb-40">
      <Header onNavigate={setPage} />

      <main className="max-w-md mx-auto px-4">
        {/* TABS */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {TYPE_TABS.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${activeTab === t
                ? "bg-red-500 text-white"
                : "bg-white border border-red-200 text-red-600"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* FILE LIST */}
        <div className="mt-4 space-y-4">
          {filtered.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center text-gray-500 shadow">
              No files in vault
            </div>
          ) : (
            filtered.map(f => {
              const isImage = f.mimeType.startsWith("image/");
              const fileUrl = `${API_BASE}/uploads/vault/${f.storedName}`;

              return (
                <div key={f._id} className="bg-white rounded-lg shadow p-3">
                  <div className="h-40 bg-gray-50 rounded-md flex items-center justify-center mb-3 overflow-hidden">
                    {isImage ? (
                      <img
                        src={fileUrl}
                        alt={f.originalName}
                        className="object-contain h-full w-full"
                      />
                    ) : (
                      <div className="text-gray-500 text-sm text-center px-2">
                        {f.originalName}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-sm text-gray-600">
                    <div className="truncate max-w-xs">
                      {f.originalName}
                    </div>
                    <div className="text-xs text-gray-400">
                      {humanDate(f.createdAt)}
                    </div>
                  </div>

                  <div className="mt-3">
                    <button
                      onClick={() => openEncryptedFile(f._id, f.mimeType)}
                      className="inline-block px-3 py-1 text-sm rounded bg-green-100 text-green-600"
                    >
                      Open
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* UPLOAD BUTTON */}
        <div className="mt-6 mb-20">
          <label className="block w-full">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,audio/*,application/pdf,text/*,application/*"
              onChange={handleAddFiles}
              className="hidden"
            />
            <div className="w-full bg-red-500 text-white py-3 rounded text-center font-medium cursor-pointer shadow">
              + Files
            </div>
          </label>
        </div>

        <div className="mt-6">
          <button
            onClick={() => setShowUpdate(true)}
            className="w-full bg-gray-800 text-white py-2 rounded shadow"
          >
            Update Passcode
          </button>
        </div>

        {showUpdate && (
          <div className="mt-4 bg-white rounded-lg p-4 shadow">
            <h3 className="text-center font-medium mb-2">
              {step === "old"
                ? "Enter Old Passcode"
                : step === "new"
                  ? "Enter New Passcode"
                  : "Confirm New Passcode"}
            </h3>

            {/* DOTS */}
            <div className="flex justify-center gap-4 mb-4">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${(step === "old" && i < oldPass.length) ||
                      (step === "new" && i < newPass.length) ||
                      (step === "confirm" && i < confirmPass.length)
                      ? "bg-black"
                      : "bg-gray-300"
                    }`}
                />
              ))}
            </div>

            {/* KEYPAD */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => (
                <button
                  key={n}
                  onClick={() => addDigit(String(n))}
                  className="h-14 rounded bg-gray-100"
                >
                  {n}
                </button>
              ))}

              <button onClick={delDigit} className="h-14 bg-red-100 rounded">
                Del
              </button>

              <button
                onClick={() => {
                  if (step === "old") setStep("new");
                  else if (step === "new") setStep("confirm");
                  else updatePasscode();
                }}
                className="h-14 bg-green-500 text-white rounded"
              >
                {step === "confirm" ? "Update" : "Next"}
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ENCRYPTED NOTICE */}
      <div className="fixed left-0 right-0 bottom-32 flex justify-center z-40">
        <div className="w-[90%] bg-red-100 border border-red-200 rounded-full px-4 py-2 text-center text-sm shadow">
          <span className="font-medium text-red-600">
            All files are encrypted securely 🔒
          </span>
        </div>
      </div>

      <NavBar onNavigate={setPage} />
    </div>
  );
};

export default Vault;
