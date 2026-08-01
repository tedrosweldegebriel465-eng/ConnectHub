const rateLimit = require("express-rate-limit");

const corsOptions = {
  origin(origin, callback) {
    const allowed = (process.env.CORS_ORIGINS || "http://localhost:5000")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again later.",
  },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

module.exports = {
  corsOptions,
  authLimiter,
  apiLimiter,
};
