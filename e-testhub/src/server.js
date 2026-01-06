const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const connectDB = require("./config/db");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// CORS Configuration - Allow Frontend to call API
const corsOptions = {
  origin: [
    "https://e-testhub-frontend.onrender.com",
    "http://localhost:5209",
    "http://localhost:3000",
    "http://localhost:5000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

// Middlewares
app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
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
