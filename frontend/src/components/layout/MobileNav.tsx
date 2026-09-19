import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FiX, FiLogOut } from 'react-icons/fi';
import { NAV_ITEMS } from './navConfig';
import { useAuth } from '../../hooks/useAuth';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user, logout, isLoggingOut } = useAuth();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
    try {
      onClose();
      await logout();
      navigate('/login', { replace: true });
    } catch {
      navigate('/login', { replace: true });
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
              TT
            </div>
            <span className="font-bold text-slate-900 text-sm tracking-tight">
              Task & Time Tracker
            </span>
          </div>

          <button
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Mobile Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
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
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0">
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
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          >
            <FiLogOut className="w-4 h-4 shrink-0" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileNav;
