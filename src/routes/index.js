const express = require("express");
const router = express.Router();

// Import route modules
const userRoutes = require("./users");
const chatRoutes = require("./chats");
const messageRoutes = require("./messages");

// Import v2 route modules (UUID schema)
const newChatRoutes = require("./newChats");
const newMessageRoutes = require("./newMessages");
const chatMessageRoutes = require("./chatMessages");

// Use v1 routes (original schema)
router.use("/users", userRoutes);
router.use("/chats", chatRoutes);
router.use("/messages", messageRoutes);

// Use v2 routes (UUID schema)
router.use("/v2/chats", newChatRoutes);
router.use("/v2/messages", newMessageRoutes);
router.use("/v2/chats", chatMessageRoutes);

// API info endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Chat Server API is running!",
    version: "2.0.0",
    endpoints: {
      v1: {
        users: "/api/users",
        chats: "/api/chats",
        messages: "/api/messages",
      },
      v2: {
        users: "/api/users (same as v1)",
        chats: "/api/v2/chats",
        messages: "/api/v2/messages",
        chatMessages: "/api/v2/chats/:chatId/messages",
      },
    },
    documentation: {
      v1: "Original integer ID schema",
      v2: "New UUID schema for better scalability",
      migration: "Use /database_schema.sql to migrate to v2 schema",
    },
  });
});

module.exports = router;
