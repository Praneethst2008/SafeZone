import CommunityPost from "../models/CommunityPost.js";
import CommunityReport from "../models/CommunityReport.js";
import User from "../models/user.js";
import { io } from "../server.js";
import { containsAbusiveLanguage } from "../utils/abuseDetector.js";

/* GET ALL POSTS */
export const getPosts = async (req, res) => {
  const posts = await CommunityPost.find().sort({ createdAt: -1 });
  res.json(posts);
  io.emit("community:getPosts", posts);
};

/* CREATE POST */
export const createPost = async (req, res) => {
  const { text, hashtags } = req.body;

  if (!text) return res.status(400).json({ message: "Text required" });

  const user = await User.findById(req.user.id);

  const post = await CommunityPost.create({
    author: user.username,
    authorId: user._id,
    text,
    hashtags
  });

  io.emit("community:newPost", post);

  res.status(201).json(post);
};

/* DELETE OWN POST */
export const deletePost = async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // ✅ Ownership check
  if (post.authorId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await post.deleteOne();

  io.emit("community:deletePost", post._id);

  res.json({ message: "Post deleted" });
};

/* UPDATE POST */
export const editPost = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Post text required" });
  }

  const post = await CommunityPost.findById(req.params.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // 🔐 Ownership check
  if (post.authorId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  post.text = text;
  post.editedAt = new Date();

  await post.save();

  io.emit("community:updatePost", post);

  res.json(post);
};


/* ADD COMMENT */
export const addComment = async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "Comment cannot be empty" });
  }

  // 🧠 RULE-BASED NLP CHECK
  if (containsAbusiveLanguage(text)) {
    return res.status(400).json({
      message: "Your comment contains abusive or harmful language. Please revise it."
    });
  }

  const post = await CommunityPost.findById(req.params.id);
  const user = await User.findById(req.user.id);

  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  post.comments.push({
    text,
    author: user.username,
    authorId: user._id
  });

  await post.save();
  io.emit("community:updatePost", post);
  res.json(post);
};


/* DELETE COMMENT */
export const deleteComment = async (req, res) => {
  const { postId, commentId } = req.params;

  const post = await CommunityPost.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const comment = post.comments.id(commentId);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }

  // ownership check
  if (comment.authorId.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not allowed" });
  }

  comment.deleteOne();
  await post.save();
  io.emit("community:updatePost", post);

  // ✅ SEND RESPONSE ONCE
  return res.json(post);
};



/* REACT TO POST */
export const reactToPost = async (req, res) => {
  const { reaction } = req.body;
  const post = await CommunityPost.findById(req.params.id);

  const prevReaction = post.userReactions.get(req.user.id);

  if (prevReaction) {
    post.reactions.set(prevReaction, post.reactions.get(prevReaction) - 1);
  }

  if (prevReaction !== reaction) {
    post.reactions.set(reaction, (post.reactions.get(reaction) || 0) + 1);
    post.userReactions.set(req.user.id, reaction);
  } else {
    post.userReactions.delete(req.user.id);
  }

  await post.save();

  io.emit("community:updatePost", post);

  res.json(post);
};

/* REPORT POST */
export const reportPost = async (req, res) => {
  const { reason } = req.body;

  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  await CommunityReport.create({
    postId: req.params.id,
    reason,
    reportedBy: req.user.id
  });

  io.emit("community:updatePost", post);

  res.json({ message: "Report submitted" });
};


/* ================= ADMIN ================= */

/* ================= ADMIN → GET ALL POSTS WITH REPORT DETAILS ================= */
export const adminGetAllPosts = async (req, res) => {
  try {
    const posts = await CommunityPost.find()
      .sort({ createdAt: -1 })
      .lean();

    const reports = await CommunityReport.find({ status: "pending" }).lean();

    const reportMap = {};

    reports.forEach(r => {
      const postId = r.postId.toString();
      if (!reportMap[postId]) reportMap[postId] = [];
      reportMap[postId].push({
        reportId: r._id,
        reason: r.reason
      });
    });

    const enrichedPosts = posts.map(p => ({
      ...p,
      reportCount: reportMap[p._id]?.length || 0,
      reportReasons: reportMap[p._id]?.map(r => r.reason) || [],
      latestReportId: reportMap[p._id]?.[0]?.reportId || null
    }));

    res.json(enrichedPosts);
  } catch (err) {
    console.error("Admin get posts error:", err);
    res.status(500).json({ message: "Failed to load posts" });
  }
};

/* ADMIN → DELETE ANY POST */
export const adminDeletePost = async (req, res) => {
  const post = await CommunityPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: "Post not found" });

  await CommunityReport.deleteMany({ postId: post._id });
  await post.deleteOne();

  io.emit("community:deletePost", post._id);
  res.json({ message: "Post deleted by admin" });
};

/* ADMIN → DELETE ANY COMMENT */
export const adminDeleteComment = async (req, res) => {
  const { postId, commentId } = req.params;

  const post = await CommunityPost.findById(postId);
  if (!post) return res.status(404).json({ message: "Post not found" });

  post.comments = post.comments.filter(
    c => c._id.toString() !== commentId
  );

  await post.save();
  io.emit("community:updatePost", post);

  res.json({ message: "Comment deleted by admin", post });
};


/* ================= ADMIN REPORT ACTIONS ================= */

/* ADMIN → RESOLVE REPORT (DELETE POST) */
export const adminResolveReport = async (req, res) => {
  const { postId } = req.params;

  const post = await CommunityPost.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  // mark all reports as resolved
  await CommunityReport.updateMany(
    { postId },
    { status: "resolved" }
  );

  await post.deleteOne();

  io.emit("community:deletePost", postId);

  res.json({
    message: "Report resolved. Post deleted."
  });
};

/* ADMIN → DISMISS REPORT (FAKE REPORT) */
export const adminDismissReport = async (req, res) => {
  const { reportId } = req.params;

  const report = await CommunityReport.findById(reportId);
  if (!report) {
    return res.status(404).json({ message: "Report not found" });
  }

  await report.deleteOne();

  res.json({
    message: "Report dismissed and removed"
  });
};
