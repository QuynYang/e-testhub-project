const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");

exports.list = async (req, res, next) => {
  try {
    const {
      dateFrom,
      dateTo,
      role,
      action,
      userId,
      status,
      limit = 50,
      skip = 0,
      sort = "-timestamp",
    } = req.query;

    // Build query filter
    const filter = {};

    // Date range filter
    if (dateFrom || dateTo) {
      filter.timestamp = {};
      if (dateFrom) {
        filter.timestamp.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Include the entire end date
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endDate;
      }
    }

    // Role filter
    if (role) {
      filter.userRole = role;
    }

    // Action filter
    if (action) {
      filter.action = action;
    }

    // User ID filter
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      filter.userId = userId;
    }

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Parse limit and skip as numbers
    const limitNum = parseInt(limit, 10);
    const skipNum = parseInt(skip, 10);

    // Validate limit and skip
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        message: "Invalid limit. Must be between 1 and 1000",
      });
    }

    if (isNaN(skipNum) || skipNum < 0) {
      return res.status(400).json({
        message: "Invalid skip. Must be >= 0",
      });
    }

    // Build sort object
    let sortObj = { timestamp: -1 }; // Default: newest first
    if (sort) {
      const sortField = sort.startsWith("-") ? sort.slice(1) : sort;
      const sortOrder = sort.startsWith("-") ? -1 : 1;
      sortObj = { [sortField]: sortOrder };
    }

    // Execute query
    const logs = await AuditLog.find(filter)
      .sort(sortObj)
      .limit(limitNum)
      .skip(skipNum)
      .lean();

    // Get total count for pagination info
    const total = await AuditLog.countDocuments(filter);

    // Transform logs to include createdAt from timestamp
    const transformedLogs = logs.map((log) => ({
      ...log,
      createdAt: log.timestamp || log.createdAt,
    }));

    res.json(transformedLogs);
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const log = await AuditLog.findById(id).lean();
    if (!log) {
      return res.status(404).json({ message: "Not found" });
    }

    // Ensure timestamp and createdAt are set
    const transformedLog = {
      ...log,
      createdAt: log.timestamp || log.createdAt,
      updatedAt: log.updatedAt || log.createdAt,
    };

    res.json(transformedLog);
  } catch (e) {
    next(e);
  }
};

