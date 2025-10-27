-- Complete database setup - Run this first before step4_insert_data.sql

-- Drop existing tables if they have issues (be careful with this in production!)
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS collaborations CASCADE;
DROP TABLE IF EXISTS user_connections CASCADE;
DROP TABLE IF EXISTS knowledge_items CASCADE;
DROP TABLE IF EXISTS historical_stats CASCADE;

-- Keep profiles table but fix it
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create knowledge_items table
CREATE TABLE knowledge_items (
    id serial PRIMARY KEY,
    author_id uuid REFERENCES profiles(id),
    title text NOT NULL,
    description text,
    views integer DEFAULT 0,
    created_at timestamp DEFAULT now()
);

-- Create collaborations table
CREATE TABLE collaborations (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),
    knowledge_item_id integer REFERENCES knowledge_items(id),
    type text,
    created_at timestamp DEFAULT now()
);

-- Create user_connections table
CREATE TABLE user_connections (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),
    connected_with uuid REFERENCES profiles(id),
    status text,
    created_at timestamp DEFAULT now()
);

-- Create activity_log table
CREATE TABLE activity_log (
    id serial PRIMARY KEY,
    user_id uuid REFERENCES profiles(id),
    action text,
    topic text,
    entity_type text,
    entity_id integer,
    type text,
    created_at timestamp DEFAULT now()
);

-- Create historical_stats table
CREATE TABLE historical_stats (
    id serial PRIMARY KEY,
    previous_connections integer,
    previous_items integer,
    previous_collaborations integer,
    previous_hours integer,
    recorded_at timestamp DEFAULT now()
);
