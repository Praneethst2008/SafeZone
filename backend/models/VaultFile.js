import mongoose from "mongoose";

const vaultFileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    originalName: String,
    storedName: String,
    mimeType: String,
    size: Number,

    iv: String,
    authTag: String,
    storage: {
      type: String,
      enum: ["supabase", "local"],
      required: true
    },



  },
  { timestamps: true }
);

vaultFileSchema.index({ userId: 1 });

export default mongoose.model("VaultFile", vaultFileSchema);
