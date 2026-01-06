const mongoose = require("mongoose");
const User = require("../models/User");
const ClassModel = require("../models/Class");

exports.list = async (req, res, next) => {
  try {
    res.json(await User.find().populate("classIds").lean());
  } catch (e) {
    next(e);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ message: "Invalid id" });
    const doc = await User.findById(id).populate("classIds").lean();
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      fullName,
      role,
      classId,
      classIds,
      teachingSubjects,
      isActive,
    } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Thiếu email hoặc mật khẩu" });
    if (!firstName && !lastName && !fullName)
      return res.status(400).json({ message: "Thiếu thông tin họ và tên" });
    if (!role) return res.status(400).json({ message: "Thiếu vai trò" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: "Email đã tồn tại" });

    let normalizedClassIds;
    if (classIds !== undefined) {
      normalizedClassIds = Array.isArray(classIds) ? classIds : [classIds];
    } else if (classId) {
      normalizedClassIds = [classId];
    }

    if (normalizedClassIds) {
      for (const cid of normalizedClassIds) {
        if (!mongoose.Types.ObjectId.isValid(cid)) {
          return res.status(400).json({
            message: "Invalid class id",
            error: `classId ${cid} không hợp lệ`,
          });
        }
      }
    }

    const created = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      classId: normalizedClassIds ? normalizedClassIds[0] : classId,
      classIds: normalizedClassIds,
      teachingSubjects,
      isActive,
    });

    if (normalizedClassIds && normalizedClassIds.length) {
      await ClassModel.updateMany(
        { _id: { $in: normalizedClassIds } },
        { $addToSet: { students: created._id } }
      );
    }

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
      firstName,
      lastName,
      email,
      role,
      classId,
      classIds,
      teachingSubjects,
      avatar,
      info,
      isActive,
    } = req.body;

    const existing = await User.findById(id);
    if (!existing) return res.status(404).json({ message: "Not found" });

    let normalizedClassIds;
    if (classIds !== undefined) {
      normalizedClassIds = Array.isArray(classIds) ? classIds : [classIds];
    } else if (classId !== undefined) {
      normalizedClassIds = classId ? [classId] : [];
    }

    if (normalizedClassIds) {
      for (const cid of normalizedClassIds) {
        if (!mongoose.Types.ObjectId.isValid(cid)) {
          return res.status(400).json({
            message: "Invalid class id",
            error: `classId ${cid} không hợp lệ`,
          });
        }
      }
    }

    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (teachingSubjects !== undefined) updateData.teachingSubjects = teachingSubjects;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (info !== undefined) updateData.info = info;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (normalizedClassIds) {
      updateData.classIds = normalizedClassIds;
      updateData.classId = normalizedClassIds[0] || null;

      const prevClassIds = (existing.classIds || []).map((cid) => cid.toString());
      const newClassIds = normalizedClassIds.map((cid) => cid.toString());
      const prevSet = new Set(prevClassIds);
      const newSet = new Set(newClassIds);

      const toAdd = [...newSet].filter((cid) => !prevSet.has(cid));
      const toRemove = [...prevSet].filter((cid) => !newSet.has(cid));

      if (toAdd.length) {
        await ClassModel.updateMany(
          { _id: { $in: toAdd } },
          { $addToSet: { students: existing._id } }
        );
      }

      if (toRemove.length) {
        await ClassModel.updateMany(
          { _id: { $in: toRemove } },
          { $pull: { students: existing._id } }
        );
      }
    }

    if (classId !== undefined && normalizedClassIds === undefined) {
      updateData.classId = classId;
    }

    const updated = await User.findByIdAndUpdate(id, updateData, {
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
    const deleted = await User.findByIdAndDelete(id).lean();
    if (!deleted) return res.status(404).json({ message: "Not found" });
    if (deleted.classIds && deleted.classIds.length) {
      await ClassModel.updateMany(
        { _id: { $in: deleted.classIds } },
        { $pull: { students: deleted._id } }
      );
    }
    res.json({ deleted: true });
  } catch (e) {
    next(e);
  }
};

exports.getStatistics = async (req, res, next) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: "$role",
          count: { $sum: 1 },
        },
      },
    ]);
    const total = await User.countDocuments();
    const active = await User.countDocuments({ isActive: true });
    res.json({ byRole: stats, total, active });
  } catch (e) {
    next(e);
  }
};
