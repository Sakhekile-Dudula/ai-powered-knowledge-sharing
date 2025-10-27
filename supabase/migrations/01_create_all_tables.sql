-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
	id uuid PRIMARY KEY,
	full_name text,
	email text UNIQUE,
	avatar_url text,
	created_at timestamp DEFAULT now()
);

-- Create knowledge_items table
CREATE TABLE IF NOT EXISTS knowledge_items (
	id serial PRIMARY KEY,
	author_id uuid REFERENCES profiles(id),
	title text NOT NULL,
	description text,
	views integer DEFAULT 0,
	created_at timestamp DEFAULT now()
);

-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
	id serial PRIMARY KEY,
	user_id uuid REFERENCES profiles(id),
	knowledge_item_id integer REFERENCES knowledge_items(id),
	type text,
	created_at timestamp DEFAULT now()
);

-- Create user_connections table
CREATE TABLE IF NOT EXISTS user_connections (
	id serial PRIMARY KEY,
	user_id uuid REFERENCES profiles(id),
	connected_with uuid REFERENCES profiles(id),
	status text,
	created_at timestamp DEFAULT now()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
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
CREATE TABLE IF NOT EXISTS historical_stats (
	id serial PRIMARY KEY,
	previous_connections integer,
	previous_items integer,
	previous_collaborations integer,
	previous_hours integer,
	recorded_at timestamp DEFAULT now()
);
