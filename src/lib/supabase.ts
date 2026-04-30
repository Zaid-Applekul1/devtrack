// Subtask type for subtasks table
export type Subtask = {
  id: string;
  parent_task_id: string;
  title: string;
  description?: string;
  status: string;
  assigned_user_id?: string;
  due_date?: string;
  created_at: string;
  completed_at?: string;
};
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
};

export type Task = {
  id: string;
  user_id: string;
  assigned_user_id?: string;
  repository_name: string;
  branch_name: string;
  commit_message: string;
  module_name: string;
  estimated_time: number;
  actual_time: number;
  started_at?: string;
  ended_at?: string;
  due_date?: string;
  created_at: string;
  status?: string;
  priority?: 'high' | 'medium' | 'low';
  kanban_status?: string;
  delay_reason?: string;
  completed_at?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  next_occurrence?: string;
  profiles?: Profile;
  assigned_profile?: Profile;
  subtasks?: Subtask[];
};

export type TaskTimeLog = {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  duration?: number;
  created_at: string;
};

export type TaskComment = {
  id: string;
  task_id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user?: Profile;
};

export type TaskDependency = {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  depends_on_task?: Task;
};

export type ActivityLog = {
  id: string;
  task_id: string;
  user_id: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
  user?: Profile;
};
