const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('🗄️ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Initialize database tables with UUID schema
const initializeTables = async () => {
  try {
    console.log('🔄 Initializing database tables...');

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
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_last_messages_user_id ON last_messages(user_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chats_user1_id ON chats(user1_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_chats_user2_id ON chats(user2_id)');
    
    console.log('✅ Database tables initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing database tables:', error.message);
  }
};

// Initialize tables when module is loaded
initializeTables();

module.exports = pool;