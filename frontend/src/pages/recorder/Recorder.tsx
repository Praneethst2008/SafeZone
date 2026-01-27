import React, { useEffect, useRef, useState } from "react";
import NavBar from "../../components/NavBar";
import Header from "../../components/Header";
import { Mic, Video, RefreshCcw } from "lucide-react";

interface Props {
  setPage: (page: string) => void;
}

const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5000";

const IncidentRecorder: React.FC<Props> = ({ setPage }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStream = useRef<MediaStream | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [status, setStatus] = useState("Initializing...");
  const [cameraFacing, setCameraFacing] =
    useState<"user" | "environment">("user");

  /* ================= START CAMERA ================= */
  const startStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: true
      });

      mediaStream.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStatus("Camera & Mic Ready");
    } catch (err) {
      console.error(err);
      setStatus("Permission Denied");
    }
  };

  const stopStream = () => {
    mediaStream.current?.getTracks().forEach(t => t.stop());
    mediaStream.current = null;
  };

  /* ================= RECORDING ================= */
  const startRecording = () => {
    if (!mediaStream.current) return;

    recordedChunks.current = [];

    const recorder = new MediaRecorder(mediaStream.current, {
      mimeType: "video/webm"
    });

    recorder.ondataavailable = e => {
      if (e.data.size > 0) recordedChunks.current.push(e.data);
    };

    recorder.onstop = saveToVault;

    recorder.start();
    mediaRecorder.current = recorder;

    setIsRecording(true);
    setStatus("Recording...");
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
    setStatus("Encrypting & Saving...");
  };

  /* ================= SAVE TO VAULT ================= */
  const saveToVault = async () => {
    const blob = new Blob(recordedChunks.current, {
      type: "video/webm"
    });

    const file = new File(
      [blob],
      `incident-${Date.now()}.webm`,
      { type: "video/webm" }
    );

    const formData = new FormData();
    formData.append("files", file); // ✅ MUST be "files"

    try {
      await fetch(`${API_BASE}/api/vault/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      setStatus("Saved securely to Vault 🔒");
    } catch (err) {
      console.error(err);
      setStatus("Vault upload failed");
    }
  };

  /* ================= TOGGLES ================= */
  const toggleMic = () => {
    mediaStream.current?.getAudioTracks().forEach(
      t => (t.enabled = !micEnabled)
    );
    setMicEnabled(p => !p);
  };

  const toggleVideo = () => {
    mediaStream.current?.getVideoTracks().forEach(
      t => (t.enabled = !videoEnabled)
    );
    setVideoEnabled(p => !p);
  };

  const switchCamera = () => {
    stopStream();
    setCameraFacing(p =>
      p === "user" ? "environment" : "user"
    );
  };

  useEffect(() => {
    startStream();
    return () => stopStream();
  }, [cameraFacing]);

  return (
    <div className="min-h-screen bg-gray-200 pt-20 pb-28 flex flex-col items-center">
      <Header onNavigate={setPage} />

      <div className="w-[90%] bg-black rounded-xl overflow-hidden mt-6">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`w-full h-64 ${
            videoEnabled ? "" : "opacity-0"
          }`}
        />
      </div>

      <button
        onClick={isRecording ? stopRecording : startRecording}
        className="mt-6 bg-red-600 text-white px-10 py-3 rounded-xl shadow"
      >
        {isRecording ? "Stop Recording" : "Start Recording"}
      </button>

      <div className="flex gap-10 mt-6">
        <button onClick={toggleMic}>
          <Mic className={micEnabled ? "text-red-600" : "text-gray-400"} />
        </button>

        <button onClick={toggleVideo}>
          <Video className={videoEnabled ? "text-red-600" : "text-gray-400"} />
        </button>

        <button onClick={switchCamera}>
          <RefreshCcw className="text-blue-600" />
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-700">
        Status: <span className="text-red-600">{status}</span>
      </p>

      <NavBar onNavigate={setPage} />
    </div>
  );
};

export default IncidentRecorder;
