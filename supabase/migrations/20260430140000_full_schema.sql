/*
  # DevTrack - Complete Schema (All Features)

  - User profiles
  - Tasks with assignment, priority, due date, workflow, and dependencies
  - Comments, activity log, and time tracking
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

CREATE POLICY "Allow profile creation on signup"
  ON profiles FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- Allow all authenticated users to read profiles (for dashboard filtering)
CREATE POLICY "Authenticated users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assigned_user_id uuid REFERENCES profiles(id),
  repository_name text NOT NULL DEFAULT '',
  branch_name text NOT NULL DEFAULT '',
  commit_message text NOT NULL DEFAULT '',
  module_name text NOT NULL DEFAULT '',
  estimated_time numeric NOT NULL DEFAULT 0,
  actual_time numeric NOT NULL DEFAULT 0,
  started_at timestamptz,
  ended_at timestamptz,
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  kanban_status text NOT NULL DEFAULT 'To Do', -- Kanban board status (To Do, In Progress, Review, Done)
  delay_reason text,
  completed_at timestamptz,
  is_recurring boolean NOT NULL DEFAULT false, -- Recurring task flag
  recurrence_rule text, -- Recurrence rule in RFC 5545 format, e.g., 'FREQ=WEEKLY;INTERVAL=1'
  next_occurrence timestamptz -- Next scheduled occurrence for recurring tasks
-- Subtasks table
-- Each subtask belongs to a parent task and can be assigned, tracked, and completed independently.
);


-- Subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  assigned_user_id uuid REFERENCES profiles(id),
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_subtasks_parent_task_id ON subtasks(parent_task_id);


-- Indexes for Kanban and recurring tasks
CREATE INDEX IF NOT EXISTS tasks_kanban_status_idx ON tasks(kanban_status);
CREATE INDEX IF NOT EXISTS tasks_next_occurrence_idx ON tasks(next_occurrence);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- Subtasks RLS policies
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all subtasks"
  ON subtasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert subtasks for own tasks"
  ON subtasks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = parent_task_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update subtasks for own tasks"
  ON subtasks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = parent_task_id AND user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = parent_task_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete subtasks for own tasks"
  ON subtasks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = parent_task_id AND user_id = auth.uid())
  );

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
CREATE INDEX IF NOT EXISTS tasks_assigned_user_id ON tasks(assigned_user_id);
CREATE INDEX IF NOT EXISTS tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_repository_name_idx ON tasks(repository_name);
CREATE INDEX IF NOT EXISTS tasks_started_at_idx ON tasks(started_at);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON tasks(created_at);

-- Task dependencies table
CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task_id ON task_dependencies(task_id);

-- Comments table
CREATE TABLE IF NOT EXISTS task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Activity log table
CREATE TABLE IF NOT EXISTS activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL,
  field_changed text,
  old_value text,
  new_value text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_task_id ON activity_log(task_id);

-- Time tracking table
CREATE TABLE IF NOT EXISTS task_time_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  duration numeric, -- in seconds
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_time_logs_user_id ON task_time_logs(user_id);

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but don't fail — signup should succeed even if profile creation has issues
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
