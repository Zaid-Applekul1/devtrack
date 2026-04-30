import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase, Task } from '../lib/supabase';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';

const locales = { 'en-US': enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

export default function TaskCalendar() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('tasks')
      .select('*')
      .then(({ data }) => {
        setTasks(data || []);
        setLoading(false);
      });
  }, []);

  const events = tasks
    .filter(t => t.due_date)
    .map(t => ({
      id: t.id,
      title: t.module_name + (t.repository_name ? ` (${t.repository_name})` : ''),
      start: new Date(t.due_date!),
      end: new Date(t.due_date!),
      allDay: true,
      resource: t,
    }));

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Task Calendar</h2>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
        />
      )}
    </div>
  );
}
