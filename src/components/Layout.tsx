/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Search, Bell, Menu, X, User } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const pathParts = location.pathname.split('/').filter(Boolean);
  
  return (
    <div className="h-screen bg-[#F9FAFB] text-slate-900 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile unless open */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:block transition-transform duration-200 ease-in-out`}>
        <Sidebar onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="flex-1 flex flex-col h-full w-full overflow-x-hidden overflow-y-auto">
        <header className="h-16 bg-white border-b border-gray-200 px-4 md:px-8 flex items-center justify-between shadow-sm sticky top-0 z-10 w-full">
          <div className="flex items-center space-x-3 text-sm text-slate-500">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center space-x-2">
              <span className="text-slate-400 font-medium tracking-tight">Wizdent</span>
              <span className="text-slate-300">/</span>
            </div>
            <span className="text-slate-800 font-semibold capitalize tracking-tight">
              {pathParts.length > 0 ? pathParts[pathParts.length - 1].replace(/-/g, ' ') : 'Field Sales Architecture'}
            </span>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden lg:flex h-9 w-64 bg-slate-100 border border-slate-200 rounded-md items-center px-3 space-x-2">
              <Search className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search clinics, SKUs, visits..." 
                className="bg-transparent text-xs w-full focus:outline-none placeholder:text-slate-400"
              />
            </div>
            
            <div className="hidden sm:flex items-center gap-3 pr-2 mr-2 border-r border-slate-100">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">User Identity</p>
                <p className="text-[11px] font-bold text-slate-700 leading-none">{user?.email}</p>
              </div>
              <div className="w-9 h-9 border border-gray-200 rounded-full flex items-center justify-center bg-slate-50 text-slate-400">
                <User className="w-4 h-4" />
              </div>
            </div>

            <div className="w-9 h-9 border border-gray-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-gray-300 cursor-pointer transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-2 w-1.5 h-1.5 bg-blue-600 rounded-full border border-white"></span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
