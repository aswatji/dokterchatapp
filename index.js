const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const apiRoutes = require("./src/routes");
app.use("/api", apiRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    port: process.env.PORT,
    nodeVersion: process.version,
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || "development"
  });
});

// Debug endpoint for CapRover troubleshooting
app.get("/debug", (req, res) => {
  res.json({
    message: "Debug Information",
    server: {
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      processId: process.pid,
      uptime: Math.floor(process.uptime()),
      platform: process.platform,
      nodeVersion: process.version
    },
    database: {
      hasUrl: !!process.env.DATABASE_URL,
      postgresHost: process.env.POSTGRES_HOST,
      postgresUser: process.env.POSTGRES_USER,
      postgresDb: process.env.POSTGRES_DB
    },
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Chat Server with UUID Schema is running! 🚀",
    version: "2.0.0",
    schema: "UUID-based for better scalability",
    status: "healthy",
    endpoints: {
      health: "/health",
      debug: "/debug",
      api: "/api",
      users: "/api/users",
      chats_v2: "/api/v2/chats"
    }
  });
});

// Socket.IO connection handling
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  // Join chat room
  socket.on("join_chat", (chatId) => {
    socket.join(`chat_${chatId}`);
    console.log(`👤 User ${socket.id} joined chat ${chatId}`);
  });

  // Handle new message
  socket.on("send_message", (data) => {
    console.log("📨 New message:", data);
    // Broadcast to all users in the chat room
    socket.to(`chat_${data.chatId}`).emit("new_message", data);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("👤 User disconnected:", socket.id);
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? err.message
        : "Something went wrong",
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
  });
});

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";

server.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
  console.log("📡 Socket.IO server ready for connections");
  console.log("🌍 Environment:", NODE_ENV);
});
