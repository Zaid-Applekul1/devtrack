/*
  # Developer Tracking System - Initial Schema

  ## New Tables

  ### `profiles`
  - `id` (uuid, PK, references auth.users)
  - `full_name` (text)
  - `email` (text)
  - `created_at` (timestamptz)

  ### `tasks`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK -> profiles.id)
  - `repository_name` (text) - GitHub repo name
  - `branch_name` (text) - Git branch
  - `commit_message` (text) - Commit name/message
  - `module_name` (text) - Module or feature name
  - `estimated_time` (numeric) - Estimated hours
  - `actual_time` (numeric) - Actual hours spent
  - `started_at` (timestamptz) - Task start timestamp
  - `ended_at` (timestamptz) - Task end timestamp
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on both tables
  - Profiles: users can read/update their own profile
  - Tasks: users can CRUD their own tasks, all authenticated users can read all tasks (for dashboard)
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to read profiles (for dashboard filtering)
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  repository_name text NOT NULL DEFAULT '',
  branch_name text NOT NULL DEFAULT '',
  commit_message text NOT NULL DEFAULT '',
  module_name text NOT NULL DEFAULT '',
  estimated_time numeric NOT NULL DEFAULT 0,
  actual_time numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all tasks (for dashboard visibility)
CREATE POLICY "Authenticated users can view all tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_repository_name_idx ON tasks(repository_name);
CREATE INDEX IF NOT EXISTS tasks_started_at_idx ON tasks(started_at);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
