/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, where, limit, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Visit, UserRole } from '../types';
import { Car, Plus, Search, Calendar, ChevronRight, Trash2, MapPin } from 'lucide-react';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { TERRITORIES, getTerritoryName } from '../constants';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Visits() {
  const { user, profile, isAdmin, isDealer } = useAuth();
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchVisits = async () => {
    if (!user || !profile) return;
    
    try {
      const path = 'visits';
      let q;
      if (profile.role === UserRole.ADMIN) {
        q = query(collection(db, path), limit(100));
      } else if (profile.role === UserRole.MANAGER) {
        if (profile.territory) {
          q = query(
            collection(db, path), 
            where('territory', '>=', profile.territory),
            where('territory', '<=', profile.territory + '\uf8ff'),
            limit(100)
          );
        } else {
          // If manager but no territory, they can only see visits assigned to nothing
          q = query(collection(db, path), where('territory', '==', 'UNASSIGNED'), limit(1));
        }
      } else {
        // Dealer: can only see their own visits
        q = query(
          collection(db, path), 
          where('dealerUid', '==', user.uid),
          limit(100)
        );
      }
      
      let accountsQ;
      if (profile.role === UserRole.ADMIN) {
        accountsQ = query(collection(db, 'accounts'));
      } else if (profile.role === UserRole.MANAGER || profile.role === UserRole.DEALER) {
        if (profile.territory) {
          accountsQ = query(
            collection(db, 'accounts'),
            where('territory', '>=', profile.territory),
            where('territory', '<=', profile.territory + '\uf8ff')
          );
        } else {
          // If no territory, can't view any territory-restricted accounts
          accountsQ = query(collection(db, 'accounts'), where('territory', '==', 'UNASSIGNED'), limit(1));
        }
      } else {
        accountsQ = query(collection(db, 'accounts'), limit(1));
      }

      const [querySnapshot, accountsSnap] = await Promise.all([
        getDocs(q),
        getDocs(accountsQ)
      ]);

      const accountMap = new Map(accountsSnap.docs.map(doc => [doc.id, (doc.data() as any).name]));

      const data = querySnapshot.docs
        .map(doc => {
          const docData = doc.data() as any;
          return { 
            id: doc.id, 
            ...docData,
            name: docData.name || accountMap.get(docData.accountId) || 'Unknown Clinic'
          } as any;
        })
        .sort((a, b) => parseSafeDate(b.dateTime).getTime() - parseSafeDate(a.dateTime).getTime());
      setVisits(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'visits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, [user, profile]);

  const handleDeleteVisit = async (visitId: string) => {
    try {
      const batch = writeBatch(db);

      // Delete subcollections
      const soldSnap = await getDocs(collection(db, `visits/${visitId}/soldProducts`));
      soldSnap.docs.forEach(s => batch.delete(s.ref));

      const demoSnap = await getDocs(collection(db, `visits/${visitId}/demoProducts`));
      demoSnap.docs.forEach(d => batch.delete(d.ref));

      const freeSnap = await getDocs(collection(db, `visits/${visitId}/freeProducts`));
      freeSnap.docs.forEach(f => batch.delete(f.ref));

      // Delete the visit itself
      batch.delete(doc(db, 'visits', visitId));

      await batch.commit();
      setVisits(prev => prev.filter(v => v.id !== visitId));
      setConfirmDeleteId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `visits/${visitId}`);
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Visit Planning</h2>
          <p className="text-slate-500 text-sm">Schedule and manage field sales interactions.</p>
        </div>
        {isDealer && (
          <Link 
            to="/visits/new"
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <Plus className="w-4 h-4" />
            Plan New Visit
          </Link>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recent Activity</h3>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search visits..." 
              className="w-full sm:w-48 pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Dealer / Clinic</th>
                <th className="px-6 py-4">Visit Type</th>
                <th className="px-6 py-4 text-right">Revenue</th>
                <th className="px-6 py-4">Execution Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-slate-600">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8 bg-slate-50/20" />
                  </tr>
                ))
              ) : visits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No visits recorded yet. Start logging your first field activity.
                  </td>
                </tr>
              ) : (
                visits.map(visit => (
                  <tr key={visit.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 truncate max-w-[120px]">{format(parseSafeDate(visit.dateTime), 'MMM dd, yyyy')}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase">{format(parseSafeDate(visit.dateTime), 'hh:mm a')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 tracking-tight truncate max-w-[150px]">{visit.clinicName}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                          {visit.territory ? `${visit.territory} (${getTerritoryName(visit.territory)})` : (visit.area || 'General')}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-bold rounded uppercase border",
                        visit.visitType.includes('SELL') ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                        visit.visitType.includes('DEMO') ? "bg-blue-50 text-blue-700 border-blue-100" :
                        "bg-slate-50 text-slate-700 border-slate-100"
                      )}>
                        {visit.visitType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-xs font-bold text-slate-900">
                      ₹{visit.totalRevenue?.toLocaleString('en-IN') || '0'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                          visit.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          visit.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse" :
                          "bg-slate-50 text-slate-600 border-slate-200"
                        )}>
                          {visit.status || 'PLANNED'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && (
                          confirmDeleteId === visit.id ? (
                            <div className="flex items-center gap-1 animate-in fade-in zoom-in-95">
                              <button 
                                onClick={() => handleDeleteVisit(visit.id)}
                                className="p-1 px-2 bg-red-600 text-white rounded text-[9px] font-bold uppercase"
                              >
                                Confirm
                              </button>
                              <button 
                                onClick={() => setConfirmDeleteId(null)}
                                className="p-1 px-2 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => setConfirmDeleteId(visit.id)}
                              className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )
                        )}
                        <Link 
                          to={`/visits/${visit.id}`}
                          className="text-slate-300 hover:text-slate-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
