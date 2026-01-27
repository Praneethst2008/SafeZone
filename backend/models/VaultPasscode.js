import mongoose from "mongoose";

const vaultPasscodeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true
    },
    passcodeHash: {
      type: String,
      required: true
    },

    failedAttempts: {
      type: Number,
      default: 0
    },

    lockedUntil: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

export default mongoose.model("VaultPasscode", vaultPasscodeSchema);
