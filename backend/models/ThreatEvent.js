import mongoose from "mongoose";

const threatEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    source: {
      type: String,
      enum: ["audio", "manual"],
      default: "audio"
    },
    rms: Number,
    peak: Number,
    decision: {
      type: String,
      enum: ["danger", "safe"]
    }
  },
  { timestamps: true }
);

export default mongoose.model("ThreatEvent", threatEventSchema);
