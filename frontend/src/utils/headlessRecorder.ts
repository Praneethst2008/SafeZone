const API_BASE =
  import.meta.env.VITE_API_BASE || "http://localhost:5000";

let isRecording = false;

export const startHeadlessRecording = async () => {
  if (isRecording) return;
  isRecording = true;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm"
    });

    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.start();
    console.warn("🎥 Emergency recording started");

    // ⏱ Stop after 3 minutes
    setTimeout(() => {
      recorder.stop();
      stream.getTracks().forEach(t => t.stop());
    }, 180000);

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: "video/webm" });

      const file = new File(
        [blob],
        `sos-${Date.now()}.webm`,
        { type: "video/webm" }
      );

      const formData = new FormData();
      formData.append("files", file); // MUST be "files"

      await fetch(`${API_BASE}/api/vault/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: formData
      });

      console.warn("🔒 Emergency recording saved to vault");
      isRecording = false;
    };
  } catch (err) {
    console.error("Recording failed:", err);
    isRecording = false;
  }
};
