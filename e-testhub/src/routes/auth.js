const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register user (admin can create roles; for demo allow open register if no admin exists)
router.post("/register", async (req, res, next) => {
  try {
    // Kiểm tra xem req.body có tồn tại không (nếu JSON không hợp lệ thì req.body sẽ undefined)
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message: "Dữ liệu không hợp lệ",
        error:
          "JSON không hợp lệ hoặc thiếu dữ liệu. Vui lòng kiểm tra lại định dạng JSON (không được có comment // trong JSON)",
      });
    }

    const {
      email,
      password,
      firstName,
      lastName,
      role,
      classId,
      teachingSubjects,
      isActive,
    } = req.body;

    // Kiểm tra các trường bắt buộc với thông báo chi tiết
    const missingFields = [];
    if (!email) missingFields.push("email");
    if (!password) missingFields.push("password");
    if (!role) missingFields.push("role");
    if (!firstName) missingFields.push("firstName");
    if (!lastName) missingFields.push("lastName");

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: "Thiếu các trường bắt buộc",
        error: `Vui lòng điền đầy đủ các trường: ${missingFields.join(", ")}`,
        missingFields: missingFields,
      });
    }

    // Kiểm tra email đã tồn tại chưa
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({
        message: "Email đã tồn tại",
        error: "Email này đã được sử dụng. Vui lòng chọn email khác",
      });
    }

    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role,
      classId,
      teachingSubjects,
      isActive,
    });

    return res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    });
  } catch (err) {
    next(err);
  }
});

// Login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Kiểm tra đầu vào: phải có email và password
    if (!email || !password) {
      return res.status(400).json({
        message: "Thiếu thông tin đăng nhập",
        error: "Vui lòng nhập đầy đủ email và mật khẩu",
      });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });

    // Kiểm tra user có tồn tại không
    if (!user) {
      return res.status(401).json({
        message: "Thông tin đăng nhập không đúng",
        error: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Kiểm tra tài khoản có bị vô hiệu hóa không
    if (user.isActive === false) {
      return res.status(403).json({
        message: "Tài khoản đã bị vô hiệu hóa",
        error: "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên",
      });
    }

    // So sánh mật khẩu
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({
        message: "Mật khẩu không đúng",
        error: "Email hoặc mật khẩu không chính xác",
      });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { sub: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    return res.json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
