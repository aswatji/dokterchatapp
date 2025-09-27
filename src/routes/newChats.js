const express = require("express");
const router = express.Router();
const chatController = require("../controllers/newChatController");

// GET /api/v2/chats?userId=xxx - Get user's chats
router.get("/", chatController.getUserChats);

// POST /api/v2/chats - Create new chat or get existing chat between two users
router.post("/", chatController.createOrGetChat);

// GET /api/v2/chats/:id - Get chat by ID
router.get("/:id", chatController.getChatById);

// DELETE /api/v2/chats/:id - Delete chat
router.delete("/:id", chatController.deleteChat);

module.exports = router;
