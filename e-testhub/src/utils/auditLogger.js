const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

/**
 * Helper function to get client IP address from request
 */
const getClientIp = (req) => {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    "unknown"
  );
};

/**
 * Helper function to get user agent from request
 */
const getUserAgent = (req) => {
  return req.headers["user-agent"] || "unknown";
};

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {Object} options.req - Express request object
 * @param {String} options.action - Action type (login, logout, create, update, delete, etc.)
 * @param {String} options.description - Description of the action
 * @param {String} options.status - Status (success, failed, error) - default: "success"
 * @param {Object} options.metadata - Additional metadata (optional)
 * @param {Object} options.requestBody - Request body (optional)
 * @param {Number} options.responseStatus - HTTP response status (optional)
 * @param {String} options.errorMessage - Error message if status is failed/error (optional)
 * @param {String} options.userId - User ID (optional, will use req.user.id if not provided)
 * @param {String} options.userEmail - User email (optional, will fetch from User model if not provided)
 * @param {String} options.userRole - User role (optional, will use req.user.role if not provided)
 */
const createAuditLog = async ({
  req,
  action,
  description,
  status = "success",
  metadata = {},
  requestBody,
  responseStatus,
  errorMessage,
  userId,
  userEmail,
  userRole,
}) => {
  try {
    // Get user information
    let finalUserId = userId;
    let finalUserEmail = userEmail;
    let finalUserRole = userRole;

    // If req.user exists, use it as fallback
    if (req && req.user) {
      finalUserId = finalUserId || req.user.id || req.user._id;
      finalUserRole = finalUserRole || req.user.role;

      // Try to get email from req.user first
      if (!finalUserEmail && req.user.email) {
        finalUserEmail = req.user.email;
      }
    }

    // If userId is provided but email/role are not, fetch from User model
    if (finalUserId && (!finalUserEmail || !finalUserRole)) {
      try {
        const user = await User.findById(finalUserId).lean();
        if (user) {
          finalUserEmail = finalUserEmail || user.email;
          finalUserRole = finalUserRole || user.role;
        }
      } catch (err) {
        console.error("Error fetching user for audit log:", err);
      }
    }

    // Get request information
    const ipAddress = req ? getClientIp(req) : "unknown";
    const userAgent = req ? getUserAgent(req) : "unknown";
    const method = req ? req.method : undefined;
    const endpoint = req ? req.originalUrl || req.path : undefined;

    // Create audit log entry
    const auditLogData = {
      timestamp: new Date(),
      userId: finalUserId,
      userEmail: finalUserEmail || "unknown",
      userRole: finalUserRole || "unknown",
      action,
      description,
      ipAddress,
      status,
      userAgent,
      method,
      endpoint,
      metadata,
    };

    // Add optional fields
    if (requestBody !== undefined) {
      auditLogData.requestBody = requestBody;
    }
    if (responseStatus !== undefined) {
      auditLogData.responseStatus = responseStatus;
    }
    if (errorMessage) {
      auditLogData.errorMessage = errorMessage;
    }

    // Create the audit log (don't wait for it to complete)
    AuditLog.create(auditLogData).catch((err) => {
      console.error("Error creating audit log:", err);
      // Don't throw error - audit logging should not break the main flow
    });
  } catch (error) {
    console.error("Error in createAuditLog:", error);
    // Don't throw error - audit logging should not break the main flow
  }
};

module.exports = {
  createAuditLog,
  getClientIp,
  getUserAgent,
};

