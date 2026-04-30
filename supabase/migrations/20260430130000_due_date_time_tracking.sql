/*
  # Add Due Date and Time Tracking Tables

  - Add due_date to tasks
  - Add task_time_logs for time tracking
*/

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date timestamptz;

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
