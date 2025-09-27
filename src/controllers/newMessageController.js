const db = require("../config/database");

const messageController = {
  // Get messages for a chat
  getChatMessages: async (req, res) => {
    try {
      const { chatId } = req.params;
      const { limit = 50, offset = 0 } = req.query;

      console.log(`🔍 Getting messages for chat ID: ${chatId}`);

      const result = await db.query(
        `
        SELECT 
          m.message_id,
          m.content,
          m.sent_at,
          u.uid as user_id,
          u.name as user_name,
          u.email as user_email
        FROM messages m
        JOIN users u ON m.sent_by = u.uid
        WHERE m.chat_id = $1
        ORDER BY m.sent_at ASC
        LIMIT $2 OFFSET $3
      `,
        [chatId, limit, offset]
      );

      console.log(`✅ Found ${result.rows.length} messages for chat ${chatId}`);

      res.json({
        success: true,
        message: "Messages retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error getting messages:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
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
          error: "Validation error",
          message: "chatId, userId, and content are required",
        });
      }

      if (content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "Message content cannot be empty",
        });
      }

      // Start transaction
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        // Verify chat exists and user is participant
        const chatCheck = await client.query(
          `
          SELECT c.chat_id, c.user1_id, c.user2_id
          FROM chats c
          WHERE c.chat_id = $1 AND (c.user1_id = $2 OR c.user2_id = $2)
        `,
          [chatId, userId]
        );

        if (chatCheck.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            success: false,
            error: "Chat not found or access denied",
            message: "Chat does not exist or user is not a participant",
          });
        }

        const chat = chatCheck.rows[0];
        const partnerId =
          chat.user1_id === userId ? chat.user2_id : chat.user1_id;

        // Insert message
        const messageResult = await client.query(
          "INSERT INTO messages (chat_id, sent_by, content) VALUES ($1, $2, $3) RETURNING message_id, chat_id, sent_by, content, sent_at",
          [chatId, userId, content.trim()]
        );

        const message = messageResult.rows[0];

        // Update last_messages for both users
        await client.query(
          `
          INSERT INTO last_messages (user_id, partner_id, chat_id, last_chat, last_chat_date)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, partner_id)
          DO UPDATE SET 
            last_chat = EXCLUDED.last_chat,
            last_chat_date = EXCLUDED.last_chat_date,
            chat_id = EXCLUDED.chat_id
        `,
          [userId, partnerId, chatId, content.trim(), message.sent_at]
        );

        await client.query(
          `
          INSERT INTO last_messages (user_id, partner_id, chat_id, last_chat, last_chat_date)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (user_id, partner_id)
          DO UPDATE SET 
            last_chat = EXCLUDED.last_chat,
            last_chat_date = EXCLUDED.last_chat_date,
            chat_id = EXCLUDED.chat_id
        `,
          [partnerId, userId, chatId, content.trim(), message.sent_at]
        );

        await client.query("COMMIT");

        // Get user info for response
        const userInfo = await db.query(
          "SELECT uid, name, email FROM users WHERE uid = $1",
          [userId]
        );

        const responseMessage = {
          ...message,
          user_id: userId,
          user_name: userInfo.rows[0].name,
          user_email: userInfo.rows[0].email,
        };

        console.log(`✅ Message sent: ${message.message_id}`);

        res.status(201).json({
          success: true,
          message: "Message sent successfully",
          data: responseMessage,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("❌ Error sending message:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Get message by ID
  getMessageById: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Getting message ID: ${id}`);

      const result = await db.query(
        `
        SELECT 
          m.message_id,
          m.content,
          m.sent_at,
          m.chat_id,
          u.uid as user_id,
          u.name as user_name,
          u.email as user_email
        FROM messages m
        JOIN users u ON m.sent_by = u.uid
        WHERE m.message_id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Message not found: ${id}`);
        return res.status(404).json({
          success: false,
          error: "Message not found",
          message: `Message with ID ${id} does not exist`,
        });
      }

      console.log(
        `✅ Message found: ${result.rows[0].content.substring(0, 50)}...`
      );

      res.json({
        success: true,
        message: "Message retrieved successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error getting message:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Delete message
  deleteMessage: async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "userId is required",
        });
      }

      console.log(`🔍 Deleting message ${id} by user ${userId}`);

      // Verify user owns the message
      const result = await db.query(
        "DELETE FROM messages WHERE message_id = $1 AND sent_by = $2 RETURNING message_id, content",
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "Message not found or access denied",
          message:
            "Message does not exist or you do not have permission to delete it",
        });
      }

      console.log(`✅ Message deleted: ${id}`);

      res.json({
        success: true,
        message: "Message deleted successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error deleting message:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Get recent messages across all user's chats
  getRecentMessages: async (req, res) => {
    try {
      const { userId } = req.query;
      const { limit = 20 } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "userId query parameter is required",
        });
      }

      console.log(`🔍 Getting recent messages for user: ${userId}`);

      const result = await db.query(
        `
        SELECT 
          m.message_id,
          m.content,
          m.sent_at,
          m.chat_id,
          u.uid as sender_id,
          u.name as sender_name,
          CASE 
            WHEN c.user1_id = $1 THEN u2.name
            ELSE u1.name
          END as chat_partner_name
        FROM messages m
        JOIN chats c ON m.chat_id = c.chat_id
        JOIN users u ON m.sent_by = u.uid
        JOIN users u1 ON c.user1_id = u1.uid
        JOIN users u2 ON c.user2_id = u2.uid
        WHERE c.user1_id = $1 OR c.user2_id = $1
        ORDER BY m.sent_at DESC
        LIMIT $2
      `,
        [userId, limit]
      );

      console.log(`✅ Found ${result.rows.length} recent messages`);

      res.json({
        success: true,
        message: "Recent messages retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error getting recent messages:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },
};

module.exports = messageController;
