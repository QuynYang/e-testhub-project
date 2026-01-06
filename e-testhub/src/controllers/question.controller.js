const mongoose = require("mongoose");
const Question = require("../models/Question");

exports.list = async (req, res, next) => {
  try {
    res.json(await Question.find().lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await Question.findById(id).lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    // Guard: nếu body không có (ví dụ Content-Type sai hoặc không gửi JSON)
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        error:
          "Thiếu body hoặc Content-Type không phải application/json. Hãy gửi JSON hợp lệ trong request body.",
      });
    }
    const {
      courseId,
      content,
      answerA,
      answerB,
      answerC,
      answerD,
      correctAnswer,
    } = req.body;

    // Validate bắt buộc
    const missing = [];
    if (!content) missing.push("content");
    if (!answerA) missing.push("answerA");
    if (!answerB) missing.push("answerB");
    if (!answerC) missing.push("answerC");
    if (!answerD) missing.push("answerD");
    if (!correctAnswer) missing.push("correctAnswer");
    if (missing.length) {
      return res
        .status(400)
        .json({ message: "Thiếu trường bắt buộc", fields: missing });
    }

    // Validate correctAnswer
    const allowed = ["A", "B", "C", "D"];
    if (!allowed.includes(correctAnswer)) {
      return res.status(400).json({
        message: "Giá trị correctAnswer không hợp lệ",
        error: "Phải là một trong A, B, C, D",
      });
    }

    // Chuẩn hóa dữ liệu lưu trữ
    const options = [answerA, answerB, answerC, answerD];
    const type = "multiple-choice";

    const created = await Question.create({
      text: content,
      content,
      options,
      correctAnswer,
      type,
      ...(courseId ? { courseId } : {}),
    });
    res.status(201).json(created);
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
      content,
      answerA,
      answerB,
      answerC,
      answerD,
      correctAnswer,
      courseId,
    } = req.body;
    const updated = await Question.findByIdAndUpdate(
      id,
      {
        ...(content !== undefined ? { text: content, content } : {}),
        ...(correctAnswer !== undefined ? { correctAnswer } : {}),
        ...(courseId !== undefined ? { courseId } : {}),
        // nếu client gửi bất kỳ answer nào, build lại mảng options theo A-D
        ...(answerA !== undefined ||
        answerB !== undefined ||
        answerC !== undefined ||
        answerD !== undefined
          ? {
              options: [answerA, answerB, answerC, answerD].map((v) => v ?? ""),
            }
          : {}),
      },
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
    const deleted = await Question.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};
