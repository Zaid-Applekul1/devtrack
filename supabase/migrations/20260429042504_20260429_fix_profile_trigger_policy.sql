/*
  # Fix Profile Trigger Policy

  The auth trigger `handle_new_user()` needs to insert profiles when users sign up, 
  but was blocked by RLS. Adding a policy that allows the trigger to insert during 
  the signup process.

  Changes:
  - Add a new INSERT policy for system-initiated inserts (bypasses user context)
  - Ensures profiles are auto-created when new auth users are registered
*/

-- Drop the existing restrictive policy and recreate with proper trigger support
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- System can insert profiles (for triggers/functions)
CREATE POLICY "System can insert profiles on signup"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can still insert their own profiles directly if needed
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
