import mongoose from "mongoose";

const AnalyzerCaseSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  additionalDetails: {
    date: String,
    context: String,
    notes: String,
  },
  evidence: [
    {
      filename: String,
      path: String,
      mimetype: String,
      originalName: String,
    },
  ],
  analysis: {
    verdict: {
      type: String,
      enum: ["consistent", "minor_anomalies", "major_anomalies", "insufficient_data"],
    },
    confidence: {
      type: String,
      enum: ["Low", "Medium", "High"],
    },
    observations: [String],
    flaggedSections: [
      {
        quote: String,
        issue: String,
      },
    ],
    legalContext: String, // Stores India specific legal sections (BNS/IPC)
    fullAnalysis: String, // The raw analysis text or main summary
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

AnalyzerCaseSchema.index({ userId: 1 });
AnalyzerCaseSchema.index({ createdAt: -1 });

export default mongoose.model("AnalyzerCase", AnalyzerCaseSchema);
