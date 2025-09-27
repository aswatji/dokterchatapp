const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// GET /api/messages/:chatId - Get messages for a chat
router.get('/:chatId', messageController.getChatMessages);

// POST /api/messages - Send new message
router.post('/', messageController.sendMessage);

// GET /api/messages/message/:id - Get message by ID
router.get('/message/:id', messageController.getMessageById);

// PUT /api/messages/:id - Update message
router.put('/:id', messageController.updateMessage);

// DELETE /api/messages/:id - Delete message
router.delete('/:id', messageController.deleteMessage);

module.exports = router;