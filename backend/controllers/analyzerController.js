import AnalyzerCase from "../models/AnalyzerCase.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";

/*
  Helper: Convert image file to Base64
*/
const encodeImage = (filePath) => {
    const bitmap = fs.readFileSync(filePath);
    return Buffer.from(bitmap).toString('base64');
};

/*
  Helper to call Groq API (Text + Vision Support)
  Attempting currently available vision strategy
*/
const analyzeWithGroqVision = async (textContext, files) => {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured on the server.");
    }

    // 1. Prepare Content Array (Text + Images)
    const content = [
        {
            type: "text",
            text: textContext
        }
    ];

    // 2. Add Images (if any)
    const MAX_IMAGES = 3;
    files.slice(0, MAX_IMAGES).forEach(file => {
        if (file.mimetype.startsWith('image/')) {
            const base64Image = encodeImage(file.path);
            content.push({
                type: "image_url",
                image_url: {
                    url: `data:${file.mimetype};base64,${base64Image}`
                }
            });
        }
    });

    // 3. System Prompt (Updated with Legal Context)
    const systemPrompt = `You are an AI False Accusation Analyzer with Vision capabilities (if available).
  Your goal is to analyze the provided case description AND any attached evidence images for consistency, logical gaps, and truthfulness.
  
  GUIDELINES:
  1. Compare the visual evidence (images) with the textual claims. Do they match? (e.g. if text says "night", is the photo dark?)
  2. Be ETHICAL, NEUTRAL, and OBJECTIVE.
  3. Do NOT determine guilt or innocence.
  4. Focus on 'consistency', 'detail specificity', 'timestamp verification' (if visible), and 'visual anomalies'.
  5. **LEGAL CONTEXT (INDIA):** Based on the facts, identify potential legal sections under **Bharatiya Nyaya Sanhita (BNS)** (or IPC if applicable). Mention relevant sections (e.g., "Potential Section: BNS Sec 318 (Cheating)"). THIS IS FOR INFORMATION ONLY, NOT LEGAL ADVICE.
  
  OUTPUT FORMAT (Strict JSON):
  {
    "verdict": "consistent" | "minor_anomalies" | "major_anomalies" | "insufficient_data",
    "confidence": "High" | "Medium" | "Low",
    "observations": ["observation 1", "observation 2"],
    "flaggedSections": [{"quote": "...", "issue": "..."}],
    "legalContext": "Brief mention of relevant Indian Law sections (BNS/IPC).",
    "fullAnalysis": "Brief summary comparing text claims with visual evidence."
  }`;

    // 4. API Call
    // Forced to use text-only model as vision are unstable/decommissioned on this tier.
    // We keep the structure ready for when vision is back.
    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile", // Using reliable text model
            messages: [
                { role: "system", content: systemPrompt + " (Note: Vision analysis is technically disabled. Focus on Text & Indian Legal Context.)" },
                {
                    role: "user",
                    content: `[System Note: Images uploaded but processed as metadata only.]\n\n${textContext}`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
            max_tokens: 1024
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API Error: ${errorText}`);
    }

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const jsonString = rawContent.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(jsonString);
};

/*
  Helper: Text-Only Fallback
  Uses llama-3.3-70b-versatile
*/
const analyzeWithGroqTextOnly = async (textContext) => {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured.");

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                {
                    role: "system",
                    content: `You are an AI False Accusation Analyzer. Analyze the case text for consistency.
          
          GUIDELINES:
          1. **LEGAL CONTEXT (INDIA):** Based on the facts, identify potential legal sections under **Bharatiya Nyaya Sanhita (BNS)** (or IPC if applicable). Mention relevant sections (e.g., "Potential Section: BNS Sec 318 (Cheating)"). THIS IS FOR INFORMATION ONLY, NOT LEGAL ADVICE.
          
          CRITICAL INSTRUCTION: Return strictly valid JSON.
          "flaggedSections" MUST be an array of objects with "quote" and "issue" keys.
          Do NOT return strings inside flaggedSections.
          
          OUTPUT FORMAT (Strict JSON):
          {
            "verdict": "consistent" | "minor_anomalies" | "major_anomalies" | "insufficient_data",
            "confidence": "High" | "Medium" | "Low",
            "observations": ["obs1", "obs2"],
            "flaggedSections": [
               { "quote": "User claimed X", "issue": "Contradicts Y" } 
            ],
            "legalContext": "Brief mention of relevant Indian Law sections (BNS/IPC).",
            "fullAnalysis": "Analysis summary."
          }`
                },
                { role: "user", content: textContext }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3,
        })
    });

    if (!response.ok) {
        throw new Error(`Groq Text API Error: ${await response.text()}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    // Clean and Parse JSON
    try {
        const jsonString = content.replace(/```json/g, "").replace(/```/g, "").trim();
        const result = JSON.parse(jsonString);

        // SANITIZATION
        if (result.flaggedSections && Array.isArray(result.flaggedSections)) {
            result.flaggedSections = result.flaggedSections.map(item => {
                if (typeof item === 'string') {
                    return { quote: item, issue: "Flagged by AI" };
                }
                return item;
            });
        } else {
            result.flaggedSections = [];
        }

        return result;

    } catch (e) {
        console.error("JSON Parse Error in Text Fallback:", e, content);
        throw new Error("AI returned invalid JSON format.");
    }
}

/*
  POST /api/analyzer
  Submit case & Run Analysis
*/
export const submitCase = async (req, res) => {
    try {
        const { description, date, context, notes } = req.body;
        const files = req.files || [];

        if (!description) {
            return res.status(400).json({ message: "Description is required." });
        }

        // 1. Build Text Context
        let promptText = `Case Description:\n"${description}"\n\n`;
        if (date) promptText += `Date of Incident: ${date}\n`;
        if (context) promptText += `Context: ${context}\n`;
        if (notes) promptText += `Additional Notes: ${notes}\n`;
        promptText += `\nAnalyze the consistency of this text with the provided images (if any).`;

        // 2. Call AI with Vision (or Text Fallback)
        let analysisResult;
        try {
            // Try Vision First
            analysisResult = await analyzeWithGroqVision(promptText, files);
        } catch (error) {
            console.warn("Vision Analysis Failed (trying text-only fallback):", error.message);

            try {
                // Fallback to text-only model
                analysisResult = await analyzeWithGroqTextOnly(promptText);
            } catch (textError) {
                console.error("Text Analysis also failed:", textError);
                return res.status(503).json({ message: "AI Analysis service unavailable." });
            }
        }

        // 3. Save to DB
        // legalContext is now part of the schema, so we don't need to append it.
        const newCase = new AnalyzerCase({
            userId: req.user.id,
            description,
            additionalDetails: { date, context, notes },
            evidence: files.map(f => ({
                filename: f.filename,
                path: f.path,
                mimetype: f.mimetype,
                originalName: f.originalname,
            })),
            analysis: analysisResult
        });

        await newCase.save();
        res.status(201).json(newCase);

    } catch (error) {
        console.error(error);
        if (error.name === 'ValidationError') {
            return res.status(422).json({ message: "AI output format error. Please try again with more details." });
        }
        res.status(500).json({ message: "Server Error" });
    }
};

/*
  GET /api/analyzer
  Get history for user
*/
export const getHistory = async (req, res) => {
    try {
        const cases = await AnalyzerCase.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(cases);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

/*
  GET /api/analyzer/:id
  Get single report
*/
export const getReport = async (req, res) => {
    try {
        const caseData = await AnalyzerCase.findOne({ _id: req.params.id, userId: req.user.id });
        if (!caseData) return res.status(404).json({ message: "Case not found" });
        res.json(caseData);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

/*
  POST /api/analyzer/:id/chat
*/
export const chatWithAnalyzer = async (req, res) => {
    try {
        const { message } = req.body;
        const caseData = await AnalyzerCase.findOne({ _id: req.params.id, userId: req.user.id });

        if (!caseData) return res.status(404).json({ message: "Case not found" });

        if (!GROQ_API_KEY) {
            return res.status(500).json({ message: "AI Service unspecified" });
        }

        const systemPrompt = `You are a helpful assistant explaining a False Accusation Analysis Report to a user.
    
    CONTEXT:
    Case Description: "${caseData.description}"
    AI Verdict: ${caseData.analysis.verdict}
    AI Observations: ${JSON.stringify(caseData.analysis.observations)}
    AI Legal Context (India): ${caseData.analysis.legalContext || "N/A"}
    
    RULES:
    1. Only explain the analysis.
    2. Do NOT give legal advice as a lawyer. State clearly this is for information.
    3. Be empathetic but neutral.
    4. Refer to Indian Laws (BNS/IPC) if mentioned in the context.
    5. If asked "What should I do?", suggest consulting a certified legal professional in India.
    6. Keep answers short and clear.
    `;

        const response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message }
                ],
                temperature: 0.5,
            })
        });

        const data = await response.json();
        const reply = data.choices[0].message.content;

        res.json({ reply });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

/*
  DELETE /api/analyzer/:id
  Delete a case
*/
export const deleteCase = async (req, res) => {
    try {
        const caseData = await AnalyzerCase.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
        if (!caseData) return res.status(404).json({ message: "Case not found" });
        res.json({ message: "Case deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};
