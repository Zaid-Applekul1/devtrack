import { useCallback, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Task, Profile } from '../lib/supabase';
import { Code2, Plus, LogOut, Clock, GitBranch, Layers, TrendingUp, Filter, Trash2, ChevronDown, CheckCircle2, Clock3, AlertCircle } from 'lucide-react';
import TaskForm from './TaskForm';
import { useTaskTimer } from '../hooks/useTaskTimer';

type Props = { user: User };

type StatsCard = { label: string; value: string; sub?: string; icon: React.ReactNode; color: string };

type FormMode = 'create' | 'log-time' | 'mark-delayed';

function formatHrs(n: number) {
  return n % 1 === 0 ? `${n}h` : `${n.toFixed(1)}h`;
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Dashboard({ user }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filters
  const [filterDeveloper, setFilterDeveloper] = useState('');
  const [filterRepo, setFilterRepo] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [{ data: tasksData }, { data: profilesData }, { data: subtasksData }] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, profiles(id, full_name, email)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
      supabase.from('subtasks').select('*'),
    ]);
    // Defensive: default to empty arrays if null
    const tasksArr = Array.isArray(tasksData) ? tasksData : [];
    const subtasksArr = Array.isArray(subtasksData) ? subtasksData : [];
    const profilesArr = Array.isArray(profilesData) ? profilesData : [];
    // Attach subtasks to their parent tasks
    const tasksWithSubtasks = tasksArr.map(t => ({
      ...t,
      subtasks: subtasksArr.filter(s => s.parent_task_id === t.id),
    }));
    setTasks(tasksWithSubtasks);
    setProfiles(profilesArr);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchData();
  }

  const repos = [...new Set(tasks.map(t => t.repository_name))].sort();

  const filtered = tasks.filter(t => {
    if (filterDeveloper && t.user_id !== filterDeveloper) return false;
    if (filterRepo && t.repository_name !== filterRepo) return false;
    if (filterDateFrom && t.started_at && new Date(t.started_at) < new Date(filterDateFrom)) return false;
    if (filterDateTo && t.started_at && new Date(t.started_at) > new Date(filterDateTo + 'T23:59:59')) return false;
    return true;
  });

  const completed = filtered.filter(t => t.status === 'completed');
  const totalEstimated = completed.reduce((s, t) => s + t.estimated_time, 0);
  const totalActual = completed.reduce((s, t) => s + t.actual_time, 0);
  const deviation = totalActual - totalEstimated;
  const deviationPct = totalEstimated > 0 ? Math.round((deviation / totalEstimated) * 100) : 0;

  const repoStats: Record<string, { estimated: number; actual: number; count: number }> = {};
  completed.forEach(t => {
    if (!repoStats[t.repository_name]) repoStats[t.repository_name] = { estimated: 0, actual: 0, count: 0 };
    repoStats[t.repository_name].estimated += t.estimated_time;
    repoStats[t.repository_name].actual += t.actual_time;
    repoStats[t.repository_name].count++;
  });

  const moduleStats: Record<string, { estimated: number; actual: number; count: number }> = {};
  completed.forEach(t => {
    if (!moduleStats[t.module_name]) moduleStats[t.module_name] = { estimated: 0, actual: 0, count: 0 };
    moduleStats[t.module_name].estimated += t.estimated_time;
    moduleStats[t.module_name].actual += t.actual_time;
    moduleStats[t.module_name].count++;
  });

  const cards: StatsCard[] = [
    {
      label: 'Total tasks',
      value: String(filtered.length),
      sub: `across ${Object.keys(repoStats).length} repos`,
      icon: <Layers className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Estimated time',
      value: formatHrs(totalEstimated),
      sub: 'planned hours',
      icon: <Clock className="w-5 h-5" />,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Actual time',
      value: formatHrs(totalActual),
      sub: 'logged hours',
      icon: <TrendingUp className="w-5 h-5" />,
      color: deviation > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Time deviation',
      value: `${deviation >= 0 ? '+' : ''}${formatHrs(deviation)}`,
      sub: `${deviationPct >= 0 ? '+' : ''}${deviationPct}% vs estimate`,
      icon: <GitBranch className="w-5 h-5" />,
      color: deviation > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
    },
  ];

  const activeFilters = [filterDeveloper, filterRepo, filterDateFrom, filterDateTo].filter(Boolean).length;

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const currentProfile = profiles.find(p => p.id === user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Code2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">DevTrack</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/calendar"
              className="text-blue-600 hover:underline text-sm font-medium px-2 py-1 rounded-lg border border-blue-100 bg-blue-50"
            >
              Calendar
            </a>
            <span className="text-sm text-gray-500 hidden sm:block">
              {currentProfile?.full_name || user.email}
            </span>
            <button
              onClick={() => { setFormMode('create'); setSelectedTask(null); setShowForm(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              New task
            </button>
            <button
              onClick={handleSignOut}
              className="text-gray-400 hover:text-gray-600 transition p-1"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map(c => (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{c.value}</p>
                  {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
                </div>
                <div className={`p-2 rounded-lg ${c.color}`}>{c.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Repo & Module breakdown */}
        {Object.keys(repoStats).length > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Repository</h3>
              <div className="space-y-3">
                {Object.entries(repoStats)
                  .sort((a, b) => b[1].actual - a[1].actual)
                  .map(([repo, s]) => (
                    <div key={repo}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{repo}</span>
                        <span className="text-gray-500 text-xs ml-2 shrink-0">
                          {formatHrs(s.actual)} / {formatHrs(s.estimated)} &bull; {s.count} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 relative">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (s.actual / Math.max(s.estimated, s.actual)) * 100)}%` }}
                        />
                        {s.actual > s.estimated && (
                          <div
                            className="bg-amber-400 h-1.5 rounded-r-full absolute top-0"
                            style={{
                              left: `${(s.estimated / s.actual) * 100}%`,
                              width: `${((s.actual - s.estimated) / s.actual) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">By Module / Feature</h3>
              <div className="space-y-3">
                {Object.entries(moduleStats)
                  .sort((a, b) => b[1].actual - a[1].actual)
                  .map(([mod, s]) => (
                    <div key={mod}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-gray-800 truncate">{mod}</span>
                        <span className="text-gray-500 text-xs ml-2 shrink-0">
                          {formatHrs(s.actual)} / {formatHrs(s.estimated)} &bull; {s.count} tasks
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 relative">
                        <div
                          className="bg-emerald-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min(100, (s.actual / Math.max(s.estimated, s.actual)) * 100)}%` }}
                        />
                        {s.actual > s.estimated && (
                          <div
                            className="bg-amber-400 h-1.5 rounded-r-full absolute top-0"
                            style={{
                              left: `${(s.estimated / s.actual) * 100}%`,
                              width: `${((s.actual - s.estimated) / s.actual) * 100}%`,
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Task list with filters */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">
              Tasks{' '}
              <span className="text-gray-400 font-normal">({filtered.length})</span>
            </h3>
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition ${
                showFilters || activeFilters > 0
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilters > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Developer</label>
                <select
                  value={filterDeveloper}
                  onChange={e => setFilterDeveloper(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All developers</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Repository</label>
                <select
                  value={filterRepo}
                  onChange={e => setFilterRepo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All repos</option>
                  {repos.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From date</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={e => setFilterDateFrom(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To date</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={e => setFilterDateTo(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {activeFilters > 0 && (
                <div className="sm:col-span-2 lg:col-span-4 flex">
                  <button
                    onClick={() => {
                      setFilterDeveloper('');
                      setFilterRepo('');
                      setFilterDateFrom('');
                      setFilterDateTo('');
                    }}
                    className="text-sm text-red-500 hover:text-red-600 transition"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">
              Loading tasks...
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Layers className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm">No tasks found</p>
              {activeFilters > 0 && (
                <p className="text-xs mt-1">Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 font-medium border-b border-gray-100">
                    <th className="px-5 py-3">Assigned</th>
                    <th className="px-5 py-3">Priority</th>
                    <th className="px-5 py-3">Module</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Repository</th>
                    <th className="px-5 py-3 text-right">Est.</th>
                    <th className="px-5 py-3 text-right">Actual</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(t => {
                    const profile = profiles.find(p => p.id === t.user_id);
                    const assignedProfile = profiles.find(p => p.id === t.assigned_user_id);
                    const isOwn = t.user_id === user.id;
                    const isPending = t.status === 'pending';
                    const isCompleted = t.status === 'completed';
                    const isDelayed = t.status === 'delayed';
                    // Timer logic: only for assigned user
                    const showTimer = t.assigned_user_id === user.id;
                    let TimerButton = null;
                    if (showTimer) {
                      TimerButton = function TimerBtn() {
                        const { isRunning, elapsed, start, stop } = useTaskTimer(t.id, user);
                        function format(sec: number) {
                          const m = Math.floor(sec / 60);
                          const s = sec % 60;
                          return `${m}:${s.toString().padStart(2, '0')}`;
                        }
                        return (
                          <button
                            onClick={isRunning ? stop : start}
                            className={`px-2 py-1 rounded text-xs font-semibold border ${isRunning ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-gray-50 border-gray-300 text-gray-600'} ml-2`}
                          >
                            {isRunning ? `Stop (${format(elapsed)})` : 'Start Timer'}
                          </button>
                        );
                      };
                    }
                    return (
                      <>
                        <tr key={t.id} className="hover:bg-gray-50 transition">
                        <td className="px-5 py-3 font-medium text-gray-800 whitespace-nowrap">
                          {assignedProfile?.full_name || assignedProfile?.email || 'Unassigned'}
                          {showTimer && <TimerButton />}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${t.priority === 'high' ? 'bg-red-100 text-red-700' : t.priority === 'low' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'}`}>{t.priority || 'medium'}</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-medium text-gray-900">{t.module_name}</span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-600 whitespace-nowrap">
                          {t.due_date ? formatDate(t.due_date) : '-'}
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">
                          {t.repository_name || '-'}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-600 tabular-nums">
                          {formatHrs(t.estimated_time)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums">
                          {isCompleted ? (
                            <span className="text-emerald-600 font-medium">{formatHrs(t.actual_time)}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1.5">
                            {isPending && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                                <Clock3 className="w-3 h-3" />
                                Pending
                              </span>
                            )}
                            {isCompleted && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full">
                                <CheckCircle2 className="w-3 h-3" />
                                Completed
                              </span>
                            )}
                            {isDelayed && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-red-50 text-red-700 rounded-full">
                                <AlertCircle className="w-3 h-3" />
                                Delayed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {isOwn && (
                            <div className="flex items-center gap-1 justify-end">
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => { setFormMode('log-time'); setSelectedTask(t); setShowForm(true); }}
                                    title="Log actual time"
                                    className="p-1 text-gray-400 hover:text-blue-600 transition rounded"
                                  >
                                    <Clock3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setFormMode('mark-delayed'); setSelectedTask(t); setShowForm(true); }}
                                    title="Mark as delayed"
                                    className="p-1 text-gray-400 hover:text-amber-600 transition rounded"
                                  >
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => handleDelete(t.id)}
                                title="Delete task"
                                className="p-1 text-gray-400 hover:text-red-500 transition rounded"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        </tr>
                        {/* Subtasks display */}
                        {Array.isArray(t.subtasks) && t.subtasks.length > 0 && (
                          <tr className="bg-gray-50">
                            <td colSpan={9} className="px-8 pb-2 pt-1">
                              <div className="text-xs text-gray-500 mb-1 font-semibold">Subtasks:</div>
                              <ul className="space-y-1">
                                {t.subtasks.map((sub: any) => {
                                  const subAssigned = profiles.find(p => p.id === sub.assigned_user_id);
                                  return (
                                    <li key={sub.id} className="flex items-center gap-2 border-b border-gray-100 pb-1 last:border-b-0 last:pb-0">
                                      <span className="font-medium text-gray-800">{sub.title}</span>
                                      {sub.status === 'completed' && <span className="text-emerald-600">✔</span>}
                                      {sub.status === 'in_progress' && <span className="text-blue-600">●</span>}
                                      {sub.status === 'pending' && <span className="text-gray-400">○</span>}
                                      <span className="text-gray-500">{subAssigned?.full_name || subAssigned?.email || 'Unassigned'}</span>
                                      {sub.due_date && <span className="text-gray-400">Due: {formatDate(sub.due_date)}</span>}
                                    </li>
                                  );
                                })}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showForm && (
        <TaskForm
          user={user}
          task={selectedTask}
          mode={formMode}
          profiles={profiles}
          tasks={tasks}
          onSuccess={() => {
            setShowForm(false);
            setSelectedTask(null);
            fetchData();
          }}
          onCancel={() => {
            setShowForm(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
}
