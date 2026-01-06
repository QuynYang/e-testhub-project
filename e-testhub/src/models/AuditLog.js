const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: ["admin", "teacher", "student"],
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "login",
        "logout",
        "create",
        "update",
        "delete",
        "view",
        "read",
        "export",
        "import",
        "publish",
        "unpublish",
      ],
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    ipAddress: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed", "error"],
      required: true,
      default: "success",
      index: true,
    },
    // Optional fields
    userAgent: {
      type: String,
    },
    method: {
      type: String,
      enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
    endpoint: {
      type: String,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
    },
    responseStatus: {
      type: Number,
    },
    errorMessage: {
      type: String,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Indexes for better query performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ userRole: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ status: 1, timestamp: -1 });

// Pre-save hook to sync timestamp with createdAt
auditLogSchema.pre("save", function (next) {
  if (this.isNew && !this.timestamp) {
    this.timestamp = new Date();
  }
  next();
});

// Ensure timestamp is always included in JSON output
auditLogSchema.set("toJSON", {
  transform: function (doc, ret) {
    // Ensure timestamp is always set (use createdAt if timestamp is missing)
    if (!ret.timestamp && ret.createdAt) {
      ret.timestamp = ret.createdAt;
    }
    // Ensure createdAt is always set (use timestamp if createdAt is missing)
    if (!ret.createdAt && ret.timestamp) {
      ret.createdAt = ret.timestamp;
    }
    return ret;
  },
});

module.exports = mongoose.model("AuditLog", auditLogSchema);

