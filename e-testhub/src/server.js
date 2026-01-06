const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// DB
connectDB();

// Routes
app.get("/", (req, res) => {
  res.json({ status: "ok", name: "e-testhub" });
});

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/classes", require("./routes/classes"));
app.use("/api/courses", require("./routes/courses"));
app.use("/api/subjects", require("./routes/subjects"));
app.use("/api/exams", require("./routes/exams"));
app.use("/api/questions", require("./routes/questions"));
app.use("/api/schedules", require("./routes/schedules"));
app.use("/api/submissions", require("./routes/submissions"));
app.use("/api/exam-results", require("./routes/examResults"));
app.use("/api/audit-logs", require("./routes/auditLogs"));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
