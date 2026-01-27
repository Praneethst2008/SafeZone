export const runAIAnalyser = ({ description, category, files, userStats }) => {
  let score = 0;
  const flags = [];

  const text = description.toLowerCase();

  /* ---------------- KEYWORD ANALYSIS ---------------- */
  const dangerKeywords = [
    "threat",
    "hit",
    "attack",
    "kill",
    "harass",
    "abuse",
    "fear",
    "scared",
    "blackmail"
  ];

  dangerKeywords.forEach(word => {
    if (text.includes(word)) {
      score += 10;
      flags.push(`Keyword detected: ${word}`);
    }
  });

  /* ---------------- EVIDENCE CHECK ---------------- */
  if (files && files.length > 0) {
    score += 20;
    flags.push("Evidence attached");
  }

  /* ---------------- USER BEHAVIOR ---------------- */
  if (userStats.totalReports === 1) {
    score += 10;
    flags.push("First-time reporter");
  }

  if (userStats.fakeReports > 2) {
    score -= 20;
    flags.push("Past fake reports detected");
  }

  /* ---------------- CATEGORY CONSISTENCY ---------------- */
  if (category === "Bullying" && text.includes("weapon")) {
    flags.push("Category mismatch detected");
  }

  /* ---------------- FINAL LEVEL ---------------- */
  let level = "Low";
  if (score >= 60) level = "High";
  else if (score >= 30) level = "Medium";

  return {
    score,
    level,
    flags
  };
};
