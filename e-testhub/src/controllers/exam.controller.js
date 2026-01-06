const mongoose = require("mongoose");
const Exam = require("../models/Exam");

exports.list = async (req, res, next) => {
  try {
    res.json(await Exam.find().populate("classIds").lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await Exam.findById(id).populate("classIds").lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      title,
      description,
      classIds: classIdsRaw,
      teacherId: teacherIdRaw,
      duration,
      questions,
      questionIds,
      maxAttempts,
      passingScore,
      isPublished,
      isLocked,
      openAt,
      closeAt,
      shuffleQuestions,
      shuffleAnswers,
      showResultImmediately,
      allowReview,
    } = req.body;
    if (!title || !duration || !openAt || !closeAt)
      return res.status(400).json({ message: "Missing fields" });

    // Chuẩn hóa classIds: chấp nhận classId đơn hoặc mảng
    let classIds = classIdsRaw;
    if (!Array.isArray(classIds)) {
      classIds = classIds ? [classIds] : [];
    }

    if (!Array.isArray(classIds) || classIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Missing fields", error: "classIds must not be empty" });
    }

    // Validate ObjectId cho classIds
    for (const classId of classIds) {
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        return res
          .status(400)
          .json({ message: "Invalid class id", error: `Invalid classId: ${classId}` });
      }
    }

    // TeacherId: lấy từ body hoặc token (req.user.sub)
    const teacherId = teacherIdRaw || req.user?.sub;
    if (teacherId && !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher id" });
    }

    if (!teacherId) {
      return res.status(400).json({
        message: "Missing fields",
        error: "teacherId không có. Hãy gửi teacherId hoặc dùng token chứa sub",
      });
    }

    // Validate thời gian mở/đóng
    if (new Date(openAt) >= new Date(closeAt)) {
      return res.status(400).json({
        message: "Thời gian không hợp lệ",
        error: "openAt phải nhỏ hơn closeAt",
      });
    }

    const examData = {
      title,
      classIds,
      teacherId,
      duration,
      openAt,
      closeAt,
    };

    if (description !== undefined) examData.description = description;
    if (questions !== undefined) examData.questions = questions;
    if (questionIds !== undefined) examData.questionIds = questionIds;
    if (maxAttempts !== undefined) examData.maxAttempts = maxAttempts;
    if (passingScore !== undefined) examData.passingScore = passingScore;
    if (isPublished !== undefined) examData.isPublished = isPublished;
    if (isLocked !== undefined) examData.isLocked = isLocked;
    if (shuffleQuestions !== undefined)
      examData.shuffleQuestions = shuffleQuestions;
    if (shuffleAnswers !== undefined)
      examData.shuffleAnswers = shuffleAnswers;
    if (showResultImmediately !== undefined)
      examData.showResultImmediately = showResultImmediately;
    if (allowReview !== undefined) examData.allowReview = allowReview;

    const created = await Exam.create(examData);
    const populated = await Exam.findById(created._id)
      .populate("classIds")
      .lean();
    res.status(201).json(populated);
  } catch (e) {
    next(e);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const {
      title,
      description,
      classIds: classIdsRaw,
      teacherId: teacherIdRaw,
      duration,
      questions,
      questionIds,
      maxAttempts,
      passingScore,
      isPublished,
      isLocked,
      openAt,
      closeAt,
      shuffleQuestions,
      shuffleAnswers,
      showResultImmediately,
      allowReview,
    } = req.body;

    let classIds = classIdsRaw;
    if (classIds !== undefined && !Array.isArray(classIds)) {
      classIds = classIds ? [classIds] : [];
    }

    if (classIds !== undefined) {
      if (!Array.isArray(classIds) || classIds.length === 0) {
        return res.status(400).json({
          message: "classIds must be a non-empty array",
        });
      }
      for (const classId of classIds) {
        if (!mongoose.Types.ObjectId.isValid(classId)) {
          return res
            .status(400)
            .json({ message: "Invalid class id", error: `Invalid classId: ${classId}` });
        }
      }
    }

    const teacherId = teacherIdRaw || req.user?.sub;
    if (teacherId && !mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: "Invalid teacher id" });
    }

    if (openAt && closeAt && new Date(openAt) >= new Date(closeAt)) {
      return res.status(400).json({
        message: "Thời gian không hợp lệ",
        error: "openAt phải nhỏ hơn closeAt",
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (classIds !== undefined) updateData.classIds = classIds;
    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (duration !== undefined) updateData.duration = duration;
    if (questions !== undefined) updateData.questions = questions;
    if (questionIds !== undefined) updateData.questionIds = questionIds;
    if (maxAttempts !== undefined) updateData.maxAttempts = maxAttempts;
    if (passingScore !== undefined) updateData.passingScore = passingScore;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (isLocked !== undefined) updateData.isLocked = isLocked;
    if (openAt !== undefined) updateData.openAt = openAt;
    if (closeAt !== undefined) updateData.closeAt = closeAt;
    if (shuffleQuestions !== undefined)
      updateData.shuffleQuestions = shuffleQuestions;
    if (shuffleAnswers !== undefined) updateData.shuffleAnswers = shuffleAnswers;
    if (showResultImmediately !== undefined)
      updateData.showResultImmediately = showResultImmediately;
    if (allowReview !== undefined) updateData.allowReview = allowReview;

    const updated = await Exam.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("classIds")
      .lean();
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
    const deleted = await Exam.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const total = await Exam.countDocuments();
    const published = await Exam.countDocuments({ isPublished: true });
    const locked = await Exam.countDocuments({ isLocked: true });

    const classDistribution = await Exam.aggregate([
      { $unwind: "$classIds" },
      {
        $group: {
          _id: "$classIds",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      total,
      published,
      locked,
      classDistribution,
    });
  } catch (e) {
    next(e);
  }
};
