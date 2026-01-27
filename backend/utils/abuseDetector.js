/**
 * Rule-based abusive language detector (India-focused)
 * Supports:
 * - English
 * - Hindi (हिंदी + Hinglish)
 * - Tamil (தமிழ் + Tanglish)
 * - Telugu (తెలుగు + Tenglish)
 * - Malayalam (മലയാളം)
 * - Kannada (ಕನ್ನಡ)
 *
 * Educational / academic safe list
 */

const abusiveWords = [
  /* ---------------- ENGLISH ---------------- */
  "idiot",
  "stupid",
  "dumb",
  "fool",
  "shut up",
  "useless",
  "loser",
  "moron",
  "hate you",

  /* ---------------- HINDI (ROMAN) ---------------- */
  "pagal",
  "bewakoof",
  "gadha",
  "kamina",
  "nalayak",
  "bakwas",
  "ullu",
  "chor",
  "kutte",
  "mental",

  /* ---------------- HINDI (DEVANAGARI) ---------------- */
  "पागल",
  "बेवकूफ",
  "गधा",
  "कमीना",
  "नालायक",
  "बकवास",
  "उल्लू",
  "चोर",

  /* ---------------- TAMIL (ROMAN / TANGLISH) ---------------- */
  "poda",
  "podi",
  "loosu",
  "mental",
  "kiruku",
  "mutta",
  "venna",
  "tharkuri",
  "naaye",
  "arai mental",

  /* ---------------- TAMIL (TAMIL SCRIPT) ---------------- */
  "போடா",
  "போடி",
  "லூசு",
  "மென்டல்",
  "கிருக்கு",
  "முட்டாள்",
  "நாய்",
  "அரை மென்டல்",

  /* ---------------- TELUGU (ROMAN / TENGLISH) ---------------- */
  "pichi",
  "pichodu",
  "bewarse",
  "vedhava",
  "mental ra",
  "dongana",
  "kukka",

  /* ---------------- TELUGU (TELUGU SCRIPT) ---------------- */
  "పిచ్చి",
  "పిచ్చోడు",
  "బేవార్సి",
  "వెధవ",
  "మెంటల్",
  "కుక్క",
  "దొంగ",

  /* ---------------- MALAYALAM (ROMAN) ---------------- */
  "pottan",
  "mandan",
  "naaye",
  "chetta",
  "koppe",

  /* ---------------- MALAYALAM (MALAYALAM SCRIPT) ---------------- */
  "പൊട്ടൻ",
  "മണ്ടൻ",
  "നായ",
  "ചെറ്റ",
  "കോപ്പെ",

  /* ---------------- KANNADA (ROMAN) ---------------- */
  "sule",
  "bolimaga",
  "bevarsi",
  "kirik",
  "naayi",

  /* ---------------- KANNADA (KANNADA SCRIPT) ---------------- */
  "ಸುಲೆ",
  "ಬೋಳಿ ಮಗ",
  "ಬೇವರ್ಸಿ",
  "ನಾಯಿ",
  "ಕಿರಿಕ್"
];

/* ---------- TEXT NORMALIZATION ---------- */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, " ") // keep native letters
    .replace(/\s+/g, " ");
};

/* ---------- ALLOW SPACED & STRETCHED ABUSE ---------- */
const loosePattern = (word) => {
  return word
    .split("")
    .map(ch => `${ch}+`)
    .join("\\s*"); // allows: p o d a, loooosu
};

/* ---------- MAIN DETECTOR ---------- */
export const containsAbusiveLanguage = (text = "") => {
  if (!text.trim()) return false;

  const normalized = normalizeText(text);

  return abusiveWords.some(word => {
    const pattern = loosePattern(word.toLowerCase());
    const regex = new RegExp(`\\b${pattern}\\b`, "iu");
    return regex.test(normalized);
  });
};
