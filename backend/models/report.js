import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    fullName: String,

    category: {
      type: String,
      required: true
    },

    location: String,
    date: String,
    time: String,

    description: {
      type: String,
      required: true
    },

    files: [String], // file paths

    anonymous: {
      type: Boolean,
      default: true
    },

    status: {
      type: String,
      enum: ["pending", "processing", "genuine", "fake"],
      default: "pending"
    },

    adminRemark: String,

    statusHistory: [
      {
        status: String,
        updatedAt: { type: Date, default: Date.now }
      }
    ],

    internalNote: {
      type: String,
      default: ""
    },

    aiAnalysis: {
      score: {
        type: Number,
        default: 0
      },
      level: {
        type: String,
        default: "Low"
      },
      flags: {
        type: [String],
        default: []
      }
    },

  },
  { timestamps: true }
);

reportSchema.index({ userId: 1 });
reportSchema.index({ createdAt: -1 });

export default mongoose.model("Report", reportSchema);
