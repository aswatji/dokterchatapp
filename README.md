# Chat Server

A real-time chat server built with Node.js, Express, Socket.IO, and PostgreSQL.

## Features

- 🚀 Real-time messaging with Socket.IO
- 👥 User management (CRUD operations)
- 💬 Chat rooms with multiple participants  
- 📨 Message history and management
- 🔒 PostgreSQL database with proper relationships
- 🐳 Docker support for easy deployment
- ⚡ CapRover deployment ready

## Tech Stack

- **Backend**: Node.js, Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL with native pg driver
- **Deployment**: Docker, CapRover

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Chats
- `GET /api/chats?userId=X` - Get user's chats
- `POST /api/chats` - Create new chat
- `GET /api/chats/:id` - Get chat details
- `POST /api/chats/:id/join` - Join chat
- `DELETE /api/chats/:id/leave` - Leave chat

### Messages
- `GET /api/messages/:chatId` - Get chat messages
- `POST /api/messages` - Send message
- `GET /api/messages/message/:id` - Get message by ID
- `PUT /api/messages/:id` - Update message
- `DELETE /api/messages/:id` - Delete message

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chats table
CREATE TABLE chats (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  type VARCHAR(50) DEFAULT 'private',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat participants table
CREATE TABLE chat_participants (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(chat_id, user_id)
);

-- Messages table
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  chat_id INTEGER REFERENCES chats(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Start Development Server
```bash
npm run dev
# or
npm start
```

### 4. Test API
```bash
# Health check
curl http://localhost:3000/

# API info
curl http://localhost:3000/api

# Create user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```

## Socket.IO Events

### Client to Server
- `join_chat` - Join a chat room
- `send_message` - Send message to chat

### Server to Client  
- `new_message` - Receive new message

## Example Usage

### Create Users
```javascript
// POST /api/users
{
  "name": "John Doe",
  "email": "john@example.com"
}
```

### Create Chat
```javascript
// POST /api/chats  
{
  "name": "General Chat",
  "type": "group",
  "createdBy": 1,
  "participants": [1, 2, 3]
}
```

### Send Message
```javascript
// POST /api/messages
{
  "chatId": 1,
  "userId": 1, 
  "content": "Hello everyone!"
}
```

## Deployment

### Local Development
```bash
npm run dev
```

### Docker
```bash
docker build -t chatserver .
docker run -p 3000:80 -e DATABASE_URL="your_db_url" chatserver
```

### CapRover
1. Create new app in CapRover
2. Connect to Git repository
3. Set environment variables:
   - `DATABASE_URL`
   - `NODE_ENV=production`
4. Deploy!

## Environment Variables

```env
DATABASE_URL=postgresql://username:password@host:port/database
PORT=3000
NODE_ENV=development
```

## Project Structure

```
├── src/
│   ├── config/
│   │   └── database.js      # Database configuration
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── chatController.js
│   │   └── messageController.js
│   └── routes/
│       ├── index.js         # Main routes
│       ├── users.js         # User routes
│       ├── chats.js         # Chat routes
│       └── messages.js      # Message routes
├── index.js                 # Main server file
├── package.json
├── Dockerfile
├── captain-definition       # CapRover config
└── start-caprover.sh       # CapRover startup script
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch  
5. Create Pull Request

## License

MIT License - see LICENSE file for details.