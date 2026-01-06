const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    classIds: {
      type: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
          required: true,
        },
      ],
      validate: (v) => Array.isArray(v) && v.length > 0,
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    duration: { type: Number, required: true, min: 1 },
    openAt: { type: Date, required: true },
    closeAt: { type: Date, required: true },
    shuffleQuestions: { type: Boolean, default: false },
    shuffleAnswers: { type: Boolean, default: false },
    showResultImmediately: { type: Boolean, default: false },
    allowReview: { type: Boolean, default: false },
    maxAttempts: { type: Number, default: 1, min: 1 },
    passingScore: { type: Number, default: 50, min: 0, max: 100 },
    isPublished: { type: Boolean, default: true, index: true },
    questions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    isLocked: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
