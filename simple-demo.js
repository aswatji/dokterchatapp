require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { randomUUID } = require('crypto');

// In-memory database untuk demo sederhana
let users = [
  {
    uid: '550e8400-e29b-41d4-a716-446655440001',
    name: 'John Doe',
    email: 'john@example.com',
    created_at: new Date().toISOString()
  },
  {
    uid: '550e8400-e29b-41d4-a716-446655440002',
    name: 'Jane Smith',
    email: 'jane@example.com',
    created_at: new Date().toISOString()
  },
  {
    uid: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Bob Wilson',
    email: 'bob@example.com',
    created_at: new Date().toISOString()
  }
];

let chats = [
  {
    chat_id: '660e8400-e29b-41d4-a716-446655440001',
    user1_id: '550e8400-e29b-41d4-a716-446655440001',
    user2_id: '550e8400-e29b-41d4-a716-446655440002',
    created_at: new Date().toISOString()
  }
];

let messages = [
  {
    message_id: '770e8400-e29b-41d4-a716-446655440001',
    chat_id: '660e8400-e29b-41d4-a716-446655440001',
    sent_by: '550e8400-e29b-41d4-a716-446655440001',
    content: 'Hello Jane!',
    sent_at: new Date().toISOString()
  },
  {
    message_id: '770e8400-e29b-41d4-a716-446655440002',
    chat_id: '660e8400-e29b-41d4-a716-446655440001',
    sent_by: '550e8400-e29b-41d4-a716-446655440002',
    content: 'Hi John! How are you?',
    sent_at: new Date().toISOString()
  }
];

console.log('🚀 Starting Chat Server - UUID Schema Demo\n');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.path}${req.query.userId ? ` (userId: ${req.query.userId})` : ''}`);
  next();
});

// Controllers
const userController = {
  getAllUsers: (req, res) => {
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      count: users.length,
      data: users
    });
  },

  createUser: (req, res) => {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Check if email exists
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    const newUser = {
      uid: randomUUID(),
      name,
      email,
      created_at: new Date().toISOString()
    };

    users.push(newUser);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  }
};

const chatController = {
  getUserChats: (req, res) => {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId parameter is required'
      });
    }

    // Find user's chats
    const userChats = chats.filter(chat => 
      chat.user1_id === userId || chat.user2_id === userId
    ).map(chat => {
      // Get partner info
      const partnerId = chat.user1_id === userId ? chat.user2_id : chat.user1_id;
      const partner = users.find(u => u.uid === partnerId);
      
      return {
        chat_id: chat.chat_id,
        created_at: chat.created_at,
        partner_id: partnerId,
        partner_name: partner ? partner.name : 'Unknown'
      };
    });

    res.json({
      success: true,
      message: 'Chats retrieved successfully',
      count: userChats.length,
      data: userChats
    });
  },

  createOrGetChat: (req, res) => {
    const { user1Id, user2Id } = req.body;
    
    if (!user1Id || !user2Id) {
      return res.status(400).json({
        success: false,
        error: 'user1Id and user2Id are required'
      });
    }

    if (user1Id === user2Id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot create chat with yourself'
      });
    }

    // Check if chat exists
    const existingChat = chats.find(chat => 
      (chat.user1_id === user1Id && chat.user2_id === user2Id) ||
      (chat.user1_id === user2Id && chat.user2_id === user1Id)
    );

    if (existingChat) {
      return res.json({
        success: true,
        message: 'Chat already exists',
        data: existingChat
      });
    }

    // Create new chat
    const newChat = {
      chat_id: randomUUID(),
      user1_id: user1Id,
      user2_id: user2Id,
      created_at: new Date().toISOString()
    };

    chats.push(newChat);

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: newChat
    });
  }
};

const messageController = {
  getChatMessages: (req, res) => {
    const { chatId } = req.params;
    
    // Get messages for this chat
    const chatMessages = messages.filter(msg => msg.chat_id === chatId)
      .map(msg => {
        const sender = users.find(u => u.uid === msg.sent_by);
        return {
          ...msg,
          sender_name: sender ? sender.name : 'Unknown',
          sender_id: msg.sent_by
        };
      })
      .sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));

    res.json({
      success: true,
      message: 'Messages retrieved successfully',
      count: chatMessages.length,
      data: chatMessages
    });
  },

  sendMessage: (req, res) => {
    const { chatId, userId, content } = req.body;
    
    if (!chatId || !userId || !content) {
      return res.status(400).json({
        success: false,
        error: 'chatId, userId, and content are required'
      });
    }

    // Check if chat exists and user is participant
    const chat = chats.find(c => c.chat_id === chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }

    if (chat.user1_id !== userId && chat.user2_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'User is not a participant in this chat'
      });
    }

    const sender = users.find(u => u.uid === userId);
    const newMessage = {
      message_id: randomUUID(),
      chat_id: chatId,
      sent_by: userId,
      content: content.trim(),
      sent_at: new Date().toISOString(),
      sender_name: sender ? sender.name : 'Unknown',
      sender_id: userId
    };

    messages.push(newMessage);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: newMessage
    });
  }
};

// Routes
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Chat Server API - UUID Schema Demo',
    version: '2.0.0',
    schema: 'UUID-based for better scalability',
    demo_data: {
      users: users.length,
      chats: chats.length,
      messages: messages.length
    },
    endpoints: {
      users: {
        'GET /api/users': 'Get all users',
        'POST /api/users': 'Create user'
      },
      chats: {
        'GET /api/chats?userId=uuid': 'Get user chats',
        'POST /api/chats': 'Create/get chat between 2 users'
      },
      messages: {
        'GET /api/chats/:chatId/messages': 'Get chat messages',
        'POST /api/messages': 'Send message'
      }
    },
    sample_data: {
      users: users.map(u => ({ uid: u.uid, name: u.name })),
      chat_id: chats[0]?.chat_id
    },
    test_commands: [
      'curl -X GET "http://localhost:3000/api/users"',
      `curl -X GET "http://localhost:3000/api/chats?userId=${users[0].uid}"`,
      `curl -X GET "http://localhost:3000/api/chats/${chats[0]?.chat_id}/messages"`,
      'curl -X POST "http://localhost:3000/api/users" -H "Content-Type: application/json" -d \'{"name":"Test User","email":"test@example.com"}\'',
      `curl -X POST "http://localhost:3000/api/messages" -H "Content-Type: application/json" -d '{"chatId":"${chats[0]?.chat_id}","userId":"${users[0].uid}","content":"Test message from API!"}'`
    ]
  });
});

// API Routes
app.get('/api/users', userController.getAllUsers);
app.post('/api/users', userController.createUser);
app.get('/api/chats', chatController.getUserChats);
app.post('/api/chats', chatController.createOrGetChat);
app.get('/api/chats/:chatId/messages', messageController.getChatMessages);
app.post('/api/messages', messageController.sendMessage);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Database initialized with sample UUID data`);
  console.log(`📊 Demo data: ${users.length} users, ${chats.length} chats, ${messages.length} messages`);
  console.log(`\n🌟 Server running on http://localhost:${PORT}`);
  console.log('📖 Visit http://localhost:3000 for API documentation\n');
  
  console.log('🧪 Quick Test Commands:');
  console.log(`curl -X GET "http://localhost:${PORT}/api/users"`);
  console.log(`curl -X GET "http://localhost:${PORT}/api/chats?userId=${users[0].uid}"`);
  console.log(`curl -X GET "http://localhost:${PORT}/api/chats/${chats[0].chat_id}/messages"`);
  console.log('');
});