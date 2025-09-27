const { Pool } = require("pg");

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on("connect", () => {
  console.log("🗄️ Connected to PostgreSQL database");
});

pool.on("error", (err) => {
  console.error("❌ Database connection error:", err);
});

// Initialize database tables with UUID schema
const initializeTables = async () => {
  try {
    console.log("🔄 Initializing database tables...");

    // Enable UUID extension
    await pool.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Users table with UUID
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Chats table with UUID (1-on-1 chat)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID REFERENCES users(uid) ON DELETE CASCADE,
        user2_id UUID REFERENCES users(uid) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user1_id, user2_id)
      )
    `);

    // Messages table with UUID
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
        sent_by UUID REFERENCES users(uid) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sent_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Last messages table for quick access
    await pool.query(`
      CREATE TABLE IF NOT EXISTS last_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(uid) ON DELETE CASCADE,
        partner_id UUID REFERENCES users(uid) ON DELETE CASCADE,
        chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
        last_chat TEXT,
        last_chat_date TIMESTAMP,
        UNIQUE(user_id, partner_id)
      )
    `);

    // Create indexes for better performance
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_last_messages_user_id ON last_messages(user_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON chats(user1_id)`
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON chats(user2_id)`
    );

    // Also create legacy tables for backward compatibility (v1)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS old_users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS old_chats (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        type VARCHAR(50) DEFAULT 'private',
        created_by INTEGER REFERENCES old_users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS old_chat_participants (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES old_chats(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES old_users(id) ON DELETE CASCADE,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(chat_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS old_messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER REFERENCES old_chats(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES old_users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database tables initialized successfully");
    console.log("📊 Available schemas:");
    console.log("   - UUID Schema (v2): users, chats, messages, last_messages");
    console.log(
      "   - Legacy Schema (v1): old_users, old_chats, old_chat_participants, old_messages"
    );
  } catch (error) {
    console.error("❌ Error initializing database tables:", error.message);
    throw error;
  }
};

// Test database connection
const testConnection = async () => {
  try {
    const result = await pool.query("SELECT NOW()");
    console.log("🔗 Database connection test successful:", result.rows[0].now);
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error.message);
    return false;
  }
};

// Get database info
const getDatabaseInfo = async () => {
  try {
    const versionResult = await pool.query("SELECT version()");
    const extensionsResult = await pool.query(`
      SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto')
    `);

    return {
      version: versionResult.rows[0].version,
      extensions: extensionsResult.rows.map((row) => row.extname),
    };
  } catch (error) {
    console.error("❌ Error getting database info:", error.message);
    return null;
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  connect: () => pool.connect(),
  end: () => pool.end(),
  initializeTables,
  testConnection,
  getDatabaseInfo,
};
