const jwt = require("jsonwebtoken");

module.exports = {
  authenticate: (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch (e) {
      return res.status(401).json({ message: "Invalid token" });
    }
  },
  authorize:
    (...roles) =>
    (req, res, next) => {
      if (!roles.includes(req.user.role))
        return res.status(403).json({ message: "Forbidden" });
      next();
    },
};
