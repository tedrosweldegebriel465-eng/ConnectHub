const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const { corsOptions, authLimiter, apiLimiter } = require("./middleware/security");
const { errorHandler, notFound } = require("./middleware/errorMiddleware");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions,
});

const PORT = process.env.PORT || 5000;

app.set("io", io);

// Security & performance middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(compression());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: "200mb" }));
app.use(express.urlencoded({ limit: "200mb", extended: true }));

// Rate limiting
app.use("/api/auth", authLimiter);
app.use("/api", apiLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Auto-sync uploaded stories into server/uploads/stories if present
try {
  const srcStoriesDir = path.join(__dirname, "../uploads/stories");
  const destStoriesDir = path.join(__dirname, "uploads/stories");
  if (fs.existsSync(srcStoriesDir)) {
    if (!fs.existsSync(destStoriesDir)) {
      fs.mkdirSync(destStoriesDir, { recursive: true });
    }
    fs.readdirSync(srcStoriesDir).forEach(file => {
      const srcFile = path.join(srcStoriesDir, file);
      const destFile = path.join(destStoriesDir, file);
      if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  }
} catch (e) {
  console.warn("Story uploads sync warning:", e.message);
}

app.use(express.static(path.join(__dirname, "../client")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/comments", require("./routes/commentRoutes"));
app.use("/api/users", require("./routes/userRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/stories", require("./routes/storyRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));

app.get("/api", (req, res) =>
  res.json({ message: "⚡ ConnectHub API is running", version: "2.0.0" })
);

app.get("/api/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

app.use(notFound);
app.use(errorHandler);

function extractTokenFromCookie(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ===== Socket.io =====
io.use((socket, next) => {
  let token = socket.handshake.auth.token;
  if (!token) {
    token = extractTokenFromCookie(socket.handshake.headers.cookie);
  }
  if (!token) return next(new Error("No token"));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  socket.join(socket.userId);

  socket.on("joinConversation", (partnerId) => {
    const roomId = [socket.userId, partnerId].sort().join("-");
    socket.join(roomId);
  });

  socket.on("leaveConversation", (partnerId) => {
    const roomId = [socket.userId, partnerId].sort().join("-");
    socket.leave(roomId);
  });

  socket.on("typing", ({ to }) => {
    socket.to(to).emit("typing", { from: socket.userId });
  });

  socket.on("stopTyping", ({ to }) => {
    socket.to(to).emit("stopTyping", { from: socket.userId });
  });

  socket.on("disconnect", () => {});
});

module.exports.io = io;

// MongoDB + server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");
    server.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
