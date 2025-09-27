const express = require("express");
const router = express.Router();
const messageController = require("../controllers/newMessageController");

// GET /api/v2/messages/recent?userId=xxx - Get recent messages for user
router.get("/recent", messageController.getRecentMessages);

// GET /api/v2/messages/:id - Get message by ID
router.get("/:id", messageController.getMessageById);

// POST /api/v2/messages - Send new message
router.post("/", messageController.sendMessage);

// DELETE /api/v2/messages/:id - Delete message
router.delete("/:id", messageController.deleteMessage);

module.exports = router;
