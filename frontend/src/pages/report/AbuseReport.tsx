import React, { useState } from "react";
import Header from "../../components/Header";
import NavBar from "../../components/NavBar";
import { toast } from "react-toastify";

type Props = { setPage?: (p: string) => void };

const AbuseReport: React.FC<Props> = ({ setPage }) => {
  const [fullName, setFullName] = useState(""); // visible to admin only
  const [category, setCategory] = useState("Bullying");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [anonymous, setAnonymous] = useState(true);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFiles(Array.from(e.target.files).slice(0, 5));
  };

  const removeFile = (i: number) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  const isFormValid =
  description.trim().length > 0 &&
  date.trim().length > 0 &&
  time.trim().length > 0 &&
  location.trim().length > 0;


const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // 🔴 VALIDATION
  if (!description.trim()) {
    toast.error("Please describe what happened");
    return;
  }

  if (!date) {
    toast.error("Please select the date of incident");
    return;
  }

  if (!time) {
    toast.error("Please select the time of incident");
    return;
  }

  // ✅ FORM DATA
  const formData = new FormData();
  formData.append("fullName", fullName);
  formData.append("category", category);
  formData.append("location", location);
  formData.append("date", date);
  formData.append("time", time);
  formData.append("description", description);
  formData.append("anonymous", String(anonymous));
  files.forEach(f => formData.append("files", f));

  try {
    const res = await fetch("http://localhost:5000/api/reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: formData
    });

    if (!res.ok) {
      toast.error("Failed to submit report");
      return;
    }

    toast.success(
      "Thank you for reporting. Your submission helps make the platform safer."
    );

    // optional: reset form
    setFullName("");
    setLocation("");
    setDate("");
    setTime("");
    setDescription("");
    setFiles([]);
    setAnonymous(true);

    // stay on same page or navigate if you want
    setPage?.("abusereport");

  } catch (err) {
    toast.error("Network error. Please try again.");
  }
};



  return (
    <div className="min-h-screen bg-gray-200 pt-20 pb-32">
      <Header onNavigate={(p) => setPage?.(p)} />
      
      <main className="max-w-md mx-auto px-4">
        {/* top card */}
        <div className="bg-red-200 rounded-md p-4 mb-4 shadow-sm border border-red-200 hover:bg-red-400 hover:shadow-md transition ">
          <h2 className="text-lg sm:text-xl font-semibold text-red-700">Anonymous Abuse Reporting</h2>
          <p className="text-sm text-gray-700 mt-1">🔒 Your identity will remain private.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name (visible only to admin) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name <span className="text-xs text-gray-400">(visible only to admin)</span></label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name (optional)"
              className="w-full bg-white border rounded px-3 py-3 text-sm shadow-sm focus:ring-0 outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border rounded px-3 py-3 text-sm shadow-sm focus:ring-0 outline-none"
            >
              <option>Bullying</option>
              <option>Harassment</option>
              <option>Physical Assault</option>
              <option>Theft</option>
              <option>Stalking</option>
              <option>Other</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Where it happened</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (e.g. college, office, street)"
              className="w-full bg-white border rounded px-3 py-3 text-sm shadow-sm focus:ring-0 outline-none"
            />
          </div>

          {/* Date & Time */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date of Incident</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border rounded px-3 py-2 text-sm shadow-sm focus:ring-0 outline-none"
              />
            </div>

            <div className="w-36">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time of Incident</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-white border rounded px-3 py-2 text-sm shadow-sm focus:ring-0 outline-none"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened..."
              className="w-full bg-white border rounded px-3 py-3 text-sm h-36 shadow-sm focus:ring-0 outline-none resize-none"
            />
          </div>

          {/* Attach Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Upload Evidence (optional)</label>

            <label className="inline-block w-full">
              <div className="w-full bg-pink-100 hover:bg-pink-200 text-pink-800 px-4 py-3 rounded-lg text-center cursor-pointer select-none shadow-sm">
                📷 🎙 📎 Attach Evidence
              </div>
              <input
                type="file"
                accept="image/*,video/*,audio/*,application/pdf"
                multiple
                onChange={handleFiles}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <div className="mt-2 bg-white border rounded p-2 text-sm space-y-1">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="truncate max-w-xs">{f.name}</span>
                    <button type="button" onClick={() => removeFile(i)} className="text-red-600 text-xs px-2">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Anonymous checkbox */}
          <div className="bg-white border rounded px-3 py-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={anonymous}
                onChange={() => setAnonymous(prev => !prev)}
                className="w-4 h-4"
              />
              <span className="text-sm">Submit anonymously</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your identity will not be shown publicly.  
            Administrators may access details only for verification purposes.
          </p>


          {/* Submit */}
          <div>
            <button
  type="submit"
  disabled={!isFormValid}
  className={`
    w-full 
    py-3 
    rounded-full 
    text-lg 
    font-medium 
    shadow
    transition
    ${
      isFormValid
        ? "bg-red-500 hover:bg-red-600 text-white"
        : "bg-red-400 text-white cursor-not-allowed"
    }
  `}
>
  Submit Report
</button>

          </div>
        </form>
      </main>
      
      <NavBar onNavigate={(p) => setPage?.(p)} />
    </div>
  );
};

export default AbuseReport;
