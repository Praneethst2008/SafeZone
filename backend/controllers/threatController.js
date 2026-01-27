import axios from "axios";
import FormData from "form-data";

export const classifyThreat = async (req, res) => {
  try {
    const audio = req.file;

    const form = new FormData();
    form.append("file", audio.buffer, {
      filename: "audio.webm",
      contentType: "audio/webm"
    });

    const response = await axios.post(
      "http://127.0.0.1:8000/classify",
      form,
      { headers: form.getHeaders() }
    );

    res.json(response.data);
  } catch (err) {
    console.error("Threat classify failed:", err.message);
    res.status(500).json({ error: "Threat detection failed" });
  }
};
