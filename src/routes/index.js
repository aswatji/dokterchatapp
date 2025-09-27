const express = require('express');
const router = express.Router();

// Import route modules
const userRoutes = require('./users');
const chatRoutes = require('./chats');
const messageRoutes = require('./messages');

// Use routes
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/messages', messageRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    message: 'Chat Server API is running!',
    version: '1.0.0',
    endpoints: {
      users: '/api/users',
      chats: '/api/chats',
      messages: '/api/messages'
    },
    documentation: {
      users: 'GET /api/users - Get all users, POST /api/users - Create user',
      chats: 'GET /api/chats - Get user chats, POST /api/chats - Create chat',
      messages: 'GET /api/messages/:chatId - Get chat messages, POST /api/messages - Send message'
    }
  });
});

module.exports = router;