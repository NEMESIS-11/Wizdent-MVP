import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserRole } from '../types';
import { 
  Users as UsersIcon, 
  Search, 
  Filter, 
  MapPin, 
  Shield, 
  Mail, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { TERRITORIES, getTerritoryName } from '../constants';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  territory?: string;
  dealerCode?: string;
  createdAt?: any;
}

export default function Users() {
  const { profile, isAdmin } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  useEffect(() => {
    if (profile) {
      fetchUsers();
    }
  }, [profile]);

  const fetchUsers = async () => {
    if (!profile) return;
    setLoading(true);
    setError(null);
    try {
      let q;
      if (isAdmin) {
        q = query(collection(db, 'users'), orderBy('displayName', 'asc'));
      } else if (profile.role === UserRole.MANAGER && profile.territory) {
        q = query(
          collection(db, 'users'),
          where('territory', '>=', profile.territory),
          where('territory', '<=', profile.territory + '\uf8ff'),
          orderBy('territory'),
          orderBy('displayName', 'asc')
        );
      } else {
        // Fallback or Dealers can only see limited directory or just themselves?
        // Let's allow Dealers to see their territory team too if rule allows
        if (profile.territory) {
          q = query(
            collection(db, 'users'),
            where('territory', '>=', profile.territory),
            where('territory', '<=', profile.territory + '\uf8ff')
          );
        } else {
          q = query(collection(db, 'users'), where('uid', '==', profile.uid || ''));
        }
      }
      
      const snapshot = await getDocs(q);
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as UserData[];
      setUsers(userData);
    } catch (err) {
      console.error(err);
      setError('Failed to load team directory. Access might be restricted.');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.dealerCode?.toLowerCase().includes(search.toLowerCase());
    
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  if (profile?.role === UserRole.MANAGER) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-[2.5rem] text-center space-y-6 shadow-2xl text-white">
          <Shield className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Security Access Warning</h2>
            <p className="text-slate-400 text-sm font-medium">
              Sales Managers are restricted from accessing the Team Directory/active personnel database to maintain compliance with resource allocation guidelines.
            </p>
          </div>
          <div className="pt-4">
            <Link 
              to="/" 
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-8 py-3.5 rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
            >
              Return to Center
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Team Directory</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Manage and view all Wizdent field personnel and administrators.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            to="/admin" 
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10"
          >
            <Shield className="w-3.5 h-3.5" />
            Admin Console
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name, email, or dealer code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/5 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 hidden md:block" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="flex-1 md:flex-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5"
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.ADMIN}>Administrators</option>
            <option value={UserRole.MANAGER}>Sales Managers</option>
            <option value={UserRole.DEALER}>Field Dealers</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Accessing Directory...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <p className="text-sm font-bold text-rose-600">{error}</p>
          <button onClick={fetchUsers} className="text-[10px] font-black text-white bg-rose-500 px-6 py-2.5 rounded-xl uppercase tracking-widest">Retry Sync</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map(user => (
            <Link 
              key={user.id}
              to={`/users/${user.id}`}
              className="group bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-transform group-hover:scale-110",
                    user.role === UserRole.ADMIN ? "bg-slate-900 text-white" :
                    user.role === UserRole.MANAGER ? "bg-indigo-600 text-white" :
                    "bg-blue-50 text-blue-600 border border-blue-100"
                  )}>
                    {user.displayName?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                    user.role === UserRole.ADMIN ? "bg-slate-50 text-slate-900 border-slate-200" :
                    user.role === UserRole.MANAGER ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {user.role}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors truncate">{user.displayName}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium truncate">{user.email}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{user.territory || 'Remote'}</span>
                    </div>
                    {user.dealerCode && (
                      <div className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        CODE: {user.dealerCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between group-hover:bg-blue-50 transition-colors">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-600">View Full Profile</span>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          ))}

          {filteredUsers.length === 0 && (
            <div className="col-span-full py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-3xl flex items-center justify-center mx-auto border border-slate-100">
                <UsersIcon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">No users found</p>
                <p className="text-sm text-slate-500">Try adjusting your search or filters.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
