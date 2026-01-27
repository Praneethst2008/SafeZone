import Report from "../models/report.js";
import Notification from "../models/notification.js";
import { runAIAnalyser } from "../utils/aiAnalyser.js";

/**
 * USER → CREATE REPORT
 */
export const createReport = async (req, res) => {
  try {
    const {
      fullName,
      category,
      location,
      date,
      time,
      description,
      anonymous
    } = req.body;

    const files = req.files ? req.files.map(f => f.path) : [];

    // ---------------- PARALLEL USER STATS ----------------
    const [totalReports, fakeReports] = await Promise.all([
      Report.countDocuments({ userId: req.user.id }),
      Report.countDocuments({ userId: req.user.id, status: "fake" })
    ]);

    // ---------------- AI ANALYSIS ----------------
    const aiResult = runAIAnalyser({
      description,
      category,
      files,
      userStats: {
        totalReports: totalReports + 1,
        fakeReports
      }
    });

    const report = await Report.create({
      userId: req.user.id,
      fullName,
      category,
      location,
      date,
      time,
      description,
      anonymous: anonymous === "true",
      files,
      status: "pending",
      statusHistory: [{ status: "pending" }],
      aiAnalysis: aiResult
    });

    res.status(201).json({
      message: "Report submitted successfully",
      reportId: report._id
    });
  } catch (err) {
    console.error("Create report error:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};



/**
 * USER → VIEW OWN REPORTS
 */
export const getMyReports = async (req, res) => {
  const reports = await Report.find({ userId: req.user.id })
    .select("-internalNote -aiAnalysis") // 🚫 hide AI + admin notes
    .sort({ createdAt: -1 });

  res.json(reports);
};


/**
 * ADMIN → VIEW ALL REPORTS
 */
export const getAllReports = async (req, res) => {
  try {
    const reports = await Report.find()
      .populate("userId", "username phoneNumber")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch {
    res.status(500).json({ message: "Failed to fetch reports" });
  }
};

/**
 *USER REPORT DELETE
 */
export const deleteMyReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    if (["genuine", "fake"].includes(report.status)) {
      return res.status(403).json({
        message: "Reviewed reports cannot be deleted"
      });
    }

    await report.deleteOne();
    res.json({ message: "Report deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};


/**
 * ADMIN → REVIEW REPORT
 */
export const reviewReport = async (req, res) => {
  try {
    const { status, adminRemark, internalNote } = req.body;

    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // update fields
    report.status = status;
    report.adminRemark = adminRemark || report.adminRemark;
    report.internalNote = internalNote || report.internalNote;

    // push timeline
    report.statusHistory.push({ status });

    await report.save();

    res.json({
      message: "Report updated",
      report
    });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(500).json({ message: "Failed to update report" });
  }
};
