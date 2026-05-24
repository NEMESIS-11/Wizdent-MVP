/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  Users, 
  User,
  Building2, 
  Package, 
  Calendar, 
  Settings,
  LayoutDashboard,
  LogOut,
  Car,
  Tag,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

const navItems = [
  { icon: LayoutDashboard, label: 'Command Center', path: '/' },
  { icon: User, label: 'My Profile', path: '/profile' },
  { icon: Building2, label: 'Account Management', path: '/accounts' },
  { icon: Users, label: 'Contact Management', path: '/contacts' },
  { icon: Users, label: 'Team Directory', path: '/users' },
  { icon: BarChart3, label: 'Analytics Reports', path: '/reports' },
  { icon: Car, label: 'Visit Planning', path: '/visits' },
  { icon: Package, label: 'Product Catalog', path: '/products' },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const { profile } = useAuth();

  return (
    <aside className="w-64 bg-slate-950 flex flex-col border-r border-slate-800 text-slate-400 h-screen overflow-hidden">
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span className="font-bold text-white text-lg tracking-tight uppercase">Wizdent</span>
        </div>
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
        <div className="px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Operational Hub</div>
        {navItems.slice(0, 6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium",
              isActive 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "hover:text-white hover:bg-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {profile?.role === 'ADMIN' && (
          <>
            <div className="pt-6 px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">System Admin</div>
            <NavLink
              to="/admin"
              className={({ isActive }) => cn(
                "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium",
                isActive 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" 
                  : "hover:text-white hover:bg-slate-900"
              )}
            >
              <Settings className="w-4 h-4" />
              <span>Identity Monitor</span>
            </NavLink>
          </>
        )}

        <div className="pt-6 px-3 py-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Supply Chain</div>
        {navItems.slice(6).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-xl transition-all text-[13px] font-medium",
              isActive 
                ? "bg-slate-800 text-white shadow-lg" 
                : "hover:text-white hover:bg-slate-900"
            )}
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800 mb-2">
        <div className="flex items-center space-x-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold uppercase">
            {profile?.displayName?.substring(0, 2) || 'US'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">{profile?.displayName || 'User'}</div>
            <div className="text-[10px] text-slate-500">{profile?.role || 'v1.0.4'}</div>
          </div>
          <button 
            onClick={() => signOut(auth)}
            className="p-1.5 hover:bg-slate-900 rounded-md text-slate-500 hover:text-white transition-colors"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
