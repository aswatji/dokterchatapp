require("dotenv").config();
const express = require("express");
const cors = require("cors");

// Use test database instead of PostgreSQL for demo
const db = require("./src/config/testDatabase");

// Initialize test database
console.log("🚀 Starting Chat Server with UUID Schema Demo...\n");

const sampleData = db.initializeTables();

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic logging middleware
app.use((req, res, next) => {
  console.log(
    `📡 ${req.method} ${req.path}${
      req.query.userId ? ` (userId: ${req.query.userId})` : ""
    }`
  );
  next();
});

// Simple user controller with SQLite
const userController = {
  getAllUsers: async (req, res) => {
    try {
      const result = db.query("SELECT * FROM users ORDER BY created_at DESC");
      res.json({
        success: true,
        message: "Users retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  createUser: async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: "Name and email are required",
        });
      }

      const uid = require("crypto").randomUUID();
      db.query("INSERT INTO users (uid, name, email) VALUES (?, ?, ?)", [
        uid,
        name,
        email,
      ]);

      const user = db.query("SELECT * FROM users WHERE uid = ?", [uid]);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user.rows[0],
      });
    } catch (error) {
      if (error.message.includes("UNIQUE constraint")) {
        return res.status(409).json({
          success: false,
          error: "Email already exists",
        });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// Simple chat controller
const chatController = {
  getUserChats: async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "userId parameter is required",
        });
      }

      const result = db.query(
        `
        SELECT 
          c.chat_id,
          c.created_at,
          CASE 
            WHEN c.user1_id = ? THEN u2.name
            ELSE u1.name
          END as partner_name,
          CASE 
            WHEN c.user1_id = ? THEN u2.uid
            ELSE u1.uid
          END as partner_id
        FROM chats c
        JOIN users u1 ON c.user1_id = u1.uid
        JOIN users u2 ON c.user2_id = u2.uid
        WHERE c.user1_id = ? OR c.user2_id = ?
        ORDER BY c.created_at DESC
      `,
        [userId, userId, userId, userId]
      );

      res.json({
        success: true,
        message: "Chats retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  createChat: async (req, res) => {
    try {
      const { user1Id, user2Id } = req.body;
      if (!user1Id || !user2Id) {
        return res.status(400).json({
          success: false,
          error: "user1Id and user2Id are required",
        });
      }

      // Check if chat exists
      const existing = db.query(
        `
        SELECT chat_id FROM chats 
        WHERE (user1_id = ? AND user2_id = ?) OR (user1_id = ? AND user2_id = ?)
      `,
        [user1Id, user2Id, user2Id, user1Id]
      );

      if (existing.rows.length > 0) {
        return res.json({
          success: true,
          message: "Chat already exists",
          data: existing.rows[0],
        });
      }

      const chatId = require("crypto").randomUUID();
      db.query(
        "INSERT INTO chats (chat_id, user1_id, user2_id) VALUES (?, ?, ?)",
        [chatId, user1Id, user2Id]
      );

      const chat = db.query("SELECT * FROM chats WHERE chat_id = ?", [chatId]);

      res.status(201).json({
        success: true,
        message: "Chat created successfully",
        data: chat.rows[0],
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// Simple message controller
const messageController = {
  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;

      const result = db.query(
        `
        SELECT 
          m.message_id,
          m.content,
          m.sent_at,
          u.name as sender_name,
          u.uid as sender_id
        FROM messages m
        JOIN users u ON m.sent_by = u.uid
        WHERE m.chat_id = ?
        ORDER BY m.sent_at ASC
      `,
        [chatId]
      );

      res.json({
        success: true,
        message: "Messages retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  sendMessage: async (req, res) => {
    try {
      const { chatId, userId, content } = req.body;
      if (!chatId || !userId || !content) {
        return res.status(400).json({
          success: false,
          error: "chatId, userId, and content are required",
        });
      }

      const messageId = require("crypto").randomUUID();
      db.query(
        "INSERT INTO messages (message_id, chat_id, sent_by, content) VALUES (?, ?, ?, ?)",
        [messageId, chatId, userId, content]
      );

      const message = db.query(
        `
        SELECT 
          m.message_id,
          m.content,
          m.sent_at,
          u.name as sender_name,
          u.uid as sender_id
        FROM messages m
        JOIN users u ON m.sent_by = u.uid
        WHERE m.message_id = ?
      `,
        [messageId]
      );

      res.status(201).json({
        success: true,
        message: "Message sent successfully",
        data: message.rows[0],
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Chat Server API - UUID Schema Demo 🚀",
    version: "2.0.0",
    demo_data: {
      users: 3,
      chats: 1,
      messages: 2,
    },
    endpoints: {
      users: {
        "GET /api/users": "Get all users",
        "POST /api/users": "Create user",
      },
      chats: {
        "GET /api/chats?userId=uuid": "Get user chats",
        "POST /api/chats": "Create chat",
      },
      messages: {
        "GET /api/chats/:chatId/messages": "Get chat messages",
        "POST /api/messages": "Send message",
      },
    },
    sample_user_ids: {
      john: sampleData.user1Id,
      jane: sampleData.user2Id,
      bob: sampleData.user3Id,
    },
    sample_chat_id: sampleData.chatId,
    test_commands: [
      `curl -X GET "http://localhost:3000/api/users"`,
      `curl -X GET "http://localhost:3000/api/chats?userId=${sampleData.user1Id}"`,
      `curl -X GET "http://localhost:3000/api/chats/${sampleData.chatId}/messages"`,
      `curl -X POST "http://localhost:3000/api/users" -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com"}'`,
      `curl -X POST "http://localhost:3000/api/messages" -H "Content-Type: application/json" -d '{"chatId":"${sampleData.chatId}","userId":"${sampleData.user1Id}","content":"Test message from API!"}'`,
    ],
  });
});

// API Routes
app.get("/api/users", userController.getAllUsers);
app.post("/api/users", userController.createUser);
app.get("/api/chats", chatController.getUserChats);
app.post("/api/chats", chatController.createChat);
app.get("/api/chats/:chatId/messages", messageController.getChatMessages);
app.post("/api/messages", messageController.sendMessage);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🌟 Server running on http://localhost:${PORT}`);
  console.log(
    "📖 Visit http://localhost:3000 for API documentation and test commands\n"
  );

  console.log("🧪 Quick Test Commands:");
  console.log(`curl -X GET "http://localhost:${PORT}/api/users"`);
  console.log(
    `curl -X GET "http://localhost:${PORT}/api/chats?userId=${sampleData.user1Id}"`
  );
  console.log(
    `curl -X GET "http://localhost:${PORT}/api/chats/${sampleData.chatId}/messages"`
  );
  console.log("");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🔄 Shutting down server...");
  db.close();
  process.exit(0);
});
