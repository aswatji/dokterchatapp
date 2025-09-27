const express = require('express');
const router = express.Router();
const messageController = require('../controllers/newMessageController');

// GET /api/v2/chats/:chatId/messages - Get messages for a specific chat
router.get('/:chatId/messages', messageController.getChatMessages);

module.exports = router;