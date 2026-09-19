import React from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { FiMenu, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { useActiveTimer } from '../../hooks/useTimeTracking';
import { LiveTimer } from '../timer/LiveTimer';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const { user, logout, isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Active timer retrieved directly from existing query
  const { data: activeTimer } = useActiveTimer();

  const getPageTitle = (pathname: string): string => {
    if (pathname.startsWith('/app/tasks')) return 'Tasks';
    if (pathname.startsWith('/app/time-logs')) return 'Time Logs';
    return 'Dashboard';
  };

  const currentTitle = getPageTitle(location.pathname);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-xs">
      {/* Left side: Hamburger on mobile + page title + active timer badge */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 md:hidden transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <FiMenu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
            {currentTitle}
          </h1>
        </div>

        {/* Active Timer Pill: Live timer only (● ◷ 00:05:27) */}
        {activeTimer && (
          <Link
            to="/app/tasks"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all text-xs font-medium shadow-xs ml-1"
            title="Live timer active. Click to view tasks."
          >
            <LiveTimer startedAt={activeTimer.startedAt} showIcon={true} />
          </Link>
        )}
      </div>

      {/* Right side: User information + sign out */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-xs text-slate-700">
          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="font-medium max-w-[150px] truncate">{user?.name}</span>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          aria-label="Sign out"
          title="Sign out of your account"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <FiLogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {isLoggingOut ? 'Signing out...' : 'Sign Out'}
          </span>
        </button>
      </div>
    </header>
  );
};

export default Header;
