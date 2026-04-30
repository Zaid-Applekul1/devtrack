/*
  # Add Task Workflow Status Columns

  Enhance task tracking with status workflow and delay tracking:
  - status: pending → in_progress → completed | delayed
  - delay_reason: optional reason if task is delayed
  - actual_time: to be filled in when task completes
  - completed_at: timestamp when task was marked complete
  
  Changes:
  - Add `status` column with enum-like values
  - Add `delay_reason` text column for delay explanations
  - Add `completed_at` timestamp for completion tracking
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'status'
  ) THEN
    ALTER TABLE tasks ADD COLUMN status text NOT NULL DEFAULT 'pending';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'delay_reason'
  ) THEN
    ALTER TABLE tasks ADD COLUMN delay_reason text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Make started_at and ended_at nullable (user fills them later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'started_at' AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE tasks ALTER COLUMN started_at DROP NOT NULL;
    ALTER TABLE tasks ALTER COLUMN ended_at DROP NOT NULL;
  END IF;
END $$;
