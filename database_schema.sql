-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS last_messages CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS chat_participants CASCADE;
DROP TABLE IF EXISTS chats CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table with UUID
CREATE TABLE users (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create chats table with UUID (private chat between 2 users)
CREATE TABLE chats (
    chat_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id UUID REFERENCES users(uid) ON DELETE CASCADE,
    user2_id UUID REFERENCES users(uid) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Create messages table with UUID
CREATE TABLE messages (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(uid) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT NOW()
);

-- Create last_messages table for quick access to latest conversations
CREATE TABLE last_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(uid) ON DELETE CASCADE,
    partner_id UUID REFERENCES users(uid) ON DELETE CASCADE,
    chat_id UUID REFERENCES chats(chat_id) ON DELETE CASCADE,
    last_chat TEXT,
    last_chat_date TIMESTAMP,
    UNIQUE(user_id, partner_id)
);

-- Create indexes for better performance
CREATE INDEX idx_messages_chat_id ON messages(chat_id);
CREATE INDEX idx_messages_sent_at ON messages(sent_at);
CREATE INDEX idx_last_messages_user_id ON last_messages(user_id);
CREATE INDEX idx_chats_user1_id ON chats(user1_id);
CREATE INDEX idx_chats_user2_id ON chats(user2_id);

-- Insert sample data for testing
INSERT INTO users (uid, name, email) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'John Doe', 'john@example.com'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Jane Smith', 'jane@example.com'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Bob Wilson', 'bob@example.com');

-- Insert sample chat
INSERT INTO chats (chat_id, user1_id, user2_id) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440002');

-- Insert sample messages
INSERT INTO messages (chat_id, sent_by, content) VALUES
    ('660e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440001', 
     'Hello Jane!'),
    ('660e8400-e29b-41d4-a716-446655440001', 
     '550e8400-e29b-41d4-a716-446655440002', 
     'Hi John! How are you?');