import { useEffect, useState, useRef } from 'react';
import { supabase, TaskTimeLog } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

export function useTaskTimer(taskId: string, user: User | null) {
  const [activeLog, setActiveLog] = useState<TaskTimeLog | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch active log on mount
  useEffect(() => {
    if (!taskId || !user) return;
    let mounted = true;
    supabase
      .from('task_time_logs')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', user.id)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (mounted && data) {
          setActiveLog(data);
          setElapsed(Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000));
        }
      });
    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [taskId, user]);

  // Timer effect
  useEffect(() => {
    if (activeLog) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - new Date(activeLog.started_at).getTime()) / 1000));
      }, 1000);
      return () => intervalRef.current && clearInterval(intervalRef.current);
    }
  }, [activeLog]);

  async function start() {
    if (!user) return;
    const { data, error } = await supabase.from('task_time_logs').insert({
      task_id: taskId,
      user_id: user.id,
      started_at: new Date().toISOString(),
    }).select().single();
    if (!error && data) {
      setActiveLog(data);
      setElapsed(0);
    }
  }

  async function stop() {
    if (!activeLog) return;
    const ended_at = new Date().toISOString();
    const duration = Math.floor((new Date(ended_at).getTime() - new Date(activeLog.started_at).getTime()) / 1000);
    await supabase.from('task_time_logs').update({ ended_at, duration }).eq('id', activeLog.id);
    setActiveLog(null);
    setElapsed(0);
  }

  return {
    isRunning: !!activeLog,
    elapsed,
    start,
    stop,
  };
}
