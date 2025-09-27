// Simple SQLite setup for testing UUID schema locally
const Database = require("better-sqlite3");
const path = require("path");
const { randomUUID } = require("crypto");

// Create SQLite database for testing
const dbPath = path.join(__dirname, "../../chatapp_test.db");
const db = new Database(dbPath);

// Enable foreign keys
db.pragma("foreign_keys = ON");

// Initialize tables with UUID support (using TEXT for UUIDs in SQLite)
const initializeTables = () => {
  console.log("🔄 Initializing SQLite database for testing...");

  try {
    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Chats table (1-on-1)
    db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        chat_id TEXT PRIMARY KEY,
        user1_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
        user2_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      )
    `);

    // Messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        message_id TEXT PRIMARY KEY,
        chat_id TEXT REFERENCES chats(chat_id) ON DELETE CASCADE,
        sent_by TEXT REFERENCES users(uid) ON DELETE CASCADE,
        content TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Last messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS last_messages (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
        partner_id TEXT REFERENCES users(uid) ON DELETE CASCADE,
        chat_id TEXT REFERENCES chats(chat_id) ON DELETE CASCADE,
        last_chat TEXT,
        last_chat_date DATETIME,
        UNIQUE(user_id, partner_id)
      )
    `);

    // Create indexes
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at)`
    );
    db.exec(
      `CREATE INDEX IF NOT EXISTS idx_last_messages_user_id ON last_messages(user_id)`
    );

    // Insert sample data
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    const user3Id = randomUUID();

    // Check if data already exists
    const existingUsers = db
      .prepare("SELECT COUNT(*) as count FROM users")
      .get();

    if (existingUsers.count === 0) {
      const insertUser = db.prepare(`
        INSERT INTO users (uid, name, email) VALUES (?, ?, ?)
      `);

      insertUser.run(user1Id, "John Doe", "john@example.com");
      insertUser.run(user2Id, "Jane Smith", "jane@example.com");
      insertUser.run(user3Id, "Bob Wilson", "bob@example.com");

      // Create sample chat
      const chatId = randomUUID();
      const insertChat = db.prepare(`
        INSERT INTO chats (chat_id, user1_id, user2_id) VALUES (?, ?, ?)
      `);
      insertChat.run(chatId, user1Id, user2Id);

      // Insert sample messages
      const insertMessage = db.prepare(`
        INSERT INTO messages (message_id, chat_id, sent_by, content) VALUES (?, ?, ?, ?)
      `);
      insertMessage.run(randomUUID(), chatId, user1Id, "Hello Jane!");
      insertMessage.run(randomUUID(), chatId, user2Id, "Hi John! How are you?");

      console.log("✅ Sample data inserted");
    } else {
      // Get existing data
      const users = db
        .prepare("SELECT uid, name FROM users ORDER BY created_at LIMIT 3")
        .all();
      const chats = db.prepare("SELECT chat_id FROM chats LIMIT 1").all();

      if (users.length >= 2) {
        const user1Id = users[0].uid;
        const user2Id = users[1].uid;
        const user3Id = users.length > 2 ? users[2].uid : user2Id;
        const chatId = chats.length > 0 ? chats[0].chat_id : randomUUID();

        console.log("✅ Using existing sample data");
      }
    }

    console.log("✅ SQLite database initialized successfully");
    console.log(`📍 Database location: ${dbPath}`);
    console.log("🧪 Sample data created:");
    console.log(`   - User 1: ${user1Id} (John Doe)`);
    console.log(`   - User 2: ${user2Id} (Jane Smith)`);
    console.log(`   - User 3: ${user3Id} (Bob Wilson)`);
    console.log(`   - Chat: ${chatId} (John & Jane)`);

    return { user1Id, user2Id, user3Id, chatId };
  } catch (error) {
    console.error("❌ Error initializing database:", error.message);
    throw error;
  }
};

// Query function to mimic PostgreSQL pool.query
const query = (sql, params = []) => {
  try {
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      const stmt = db.prepare(sql);
      const rows = stmt.all(...params);
      return { rows };
    } else {
      const stmt = db.prepare(sql);
      const info = stmt.run(...params);

      // For INSERT with RETURNING, we need to get the inserted row
      if (sql.includes("RETURNING") || sql.includes("returning")) {
        const lastInsertRowid = info.lastInsertRowid;
        // For UUID primary keys, we need a different approach
        // Return a mock result for now
        return { rows: [{ success: true }] };
      }

      return { rows: [], rowCount: info.changes };
    }
  } catch (error) {
    throw error;
  }
};

// Mock connect function
const connect = () => {
  return {
    query: (sql, params) => query(sql, params),
    release: () => {},
  };
};

module.exports = {
  query,
  connect,
  initializeTables,
  close: () => db.close(),
  db, // Expose raw database for testing
};
