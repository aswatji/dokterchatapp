const db = require("../config/database");

const chatController = {
  // Get user's chats (all conversations with other users)
  getUserChats: async (req, res) => {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "userId query parameter is required",
        });
      }

      console.log(`🔍 Getting chats for user UID: ${userId}`);

      const result = await db.query(
        `
        SELECT 
          c.chat_id,
          c.created_at,
          CASE 
            WHEN c.user1_id = $1 THEN u2.uid
            ELSE u1.uid
          END as partner_id,
          CASE 
            WHEN c.user1_id = $1 THEN u2.name
            ELSE u1.name
          END as partner_name,
          CASE 
            WHEN c.user1_id = $1 THEN u2.email
            ELSE u1.email
          END as partner_email,
          lm.last_chat,
          lm.last_chat_date
        FROM chats c
        JOIN users u1 ON c.user1_id = u1.uid
        JOIN users u2 ON c.user2_id = u2.uid
        LEFT JOIN last_messages lm ON c.chat_id = lm.chat_id AND lm.user_id = $1
        WHERE c.user1_id = $1 OR c.user2_id = $1
        ORDER BY COALESCE(lm.last_chat_date, c.created_at) DESC
      `,
        [userId]
      );

      console.log(`✅ Found ${result.rows.length} chats for user ${userId}`);

      res.json({
        success: true,
        message: "Chats retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error getting user chats:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Create new chat or get existing chat between two users
  createOrGetChat: async (req, res) => {
    try {
      const { user1Id, user2Id } = req.body;

      console.log(`🔍 Creating/Getting chat between ${user1Id} and ${user2Id}`);

      // Validation
      if (!user1Id || !user2Id) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "user1Id and user2Id are required",
        });
      }

      if (user1Id === user2Id) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "Cannot create chat with yourself",
        });
      }

      // Check if chat already exists (either direction)
      let existingChat = await db.query(
        `
        SELECT chat_id, user1_id, user2_id, created_at
        FROM chats 
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      `,
        [user1Id, user2Id]
      );

      if (existingChat.rows.length > 0) {
        console.log(`✅ Found existing chat: ${existingChat.rows[0].chat_id}`);
        return res.json({
          success: true,
          message: "Chat already exists",
          data: existingChat.rows[0],
        });
      }

      // Verify both users exist
      const usersCheck = await db.query(
        "SELECT uid FROM users WHERE uid IN ($1, $2)",
        [user1Id, user2Id]
      );
      if (usersCheck.rows.length !== 2) {
        return res.status(404).json({
          success: false,
          error: "Users not found",
          message: "One or both users do not exist",
        });
      }

      // Create new chat (always put the smaller UUID first for consistency)
      const orderedIds = [user1Id, user2Id].sort();
      const chatResult = await db.query(
        "INSERT INTO chats (user1_id, user2_id) VALUES ($1, $2) RETURNING chat_id, user1_id, user2_id, created_at",
        orderedIds
      );

      const chat = chatResult.rows[0];

      console.log(`✅ Chat created with ID: ${chat.chat_id}`);

      res.status(201).json({
        success: true,
        message: "Chat created successfully",
        data: chat,
      });
    } catch (error) {
      console.error("❌ Error creating chat:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Get chat by ID with participants info
  getChatById: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Getting chat ID: ${id}`);

      const result = await db.query(
        `
        SELECT 
          c.chat_id,
          c.created_at,
          u1.uid as user1_id,
          u1.name as user1_name,
          u1.email as user1_email,
          u2.uid as user2_id,
          u2.name as user2_name,
          u2.email as user2_email
        FROM chats c
        JOIN users u1 ON c.user1_id = u1.uid
        JOIN users u2 ON c.user2_id = u2.uid
        WHERE c.chat_id = $1
      `,
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ Chat not found: ${id}`);
        return res.status(404).json({
          success: false,
          error: "Chat not found",
          message: `Chat with ID ${id} does not exist`,
        });
      }

      const chat = result.rows[0];

      console.log(
        `✅ Chat found between ${chat.user1_name} and ${chat.user2_name}`
      );

      res.json({
        success: true,
        message: "Chat retrieved successfully",
        data: chat,
      });
    } catch (error) {
      console.error("❌ Error getting chat:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Delete chat (and all its messages)
  deleteChat: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Deleting chat ID: ${id}`);

      // Start transaction
      const client = await db.connect();

      try {
        await client.query("BEGIN");

        // Delete from last_messages first
        await client.query("DELETE FROM last_messages WHERE chat_id = $1", [
          id,
        ]);

        // Delete messages
        await client.query("DELETE FROM messages WHERE chat_id = $1", [id]);

        // Delete chat
        const result = await client.query(
          "DELETE FROM chats WHERE chat_id = $1 RETURNING chat_id",
          [id]
        );

        if (result.rows.length === 0) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            success: false,
            error: "Chat not found",
            message: `Chat with ID ${id} does not exist`,
          });
        }

        await client.query("COMMIT");

        console.log(`✅ Chat deleted: ${id}`);

        res.json({
          success: true,
          message: "Chat and all messages deleted successfully",
          data: { chat_id: id },
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("❌ Error deleting chat:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },
};

module.exports = chatController;
