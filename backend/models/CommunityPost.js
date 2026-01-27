import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    type: String, // heart, thumbsup, smile, etc
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { _id: false }
);

const commentSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    author: { type: String },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true }
);

const communityPostSchema = new mongoose.Schema(
  {
    author: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    text: { type: String, required: true },
    hashtags: [String],

    reactions: {
      type: Map,
      of: Number,
      default: {}
    },

    userReactions: {
      type: Map, // userId -> reactionType
      of: String,
      default: {}
    },

    comments: [commentSchema]
  },
  { timestamps: true }
);

communityPostSchema.index({ authorId: 1 });
communityPostSchema.index({ createdAt: -1 });

export default mongoose.model("CommunityPost", communityPostSchema);
