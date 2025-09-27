const db = require("../config/database");

const userController = {
  // Get all users
  getAllUsers: async (req, res) => {
    try {
      console.log("🔍 Getting all users...");

      const result = await db.query(
        "SELECT uid, name, email, created_at FROM users ORDER BY created_at DESC"
      );

      console.log(`✅ Found ${result.rows.length} users`);

      res.json({
        success: true,
        message: "Users retrieved successfully",
        count: result.rows.length,
        data: result.rows,
      });
    } catch (error) {
      console.error("❌ Error getting users:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Create new user
  createUser: async (req, res) => {
    try {
      const { name, email } = req.body;

      console.log(`🔍 Creating user: ${name} (${email})`);

      // Validation
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "Name and email are required",
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "Invalid email format",
        });
      }

      const result = await db.query(
        "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING uid, name, email, created_at",
        [name.trim(), email.toLowerCase().trim()]
      );

      console.log(`✅ User created with UID: ${result.rows[0].uid}`);

      res.status(201).json({
        success: true,
        message: "User created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error creating user:", error.message);

      // Handle duplicate email
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "Duplicate email",
          message: "A user with this email already exists",
        });
      }

      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Get user by ID
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Getting user ID: ${id}`);

      const result = await db.query(
        "SELECT uid, name, email, created_at FROM users WHERE uid = $1",
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ User not found: ${id}`);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: `User with ID ${id} does not exist`,
        });
      }

      console.log(`✅ User found: ${result.rows[0].name}`);

      res.json({
        success: true,
        message: "User retrieved successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error getting user:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Update user
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email } = req.body;

      console.log(`🔍 Updating user ID: ${id}`);

      // Validation
      if (!name && !email) {
        return res.status(400).json({
          success: false,
          error: "Validation error",
          message: "At least name or email must be provided",
        });
      }

      // Build dynamic query
      let query = "UPDATE users SET ";
      let params = [];
      let paramIndex = 1;

      if (name) {
        query += `name = $${paramIndex}, `;
        params.push(name.trim());
        paramIndex++;
      }

      if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return res.status(400).json({
            success: false,
            error: "Validation error",
            message: "Invalid email format",
          });
        }
        query += `email = $${paramIndex}, `;
        params.push(email.toLowerCase().trim());
        paramIndex++;
      }

      // Remove trailing comma and space
      query = query.slice(0, -2);
      query += ` WHERE uid = $${paramIndex} RETURNING uid, name, email, created_at`;
      params.push(id);

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        console.log(`❌ User not found for update: ${id}`);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: `User with ID ${id} does not exist`,
        });
      }

      console.log(`✅ User updated: ${result.rows[0].name}`);

      res.json({
        success: true,
        message: "User updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error updating user:", error.message);

      // Handle duplicate email
      if (error.code === "23505") {
        return res.status(409).json({
          success: false,
          error: "Duplicate email",
          message: "A user with this email already exists",
        });
      }

      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },

  // Delete user
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      console.log(`🔍 Deleting user ID: ${id}`);

      const result = await db.query(
        "DELETE FROM users WHERE uid = $1 RETURNING uid, name, email",
        [id]
      );

      if (result.rows.length === 0) {
        console.log(`❌ User not found for deletion: ${id}`);
        return res.status(404).json({
          success: false,
          error: "User not found",
          message: `User with ID ${id} does not exist`,
        });
      }

      console.log(`✅ User deleted: ${result.rows[0].name}`);

      res.json({
        success: true,
        message: "User deleted successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("❌ Error deleting user:", error.message);
      res.status(500).json({
        success: false,
        error: "Database error",
        message: error.message,
      });
    }
  },
};

module.exports = userController;
