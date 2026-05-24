/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Visit } from '../types';
import { 
  User, 
  Mail, 
  Shield, 
  ShieldCheck,
  MapPin, 
  Building2, 
  Calendar,
  TrendingUp,
  Package,
  Clock,
  LogOut
} from 'lucide-react';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { format } from 'date-fns';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { TERRITORIES, getTerritoryName } from '../constants';

export default function Profile() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalRevenue: 0,
    conversions: 0
  });
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDealerStats() {
      if (!profile || profile.role !== UserRole.DEALER) {
        setLoading(false);
        return;
      }

      try {
        const visitsQ = query(
          collection(db, 'visits'),
          where('dealerUid', '==', profile.uid)
        );
        const snapshot = await getDocs(visitsQ);
        const visits = snapshot.docs.map(doc => doc.data() as Visit);
        
        const totalRevenue = visits.reduce((acc, v) => acc + (v.totalRevenue || 0), 0);
        const conversions = visits.filter(v => v.visitConverted).length;

        setStats({
          totalVisits: visits.length,
          totalRevenue,
          conversions
        });

        // Fetch recent visits
        const recentQ = query(
          collection(db, 'visits'),
          where('dealerUid', '==', profile.uid),
          orderBy('dateTime', 'desc'),
          limit(5)
        );
        const recentSnap = await getDocs(recentQ);
        setRecentVisits(recentSnap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)));

      } catch (error) {
        // Fallback for missing indexes or permissions
        console.warn("Could not fetch profile stats", error);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && profile) {
      fetchDealerStats();
    }
  }, [profile, authLoading]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (e) {
      console.error(e);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Profile Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 rounded-3xl bg-slate-100 flex items-center justify-center border-4 border-white shadow-xl shadow-slate-200 overflow-hidden shrink-0">
              <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <User className="w-16 h-16 text-slate-400" />
              </div>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                <h1 className="text-3xl font-black tracking-tight text-slate-900">{profile.displayName}</h1>
                <span className={cn(
                  "inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                  profile.role === UserRole.ADMIN ? "bg-red-50 text-red-700 border-red-100" :
                  profile.role === UserRole.MANAGER ? "bg-amber-50 text-amber-700 border-amber-100" :
                  "bg-blue-50 text-blue-700 border-blue-100"
                )}>
                  {profile.role}
                </span>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <Mail className="w-4 h-4" />
                  <span className="text-sm font-medium">{profile.email}</span>
                </div>
                {profile.territory && (
                  <div className="flex items-center gap-2 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{profile.territory} ({getTerritoryName(profile.territory)})</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm font-medium">Joined {format(parseSafeDate(profile.createdAt), 'MMM yyyy')}</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleLogout}
              className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {profile.role === UserRole.DEALER && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl w-fit mb-6">
              <Package className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Visits</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">{stats.totalVisits}</p>
          </div>
          
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit mb-6">
              <TrendingUp className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">₹{stats.totalRevenue.toLocaleString('en-IN')}</p>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl w-fit mb-6">
              <Shield className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Conversions</p>
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              {stats.conversions} 
              <span className="text-sm font-medium text-slate-400 ml-2 tracking-normal">
                ({stats.totalVisits > 0 ? Math.round((stats.conversions / stats.totalVisits) * 100) : 0}%)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Account Info Card */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Account Credentials</h2>
          </div>
        </div>
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 text-sm">
          {profile.role === UserRole.DEALER && (
            <div className="space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Official Dealer Code</p>
              <div className="flex items-center gap-3">
                <div className="px-5 py-3 bg-slate-950 text-white rounded-2xl font-mono text-lg font-black tracking-wider shadow-xl shadow-slate-200 border-t border-slate-700 select-all transition-transform hover:scale-105 duration-300">
                  {profile.dealerCode || 'PENDING'}
                </div>
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[10px] font-bold text-slate-400 italic">This code uniquely identifies your franchise in our network.</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Permission Tier</p>
              <div className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
                {profile.role === UserRole.DEALER ? 'Direct Dealer Access' : profile.role}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Assigned Territory</p>
              <div className="font-bold text-slate-900 flex items-center gap-2 text-base">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                {profile.territory ? `${profile.territory} - ${getTerritoryName(profile.territory)}` : 'Unassigned'}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-2 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                Account Active Since {format(parseSafeDate(profile.createdAt), 'MMMM dd, yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {profile.role === UserRole.DEALER && recentVisits.length > 0 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">Recent Visits Logged</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentVisits.map(v => (
              <div key={v.id} onClick={() => navigate(`/visits/${v.id}`)} className="p-6 hover:bg-slate-50/50 transition-all cursor-pointer group">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{v.name || 'Untitled Visit'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{format(parseSafeDate(v.dateTime), 'MMM dd, hh:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{v.totalRevenue.toLocaleString('en-IN')}</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{v.visitType}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
