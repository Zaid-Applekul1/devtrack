-- DevTrack Drop Schema Script
-- Drops all tables, functions, triggers, and policies created by the main schema

-- Drop triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Drop tables (in dependency order)
DROP TABLE IF EXISTS task_time_logs CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS task_comments CASCADE;
DROP TABLE IF EXISTS task_dependencies CASCADE;
DROP TABLE IF EXISTS subtasks CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Optionally, drop any remaining objects (indexes, policies are dropped with tables)
-- All done.
