const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOption: { type: String, enum: ["A", "B", "C", "D"] },
    score: { type: Number, default: 0 },
  },
  { _id: false }
);

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    answers: [answerSchema],
    submittedAt: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["pending", "graded", "reviewed"],
      default: "pending",
      index: true,
    },
    isGraded: { type: Boolean, default: false },
  },
  { timestamps: true }
);

submissionSchema.index({ examId: 1, userId: 1 }, { unique: true });
submissionSchema.index({ examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model("Submission", submissionSchema);
