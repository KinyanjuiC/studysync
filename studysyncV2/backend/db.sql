CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  age INTEGER,
  academic_level VARCHAR(50),
  field_of_study VARCHAR(100),
  learning_style VARCHAR(100),
  schedule JSONB
);

CREATE TABLE IF NOT EXISTS public.files (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id),
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.study_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id),
  room_id VARCHAR(255) NOT NULL,
  hours_spent FLOAT DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  notes_shared INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  poll_votes INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, room_id)
);

CREATE TABLE IF NOT EXISTS public.achievements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES public.users(id),
  badge VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS public.study_rooms (
  room_id VARCHAR(255) PRIMARY KEY,
  chat JSONB DEFAULT '[]',
  notes TEXT DEFAULT '',
  whiteboard JSONB DEFAULT '[]'
);