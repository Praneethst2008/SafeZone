import mongoose from "mongoose";

const communityReportSchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunityPost" },
    reason: { type: String, required: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: { type: String, default: "pending" }
  },
  { timestamps: true }
);

communityReportSchema.index({ postId: 1 });
communityReportSchema.index({ reportedBy: 1 });

export default mongoose.model("CommunityReport", communityReportSchema);
