import { useState } from 'react';
import { supabase, Task, Profile } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Loader2, X } from 'lucide-react';

type Props = {
  user: User;
  task?: Task | null;
  onSuccess: () => void;
  onCancel: () => void;
  mode?: 'create' | 'log-time' | 'mark-delayed';
  profiles: Profile[];
  tasks: Task[];
};

export default function TaskForm({ user, task, onSuccess, onCancel, mode = 'create', profiles, tasks }: Props) {
  // Defensive: Ensure profiles is always an array and always includes the current user
  profiles = Array.isArray(profiles) ? profiles : [];
  const userInProfiles = profiles.some(p => p.id === user.id);
  const profilesWithUser = userInProfiles
    ? profiles
    : [
        ...profiles,
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
        } as Profile,
      ];
  // TODO: Pass profiles and tasks as props for assignment and dependencies
  const [form, setForm] = useState(
    mode === 'create'
      ? {
          repository_name: '',
          branch_name: '',
          commit_message: '',
          module_name: '',
          estimated_time: '',
          due_date: '',
          assigned_user_id: user.id,
          priority: 'medium',
          dependencies: [] as string[],
          kanban_status: 'To Do',
          is_recurring: false,
          recurrence_rule: '',
          next_occurrence: '',
          started_at: '',
        }
      : mode === 'log-time'
      ? {
          actual_time: String(task?.actual_time || ''),
          started_at: task?.started_at ? task.started_at.slice(0, 16) : '',
          ended_at: task?.ended_at ? task.ended_at.slice(0, 16) : '',
        }
      : {
          delay_reason: task?.delay_reason || '',
        }
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // Subtasks state for create mode
  const [subtasks, setSubtasks] = useState(
    mode === 'create' ? [
      // Example: { title: '', description: '', assigned_user_id: user.id, due_date: '', status: 'pending' }
    ] : []
  );

  function set(field: string, value: any) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Prevent task creation if user profile does not exist
    if (!profiles.some(p => p.id === user.id)) {
      setError('Your profile is not set up yet. Please sign out and sign in again.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'create') {
        const estTime = parseFloat((form as any).estimated_time);
        if (isNaN(estTime) || estTime <= 0) {
          throw new Error('Estimated time must be a positive number.');
        }
        if (!(form as any).module_name.trim()) {
          throw new Error('Module name is required.');
        }

        // Prepare insert payload
        const insertPayload = {
          user_id: user.id,
          assigned_user_id: (form as any).assigned_user_id,
          repository_name: (form as any).repository_name.trim(),
          branch_name: (form as any).branch_name.trim(),
          commit_message: (form as any).commit_message.trim(),
          module_name: (form as any).module_name.trim(),
          estimated_time: estTime,
          actual_time: 0,
          status: 'pending',
          priority: (form as any).priority,
          due_date: (form as any).due_date ? new Date((form as any).due_date).toISOString() : null,
          kanban_status: (form as any).kanban_status,
          is_recurring: (form as any).is_recurring,
          recurrence_rule: (form as any).recurrence_rule,
          next_occurrence: (form as any).next_occurrence ? new Date((form as any).next_occurrence).toISOString() : null,
          started_at: (form as any).started_at ? new Date((form as any).started_at).toISOString() : null,
        };
                      {/* Start time */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start time (optional)</label>
                        <input
                          type="datetime-local"
                          value={(form as any).started_at}
                          onChange={e => set('started_at', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
        console.log('Insert payload for tasks:', insertPayload);
        // Insert task with assignment and priority
        const { data: inserted, error } = await supabase.from('tasks').insert([insertPayload]).select().single();
                      {/* Due date */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
                        <input
                          type="date"
                          value={(form as any).due_date}
                          onChange={e => set('due_date', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                      </div>
        if (error) throw error;
        // Insert dependencies if any
        if (Array.isArray((form as any).dependencies) && (form as any).dependencies.length > 0 && inserted) {
          for (const depId of (form as any).dependencies) {
            await supabase.from('task_dependencies').insert({
              task_id: inserted.id,
              depends_on_task_id: depId,
            });
          }
        }
        // Insert subtasks if any
        if (subtasks.length > 0 && inserted) {
          for (const sub of subtasks) {
            if (sub.title && sub.title.trim()) {
              await supabase.from('subtasks').insert({
                parent_task_id: inserted.id,
                title: sub.title.trim(),
                description: sub.description?.trim() || '',
                assigned_user_id: sub.assigned_user_id || null,
                due_date: sub.due_date ? new Date(sub.due_date).toISOString() : null,
                status: sub.status || 'pending',
              });
            }
          }
        }
      } else if (mode === 'log-time' && task) {
        const actTime = parseFloat((form as any).actual_time);
        if (isNaN(actTime) || actTime <= 0) {
          throw new Error('Actual time must be a positive number.');
        }
        if (!(form as any).started_at || !(form as any).ended_at) {
          throw new Error('Start and end times are required.');
        }
        if (new Date((form as any).ended_at) <= new Date((form as any).started_at)) {
          throw new Error('End time must be after start time.');
        }

        const { error } = await supabase.from('tasks').update({
          actual_time: actTime,
          started_at: new Date((form as any).started_at).toISOString(),
          ended_at: new Date((form as any).ended_at).toISOString(),
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', task.id);
        if (error) throw error;
      } else if (mode === 'mark-delayed' && task) {
        const { error } = await supabase.from('tasks').update({
          status: 'delayed',
          delay_reason: (form as any).delay_reason.trim(),
        }).eq('id', task.id);
        if (error) throw error;
      }

      // Clear form and subtasks after successful save
      if (mode === 'create') {
        setForm({
          repository_name: '',
          branch_name: '',
          commit_message: '',
          module_name: '',
          estimated_time: '',
          due_date: '',
          assigned_user_id: user.id,
          priority: 'medium',
          dependencies: [],
          kanban_status: 'To Do',
          is_recurring: false,
          recurrence_rule: '',
          next_occurrence: '',
          started_at: '',
        });
        setSubtasks([]);
      }
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'create' ? 'Create task' : mode === 'log-time' ? 'Log actual time' : 'Mark as delayed'}
          </h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'create' && (
            <>
              {/* Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                {profilesWithUser.length === 0 ? (
                  <div className="text-xs text-gray-400 mb-2">No users available to assign.</div>
                ) : (
                  <select
                    value={(form as any).assigned_user_id}
                    onChange={e => set('assigned_user_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {profilesWithUser.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.full_name || p.email}
                        {p.id === user.id ? ' (Me)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>
                            {/* Dependencies multi-select */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Dependencies (optional)</label>
                              <select
                                multiple
                                value={(form as any).dependencies || []}
                                onChange={e => {
                                  const options = Array.from(e.target.selectedOptions).map(o => o.value);
                                  set('dependencies', options);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                {tasks.filter(t => !task || t.id !== task.id).map(t => (
                                  <option key={t.id} value={t.id}>
                                    {t.module_name} ({t.repository_name})
                                  </option>
                                ))}
                              </select>
                              <small className="text-xs text-gray-400">Hold Ctrl/Cmd to select multiple</small>
                            </div>
              {/* Subtasks Section */}
              <div className="border border-gray-200 rounded-lg p-3 mb-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtasks</label>
                {subtasks.length === 0 && (
                  <div className="text-xs text-gray-400 mb-2">No subtasks yet.</div>
                )}
                {subtasks.map((sub, idx) => (
                  <div key={idx} className="mb-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0">
                    <div className="flex gap-2 mb-1">
                      <input
                        type="text"
                        placeholder="Subtask title"
                        value={sub.title}
                        onChange={e => setSubtasks(st => st.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      />
                      <button type="button" onClick={() => setSubtasks(st => st.filter((_, i) => i !== idx))} className="text-xs text-red-500 px-2">Remove</button>
                    </div>
                    <textarea
                      placeholder="Description (optional)"
                      value={sub.description || ''}
                      onChange={e => setSubtasks(st => st.map((s, i) => i === idx ? { ...s, description: e.target.value } : s))}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-xs mb-1"
                      rows={2}
                    />
                    <div className="flex gap-2 mb-1">
                      <select
                        value={sub.assigned_user_id || ''}
                        onChange={e => setSubtasks(st => st.map((s, i) => i === idx ? { ...s, assigned_user_id: e.target.value } : s))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="">Unassigned</option>
                        {profiles.map(p => (
                          <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                        ))}
                      </select>
                      <input
                        type="date"
                        value={sub.due_date || ''}
                        onChange={e => setSubtasks(st => st.map((s, i) => i === idx ? { ...s, due_date: e.target.value } : s))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                      />
                      <select
                        value={sub.status || 'pending'}
                        onChange={e => setSubtasks(st => st.map((s, i) => i === idx ? { ...s, status: e.target.value } : s))}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setSubtasks(st => [...st, { title: '', description: '', assigned_user_id: user.id, due_date: '', status: 'pending' }])}
                  className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                >
                  + Add Subtask
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kanban Status</label>
                <select
                  value={(form as any).kanban_status}
                  onChange={e => set('kanban_status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="To Do">To Do</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              {/* Recurring Task */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recurring Task?</label>
                <input
                  type="checkbox"
                  checked={(form as any).is_recurring}
                  onChange={e => set('is_recurring', e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Enable recurrence</span>
              </div>
              {(form as any).is_recurring && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence Rule (RFC 5545)</label>
                    <input
                      type="text"
                      value={(form as any).recurrence_rule}
                      onChange={e => set('recurrence_rule', e.target.value)}
                      placeholder="FREQ=WEEKLY;INTERVAL=1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Next Occurrence</label>
                    <input
                      type="datetime-local"
                      value={(form as any).next_occurrence}
                      onChange={e => set('next_occurrence', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </>
              )}
              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={(form as any).priority}
                  onChange={e => set('priority', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              {/* ...existing code for module, repo, branch, commit, est time... */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module / Feature <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={(form as any).module_name}
                  onChange={e => set('module_name', e.target.value)}
                  placeholder="Authentication"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                <input
                  type="text"
                  value={(form as any).repository_name}
                  onChange={e => set('repository_name', e.target.value)}
                  placeholder="my-app"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input
                  type="text"
                  value={(form as any).branch_name}
                  onChange={e => set('branch_name', e.target.value)}
                  placeholder="feature/my-feature"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commit message</label>
                <input
                  type="text"
                  value={(form as any).commit_message}
                  onChange={e => set('commit_message', e.target.value)}
                  placeholder="feat: add login page"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estimated time (hours) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  value={(form as any).estimated_time}
                  onChange={e => set('estimated_time', e.target.value)}
                  placeholder="2.5"
                  min="0.5"
                  step="0.5"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {/* TODO: Dependencies multi-select and comments UI */}
            </>
          )}

          {mode === 'log-time' && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-900">
                  <strong>{task?.module_name}</strong> — Estimated: {task?.estimated_time} hrs
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={(form as any).started_at}
                    onChange={e => set('started_at', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End time <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={(form as any).ended_at}
                    onChange={e => set('ended_at', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Actual time (hours) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={(form as any).actual_time}
                  onChange={e => set('actual_time', e.target.value)}
                  placeholder="3"
                  min="0.1"
                  step="0.1"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </>
          )}

          {mode === 'mark-delayed' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-900">
                  <strong>{task?.module_name}</strong> — Estimated: {task?.estimated_time} hrs
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason for delay <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={(form as any).delay_reason}
                  onChange={e => set('delay_reason', e.target.value)}
                  placeholder="Explain why the task was delayed..."
                  rows={4}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 font-medium py-2.5 rounded-lg text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'create' ? 'Create task' : mode === 'log-time' ? 'Complete task' : 'Mark delayed'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
