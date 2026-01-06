const mongoose = require("mongoose");
const Submission = require("../models/Submission");

exports.list = async (req, res, next) => {
  try {
    res.json(await Submission.find().lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await Submission.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { userId, studentId, examId, answers, score, status, isGraded } =
      req.body;
    if ((!userId && !studentId) || !examId)
      return res.status(400).json({ message: "Missing fields" });
    const created = await Submission.create({
      userId: userId || studentId,
      studentId,
      examId,
      answers,
      score,
      status,
      isGraded,
    });
    res.status(201).json(created);
  } catch (e) {
    if (e && e.code === 11000)
      return res.status(409).json({ message: "Duplicate submission" });
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const { answers, score, status, isGraded } = req.body;
    const updated = await Submission.findByIdAndUpdate(
      id,
      { answers, score, status, isGraded },
      { new: true, runValidators: true }
    ).lean();
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const deleted = await Submission.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const total = await Submission.countDocuments();
    const graded = await Submission.countDocuments({ isGraded: true });
    const pending = await Submission.countDocuments({ status: "pending" });
    const averageScore = await Submission.aggregate([
      {
        $group: {
          _id: null,
          avg: { $avg: "$score" },
        },
      },
    ]);

    const statusDistribution = await Submission.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      total,
      graded,
      pending,
      averageScore: averageScore[0]?.avg || 0,
      statusDistribution,
    });
  } catch (e) {
    next(e);
  }
};

exports.getByExamId = async (req, res, next) => {
  try {
    const { examId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(examId))
      return res.status(400).json({ message: "Invalid examId" });
    const submissions = await Submission.find({ examId }).lean();
    res.json(submissions);
  } catch (e) {
    next(e);
  }
};

exports.getByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId))
      return res.status(400).json({ message: "Invalid userId" });
    const submissions = await Submission.find({
      $or: [{ userId }, { studentId: userId }],
    }).lean();
    res.json(submissions);
  } catch (e) {
    next(e);
  }
};
