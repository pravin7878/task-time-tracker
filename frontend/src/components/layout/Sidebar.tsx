import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { NAV_ITEMS } from './navConfig';
import { useAuth } from '../../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm shadow-indigo-200 shrink-0">
          TT
        </div>
        <div className="overflow-hidden">
          <span className="font-bold text-slate-900 text-sm tracking-tight block truncate">
            Task & Time Tracker
          </span>
          <span className="text-xs text-slate-400 font-medium block truncate">
            Productivity App
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav aria-label="Main Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`
            }
          >
            <item.icon className="w-5 h-5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* User & Logout Section */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0">
              {userInitial}
            </div>
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors disabled:opacity-50"
        >
          <FiLogOut className="w-3.5 h-3.5 shrink-0" />
          <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
