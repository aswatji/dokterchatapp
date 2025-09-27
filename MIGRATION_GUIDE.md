# Chat Server API - Database Migration Guide

## Schema Changes: Integer ID → UUID

Project ini telah diupdate untuk menggunakan UUID sebagai primary key untuk meningkatkan skalabilitas dan keamanan.

## Perbandingan Schema

### Schema Lama (v1) - Integer ID
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chats (
    id SERIAL PRIMARY KEY,
    name TEXT,
    type TEXT DEFAULT 'private',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_participants (
    id SERIAL PRIMARY KEY,
    chat_id INTEGER REFERENCES chats(id),
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Baru (v2) - UUID
```sql
CREATE TABLE users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(uid),
    user2_id UUID REFERENCES users(uid),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(chat_id),
    sent_by UUID REFERENCES users(uid),
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE last_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(uid),
    partner_id UUID REFERENCES users(uid),
    chat_id UUID REFERENCES chats(chat_id),
    last_chat TEXT,
    last_chat_date TIMESTAMP,
    UNIQUE(user_id, partner_id)
);
```

## Cara Migrasi

### 1. Backup Database Lama
```bash
pg_dump -h your_host -U your_user -d your_database > backup_old_schema.sql
```

### 2. Jalankan Schema Baru
```bash
psql -h your_host -U your_user -d your_database -f database_schema.sql
```

### 3. Update Environment Variables
File `.env` sudah sesuai, tidak perlu diubah:
```env
DATABASE_URL=postgresql://postgres:36e872facb74b054@srv-captain--dokterchat:5432/postgres
PORT=3000
NODE_ENV=development
```

## API Endpoints

### V1 Endpoints (Integer ID Schema) - Masih Berfungsi
```
GET    /api/users                 - Get all users
POST   /api/users                 - Create user
GET    /api/users/:id             - Get user by ID
PUT    /api/users/:id             - Update user
DELETE /api/users/:id             - Delete user

GET    /api/chats?userId=123      - Get user's chats
POST   /api/chats                 - Create chat
GET    /api/chats/:id             - Get chat by ID
POST   /api/chats/:id/join        - Join chat
POST   /api/chats/:id/leave       - Leave chat
```

### V2 Endpoints (UUID Schema) - Baru
```
GET    /api/users                        - Get all users (updated)
POST   /api/users                        - Create user (updated)
GET    /api/users/:uid                   - Get user by UID (updated)
PUT    /api/users/:uid                   - Update user (updated)
DELETE /api/users/:uid                   - Delete user (updated)

GET    /api/v2/chats?userId=uuid         - Get user's chats
POST   /api/v2/chats                     - Create/get chat between 2 users
GET    /api/v2/chats/:chat_id            - Get chat by ID
DELETE /api/v2/chats/:chat_id           - Delete chat

GET    /api/v2/chats/:chat_id/messages   - Get chat messages
POST   /api/v2/messages                  - Send message
GET    /api/v2/messages/:message_id      - Get message by ID
DELETE /api/v2/messages/:message_id     - Delete message
GET    /api/v2/messages/recent?userId=uuid - Get recent messages
```

## Contoh Request V2

### 1. Create User
```bash
POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com"
}

Response:
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "uid": "550e8400-e29b-41d4-a716-446655440001",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2025-09-27T10:30:00.000Z"
  }
}
```

### 2. Create/Get Chat
```bash
POST /api/v2/chats
{
  "user1Id": "550e8400-e29b-41d4-a716-446655440001",
  "user2Id": "550e8400-e29b-41d4-a716-446655440002"
}

Response:
{
  "success": true,
  "message": "Chat created successfully",
  "data": {
    "chat_id": "660e8400-e29b-41d4-a716-446655440001",
    "user1_id": "550e8400-e29b-41d4-a716-446655440001",
    "user2_id": "550e8400-e29b-41d4-a716-446655440002",
    "created_at": "2025-09-27T10:35:00.000Z"
  }
}
```

### 3. Send Message
```bash
POST /api/v2/messages
{
  "chatId": "660e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "content": "Hello there!"
}

Response:
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "message_id": "770e8400-e29b-41d4-a716-446655440001",
    "chat_id": "660e8400-e29b-41d4-a716-446655440001",
    "sent_by": "550e8400-e29b-41d4-a716-446655440001",
    "content": "Hello there!",
    "sent_at": "2025-09-27T10:40:00.000Z",
    "user_id": "550e8400-e29b-41d4-a716-446655440001",
    "user_name": "John Doe",
    "user_email": "john@example.com"
  }
}
```

## Keuntungan Schema UUID

1. **Skalabilitas**: UUID tidak bergantung pada sequence, cocok untuk distributed systems
2. **Keamanan**: Tidak bisa ditebak seperti integer sequential
3. **Merging**: Mudah menggabungkan database dari berbagai server
4. **Global Uniqueness**: Unik secara global, tidak hanya dalam satu tabel

## Testing

### Test dengan curl:
```bash
# Test V2 API
curl -X GET "http://localhost:3000/api/"

# Create user
curl -X POST "http://localhost:3000/api/users" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Create chat
curl -X POST "http://localhost:3000/api/v2/chats" \
  -H "Content-Type: application/json" \
  -d '{"user1Id":"user_uid_1","user2Id":"user_uid_2"}'
```

## Rollback Plan

Jika perlu kembali ke schema lama:
1. Restore dari backup: `psql -d your_database < backup_old_schema.sql`
2. Gunakan endpoint V1 saja
3. Comment out V2 routes di `src/routes/index.js`

## File yang Berubah

- ✅ `database_schema.sql` - Schema baru dengan UUID
- ✅ `src/controllers/userController.js` - Updated untuk UUID
- ✅ `src/controllers/newChatController.js` - Controller baru untuk chat 1-on-1
- ✅ `src/controllers/newMessageController.js` - Controller baru dengan UUID
- ✅ `src/routes/newChats.js` - Routes baru untuk v2 chats
- ✅ `src/routes/newMessages.js` - Routes baru untuk v2 messages
- ✅ `src/routes/chatMessages.js` - Routes untuk chat messages
- ✅ `src/routes/index.js` - Updated dengan v2 routes
- ✅ `MIGRATION_GUIDE.md` - Dokumentasi ini