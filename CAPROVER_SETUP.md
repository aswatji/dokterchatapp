# CapRover Environment Variables Setup

## Required Environment Variables

Untuk deployment CapRover, set environment variables berikut di **App Configs > Environment Variables**:

### 🗄️ Database Configuration
```bash
# PostgreSQL Database Configuration
POSTGRES_PASSWORD=your_postgres_password_here
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_HOST=srv-captain--dokterchat  # Default CapRover PostgreSQL service
POSTGRES_PORT=5432

# Alternative: Set DATABASE_URL directly (will override POSTGRES_* variables)
# DATABASE_URL=postgresql://postgres:password@srv-captain--dokterchat:5432/postgres
```

### 🚀 Server Configuration
```bash
# Server Settings
NODE_ENV=production
PORT=80  # CapRover default port
```

## 📋 CapRover Setup Steps

1. **Create PostgreSQL App** (if not exists):
   - Go to CapRover dashboard
   - Click "One-Click Apps"
   - Search "PostgreSQL" and deploy
   - Note the service name: `srv-captain--dokterchat`

2. **Set Environment Variables**:
   - Go to your chat app in CapRover
   - Click "App Configs" tab
   - Add the environment variables above
   - Make sure `POSTGRES_PASSWORD` matches your PostgreSQL app password

3. **Deploy**:
   - The `start-caprover.sh` script will automatically:
     - Construct DATABASE_URL from POSTGRES_* variables
     - Test database connectivity
     - Initialize UUID schema tables
     - Start the chat server

4. **Verify**:
   - Check logs for `✅ Database tables initialized successfully`
   - Test API at: `https://your-app.your-domain.com/api`

## 🔧 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL service is running
- Check `POSTGRES_PASSWORD` matches PostgreSQL app
- Verify `POSTGRES_HOST` is correct service name

### SSL Errors
- Script automatically sets `ssl: false` for CapRover internal connections
- No SSL configuration needed

### Permission Issues  
- Script runs as non-root user `nodeuser`
- All files have proper ownership via Dockerfile

## 🧪 Testing Endpoints

After successful deployment:

```bash
# Health check
GET https://your-app.domain.com/health

# API info  
GET https://your-app.domain.com/api

# Create user
POST https://your-app.domain.com/api/users
Content-Type: application/json
{
  "name": "Dr. Ahmad",
  "email": "ahmad@example.com"
}

# Get users
GET https://your-app.domain.com/api/users

# Create chat (v2 UUID)
POST https://your-app.domain.com/api/v2/chats
Content-Type: application/json
{
  "user1_id": "user_uuid_1",
  "user2_id": "user_uuid_2"  
}
```

## 📊 Features Available

- ✅ UUID-based database schema
- ✅ 1-on-1 chat system  
- ✅ Real-time messaging with Socket.IO
- ✅ RESTful API (v1 & v2)
- ✅ Automatic fallback and error handling
- ✅ Production-ready logging
- ✅ Health check endpoints