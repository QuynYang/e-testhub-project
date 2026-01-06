const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    // MCQ content
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["multiple-choice", "essay", "true-false"],
      default: "multiple-choice",
    },
    content: { type: String, required: true },
    options: {
      type: [String],
      validate: (v) => Array.isArray(v) && v.length >= 2 && v.length <= 4,
    },
    correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
    score: { type: Number, default: 1, min: 0 },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    difficultyLevel: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("Question", questionSchema);
