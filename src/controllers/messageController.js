const db = require('../config/database');

const messageController = {
  // Get messages for a chat
  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const { limit = 50, offset = 0 } = req.query;
      
      console.log(`🔍 Getting messages for chat ID: ${chatId}`);

      const result = await db.query(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.chat_id = $1
        ORDER BY m.created_at DESC
        LIMIT $2 OFFSET $3
      `, [chatId, limit, offset]);
      
      console.log(`✅ Found ${result.rows.length} messages for chat ${chatId}`);
      
      res.json({
        success: true,
        message: 'Messages retrieved successfully',
        count: result.rows.length,
        data: result.rows.reverse() // Reverse to show oldest first
      });
    } catch (error) {
      console.error('❌ Error getting messages:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Send new message
  sendMessage: async (req, res) => {
    try {
      const { chatId, userId, content } = req.body;
      
      console.log(`🔍 Sending message to chat ${chatId} from user ${userId}`);
      
      // Validation
      if (!chatId || !userId || !content) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'chatId, userId, and content are required'
        });
      }

      if (content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Message content cannot be empty'
        });
      }

      // Check if user is participant in chat
      const participantCheck = await db.query(
        'SELECT 1 FROM chat_participants WHERE chat_id = $1 AND user_id = $2',
        [chatId, userId]
      );

      if (participantCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'User is not a participant in this chat'
        });
      }

      // Insert message
      const result = await db.query(`
        INSERT INTO messages (chat_id, user_id, content) 
        VALUES ($1, $2, $3) 
        RETURNING id, chat_id, user_id, content, created_at
      `, [chatId, userId, content.trim()]);

      // Get user info for complete response
      const userResult = await db.query(
        'SELECT name, email FROM users WHERE id = $1',
        [userId]
      );

      const message = {
        ...result.rows[0],
        user_name: userResult.rows[0]?.name,
        user_email: userResult.rows[0]?.email
      };

      console.log(`✅ Message sent with ID: ${message.id}`);
      
      res.status(201).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Get message by ID
  getMessageById: async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Getting message ID: ${id}`);

      const result = await db.query(`
        SELECT 
          m.id,
          m.content,
          m.created_at,
          m.chat_id,
          u.id as user_id,
          u.name as user_name,
          u.email as user_email
        FROM messages m
        JOIN users u ON m.user_id = u.id
        WHERE m.id = $1
      `, [id]);

      if (result.rows.length === 0) {
        console.log(`❌ Message not found: ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          message: `Message with ID ${id} does not exist`
        });
      }

      console.log(`✅ Message found: ${result.rows[0].content.substring(0, 50)}...`);
      
      res.json({
        success: true,
        message: 'Message retrieved successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error getting message:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Update message
  updateMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      
      console.log(`🔍 Updating message ID: ${id}`);

      // Validation
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Content is required and cannot be empty'
        });
      }

      const result = await db.query(
        'UPDATE messages SET content = $1 WHERE id = $2 RETURNING id, content, created_at, chat_id, user_id',
        [content.trim(), id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Message not found for update: ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          message: `Message with ID ${id} does not exist`
        });
      }

      console.log(`✅ Message updated: ${id}`);
      
      res.json({
        success: true,
        message: 'Message updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error updating message:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  },

  // Delete message
  deleteMessage: async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`🔍 Deleting message ID: ${id}`);

      const result = await db.query(
        'DELETE FROM messages WHERE id = $1 RETURNING id, content, chat_id, user_id',
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Message not found for deletion: ${id}`);
        return res.status(404).json({
          success: false,
          error: 'Message not found',
          message: `Message with ID ${id} does not exist`
        });
      }

      console.log(`✅ Message deleted: ${id}`);
      
      res.json({
        success: true,
        message: 'Message deleted successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('❌ Error deleting message:', error.message);
      res.status(500).json({
        success: false,
        error: 'Database error',
        message: error.message
      });
    }
  }
};

module.exports = messageController;