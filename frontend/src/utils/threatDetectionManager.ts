/* =========================================================
   GLOBAL THREAT SESSION GUARD
   ========================================================= */
export let threatSessionActive = false;
export let isManualSOS = false;

export const setThreatSessionActive = (value: boolean) => {
  threatSessionActive = value;
};

export const setIsManualSOS = (value: boolean) => {
  isManualSOS = value;
};

let audioContext: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let micStream: MediaStream | null = null;

let monitoring = false;
let triggered = false;
let cooldown = false;

/* ================= YAMNet CLASSIFICATION ================= */
const classifyWithYAMNet = async (stream: MediaStream) => {
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  recorder.start();
  await new Promise((r) => setTimeout(r, 5000));
  recorder.stop();
  await new Promise((r) => (recorder.onstop = r));

  const blob = new Blob(chunks, { type: "audio/webm" });
  const form = new FormData();
  form.append("audio", blob);

  const res = await fetch(
    `${import.meta.env.VITE_API_BASE}/api/threat/classify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: form,
    }
  );

  if (!res.ok) throw new Error("YAMNet failed");
  return res.json(); // { label, confidence }
};

/* ================= ASYNC ML VERIFICATION ================= */
const verifyWithMLAsync = async (stream: MediaStream) => {
  try {
    const start = performance.now();

    const cloned = stream.clone();
    const result = await classifyWithYAMNet(cloned);
    cloned.getTracks().forEach((t) => t.stop());

    const duration = (performance.now() - start).toFixed(0);

    const dangerLabels = [
      "Screaming",
      "Shout",
      "Yelling",
      "Speech, excited",
      "Glass breaking",
      "Explosion",
      "Alarm",
    ];

    console.group("🧠 YAMNet THREAT ANALYSIS");
    console.log("🏷️ Label:", result.label);
    console.log("📊 Confidence:", result.confidence.toFixed(3));
    console.log("⏱️ ML Latency:", `${duration} ms`);

    if (
      dangerLabels.includes(result.label) &&
      result.confidence > 0.12
    ) {
      console.warn("🚨 Decision: CONFIRMED THREAT");
      console.groupEnd();

      window.dispatchEvent(new Event("ml-threat-confirmed"));
    } else {
      console.log("🟢 Decision: SAFE SOUND");
      console.groupEnd();

      threatSessionActive = false;
      window.dispatchEvent(new Event("ml-threat-safe"));
    }
  } catch (err) {
    console.error("⚠️ ML VERIFICATION FAILED", err);
  }
};

/* ================= START DETECTION ================= */
export const startThreatDetection = async () => {
  if (monitoring || cooldown) return;

  if (localStorage.getItem("threatDetectionEnabled") !== "true") return;

  monitoring = true;
  triggered = false;

  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch {
    monitoring = false;
    return;
  }

  audioContext = new AudioContext();

  if (audioContext.state === "suspended") {
    console.warn("🎧 AudioContext is suspended. Waiting for user interaction...");
    await audioContext.resume().catch(err => console.error("🔇 Resume failed:", err));
  }

  console.log("🎤 AudioContext state:", audioContext.state);

  const source = audioContext.createMediaStreamSource(micStream);
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 1024;
  source.connect(analyser);

  const buffer = new Uint8Array(analyser.fftSize);
  let loudFrames = 0;

  const detect = () => {
    if (!monitoring || !analyser || triggered) return;

    analyser.getByteTimeDomainData(buffer);

    let rms = 0;
    let peak = 0;

    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128;
      rms += v * v;
      peak = Math.max(peak, Math.abs(v));
    }

    rms = Math.sqrt(rms / buffer.length);

    if (rms > 0.4 && peak > 0.12) loudFrames++;
    else loudFrames = 0;

    if (loudFrames > 10) {
      triggered = true;

      // 🚨 START THREAT SESSION
      threatSessionActive = true;
      window.dispatchEvent(new Event("threat-detected"));

      // 🧠 ML verification in background
      if (micStream) verifyWithMLAsync(micStream);

      stopThreatDetection();

      cooldown = true;
      setTimeout(() => (cooldown = false), 5000);
      return;
    }

    requestAnimationFrame(detect);
  };

  detect();
};

/* ================= RESET MANUAL SOS FLAG ================= */
export const resetManualSOS = () => {
  isManualSOS = false;
};

/* ================= STOP DETECTION ================= */
export const stopThreatDetection = () => {
  monitoring = false;
  micStream?.getTracks().forEach((t) => t.stop());
  micStream = null;
  audioContext?.close();
  audioContext = null;
  analyser = null;
};

