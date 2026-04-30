import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import TaskCalendar from './components/TaskCalendar';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <AuthPage />;

  // Simple routing based on window.location.pathname
  if (window.location.pathname === '/calendar') {
    return <TaskCalendar />;
  }
  return <Dashboard user={user} />;
}
