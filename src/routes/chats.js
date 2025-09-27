const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// GET /api/chats - Get user's chats
router.get('/', chatController.getUserChats);

// POST /api/chats - Create new chat
router.post('/', chatController.createChat);

// GET /api/chats/:id - Get chat by ID
router.get('/:id', chatController.getChatById);

// POST /api/chats/:id/join - Join chat
router.post('/:id/join', chatController.joinChat);

// DELETE /api/chats/:id/leave - Leave chat
router.delete('/:id/leave', chatController.leaveChat);

module.exports = router;