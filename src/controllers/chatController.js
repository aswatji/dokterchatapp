const db = require('../config/database');

const chatController = {
  // Get user's chats
  getUserChats: async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'userId query parameter is required'
        });
      }

      console.log(`🔍 Getting chats for user ID: ${userId}`);

      const result = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.type,
          c.created_at,
          u.name as created_by_name,
          COUNT(cp.user_id) as participant_count
        FROM chats c
        JOIN chat_participants cp ON c.id = cp.chat_id
        LEFT JOIN users u ON c.created_by = u.id
        WHERE cp.user_id = $1
        GROUP BY c.id, c.name, c.type, c.created_at, u.name
        ORDER BY c.created_at DESC
      `, [userId]);
      
      console.log(`✅ Found ${result.rows.length} chats for user ${userId}`);
      
      res.json({
        success: true,
        message: 'Chats retrieved successfully',
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      console.error('❌ Error getting user chats:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Create new chat
  createChat: async (req, res) => {
    try {
      const { name, type = 'private', createdBy, participants = [] } = req.body;
      
      console.log(`🔍 Creating chat: ${name} by user ${createdBy}`);
      
      // Validation
      if (!createdBy) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'createdBy is required'
        });
      }

      // Start transaction
      const client = await db.connect();
      
      try {
        await client.query('BEGIN');

        // Create chat
        const chatResult = await client.query(
          'INSERT INTO chats (name, type, created_by) VALUES ($1, $2, $3) RETURNING id, name, type, created_by, created_at',
          [name, type, createdBy]
        );

        const chat = chatResult.rows[0];

        // Add creator as participant
        await client.query(
          'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2)',
          [chat.id, createdBy]
        );

        // Add other participants if provided
        if (participants.length > 0) {
          for (const participantId of participants) {
            if (participantId !== createdBy) { // Don't duplicate creator
              await client.query(
                'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2) ON CONFLICT (chat_id, user_id) DO NOTHING',
                [chat.id, participantId]
              );
            }
          }
        }

        await client.query('COMMIT');

        console.log(`✅ Chat created with ID: ${chat.id}`);
        
        res.status(201).json({
          success: true,
          message: 'Chat created successfully',
          data: chat
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('❌ Error creating chat:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Get chat by ID
  getChatById: async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Getting chat ID: ${id}`);

      const result = await db.query(`
        SELECT 
          c.id,
          c.name,
          c.type,
          c.created_at,
          u.name as created_by_name,
          u.id as created_by_id
        FROM chats c
        LEFT JOIN users u ON c.created_by = u.id
        WHERE c.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        console.log(`❌ Chat not found: ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Chat not found',
          message: `Chat with ID ${id} does not exist`
        });
      }

      // Get participants
      const participantsResult = await db.query(`
        SELECT 
          u.id,
          u.name,
          u.email,
          cp.joined_at
        FROM chat_participants cp
        JOIN users u ON cp.user_id = u.id
        WHERE cp.chat_id = $1
        ORDER BY cp.joined_at ASC
      `, [id]);

      const chat = {
        ...result.rows[0],
        participants: participantsResult.rows
      };

      console.log(`✅ Chat found: ${chat.name} with ${chat.participants.length} participants`);
      
      res.json({
        success: true,
        message: 'Chat retrieved successfully',
        data: chat
      });
    } catch (error) {
      console.error('❌ Error getting chat:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Join chat
  joinChat: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'userId is required'
        });
      }

      console.log(`🔍 User ${userId} joining chat ${id}`);

      // Check if chat exists
      const chatCheck = await db.query('SELECT id FROM chats WHERE id = $1', [id]);
      if (chatCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Chat not found',
          message: `Chat with ID ${id} does not exist`
        });
      }

      // Add user to chat (ON CONFLICT DO NOTHING prevents duplicate entries)
      const result = await db.query(
        'INSERT INTO chat_participants (chat_id, user_id) VALUES ($1, $2) ON CONFLICT (chat_id, user_id) DO NOTHING RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(409).json({
          success: false,
          error: 'Already joined',
          message: 'User is already a participant in this chat'
        });
      }

      console.log(`✅ User ${userId} joined chat ${id}`);
      
      res.json({
        success: true,
        message: 'Successfully joined chat',
        data: { chatId: id, userId: userId, joinedAt: result.rows[0].joined_at }
      });
    } catch (error) {
      console.error('❌ Error joining chat:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Leave chat
  leaveChat: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'userId is required'
        });
      }

      console.log(`🔍 User ${userId} leaving chat ${id}`);

      const result = await db.query(
        'DELETE FROM chat_participants WHERE chat_id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Not a participant',
          message: 'User is not a participant in this chat'
        });
      }

      console.log(`✅ User ${userId} left chat ${id}`);
      
      res.json({
        success: true,
        message: 'Successfully left chat',
        data: { chatId: id, userId: userId }
      });
    } catch (error) {
      console.error('❌ Error leaving chat:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }
};

module.exports = chatController;