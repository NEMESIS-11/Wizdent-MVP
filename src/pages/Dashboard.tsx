/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Visit, UserRole } from '../types';
import { 
  TrendingUp, 
  Users, 
  Package, 
  Activity, 
  ArrowUpRight, 
  Calendar
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { format, subDays } from 'date-fns';
import { TERRITORIES, getTerritoryName } from '../constants';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalRevenue: 0,
    visitCount: 0,
    conversionRate: 0,
    activeClinics: 0
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user || !profile) return;
      
      try {
        const visitsPath = 'visits';
        let visitsQuery;
        
        if (profile.role === UserRole.ADMIN) {
          visitsQuery = query(collection(db, visitsPath), limit(500));
        } else if (profile.role === UserRole.MANAGER) {
          if (profile.territory) {
            visitsQuery = query(
              collection(db, visitsPath),
              where('territory', '==', profile.territory),
              limit(500)
            );
          } else {
            // No territory assigned, show empty or default
            visitsQuery = query(collection(db, visitsPath), where('territory', '==', 'NONE'), limit(1));
          }
        } else {
          visitsQuery = query(
            collection(db, visitsPath), 
            where('dealerUid', '==', user.uid),
            limit(500)
          );
        }

        const snapshot = await getDocs(visitsQuery);
        const visits = snapshot.docs
          .map(doc => {
            const data = doc.data() as any;
            return { id: doc.id, ...data } as Visit;
          })
          .sort((a, b) => parseSafeDate(b.dateTime).getTime() - parseSafeDate(a.dateTime).getTime());

        // Aggregations
        const totalRev = visits.reduce((acc, v) => acc + (v.totalRevenue || 0), 0);
        const converted = visits.filter(v => v.visitConverted).length;
        const uniqueClinics = new Set(visits.map(v => v.accountId)).size;

        setStats({
          totalRevenue: totalRev,
          visitCount: visits.length,
          conversionRate: visits.length > 0 ? (converted / visits.length) * 100 : 0,
          activeClinics: uniqueClinics
        });

        // Chart Data (Last 7 days)
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
          const date = subDays(new Date(), i);
          return {
            date: format(date, 'MMM dd'),
            timestamp: date.getTime(),
            revenue: 0,
            visits: 0
          };
        }).reverse();

        visits.forEach(v => {
          const vDate = parseSafeDate(v.dateTime);
          const day = last7Days.find(d => d.date === format(vDate, 'MMM dd'));
          if (day) {
            day.revenue += (v.totalRevenue || 0);
            day.visits += 1;
          }
        });

        setChartData(last7Days);

      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'dashboard_stats');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user, profile]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Command Center</h2>
          <p className="text-slate-500 text-sm">
            {profile?.territory ? `Real-time analytics for ${getTerritoryName(profile.territory)}` : 'Real-time performance analytics and field activity.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <div className="flex-1 sm:flex-none flex items-center justify-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 bg-white px-4 py-2.5 md:py-2 rounded-lg border border-gray-200">
            <Calendar className="w-3.5 h-3.5" />
            Last 30 Days
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          label="Total Revenue" 
          value={`₹${stats.totalRevenue?.toLocaleString('en-IN') || '0'}`}
          trend="+12.5%"
          icon={TrendingUp}
          color="blue"
          loading={loading}
        />
        <KpiCard 
          label="Field Visits" 
          value={stats.visitCount.toString()}
          trend="+8.2%"
          icon={Activity}
          color="indigo"
          loading={loading}
        />
        <KpiCard 
          label="Conv. Rate" 
          value={`${(stats.conversionRate || 0).toFixed(1)}%`}
          trend="+2.4%"
          icon={ArrowUpRight}
          color="emerald"
          loading={loading}
        />
        <KpiCard 
          label="Active Clinics" 
          value={stats.activeClinics.toString()}
          trend="+3"
          icon={Users}
          color="amber"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Revenue Performance</h3>
              <p className="text-lg font-bold text-slate-900 tracking-tight">Sales Trends (Last 7 Days)</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Revenue</span>
              </div>
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                  tickFormatter={(value) => `₹${value}`}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800">
                          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">{payload[0].payload.date}</p>
                          <p className="text-sm font-bold">₹{payload[0].value?.toLocaleString('en-IN')}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorRev)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Secondary Metrics / Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-1">Volume Analysis</h3>
            <p className="text-lg font-bold text-slate-900 tracking-tight">Visits per Day</p>
          </div>

          <div className="h-[240px] mt-8">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                />
                <YAxis axisLine={false} tickLine={false} hide />
                <Tooltip 
                   cursor={{fill: '#f8fafc'}}
                   content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 p-2 rounded-md shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase">{payload[0].value} Visits</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="visits" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-50 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Productivity</p>
              <p className="text-xl font-bold text-slate-900">{((stats.visitCount || 0) / 7).toFixed(1)} <span className="text-xs font-medium text-slate-400">pd</span></p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Growth Index</p>
              <p className="text-xl font-bold text-blue-600">+14%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, trend, icon: Icon, color, loading }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100"
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm transition-all hover:translate-y-[-2px] hover:shadow-lg hover:shadow-slate-200/50">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider">
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <div className={cn("text-2xl font-bold text-slate-900 tracking-tight", loading && "h-8 bg-slate-100 animate-pulse rounded")}>
          {!loading && value}
        </div>
      </div>
    </div>
  );
}
