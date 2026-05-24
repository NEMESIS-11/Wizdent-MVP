/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { UserRole, Visit, Product, Account, UserProfile } from '../types';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Building2, 
  Download, 
  Filter,
  ArrowUpDown,
  Search,
  Activity,
  TrendingUp
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';

enum ReportTab {
  DEALERS = 'Dealers',
  CLINICS = 'Clinics',
  PRODUCTS = 'Products',
  MARGIN = 'Margin Analysis'
}

export default function Reports() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState(ReportTab.DEALERS);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchReportData() {
      if (!profile) return;
      setLoading(true);
      setData([]); // Reset data on tab change
      
      try {
        if (profile.role === UserRole.DEALER) {
          setLoading(false);
          return;
        }

        if (activeTab === ReportTab.DEALERS) {
          // Fetch dealer users and aggregate their visits
          let usersSnap;
          try {
            let usersQ;
            if (profile.role === UserRole.ADMIN) {
              usersQ = query(collection(db, 'users'), where('role', '==', UserRole.DEALER));
            } else {
              // MANAGER
              if (profile.territory) {
                usersQ = query(
                  collection(db, 'users'), 
                  where('role', '==', UserRole.DEALER), 
                  where('territory', '>=', profile.territory),
                  where('territory', '<=', profile.territory + '\uf8ff')
                );
              } else {
                usersQ = query(collection(db, 'users'), where('role', '==', 'NONE'));
              }
            }
            usersSnap = await getDocs(usersQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'users');
            return;
          }
          const dealers = usersSnap.docs.map(d => ({ uid: d.id, ...(d.data() as object) } as UserProfile));
          
          let visitsSnap;
          try {
            let visitsQ;
            if (profile.role === UserRole.ADMIN) {
              visitsQ = query(collection(db, 'visits'));
            } else {
              if (profile.territory) {
                visitsQ = query(
                  collection(db, 'visits'), 
                  where('territory', '>=', profile.territory),
                  where('territory', '<=', profile.territory + '\uf8ff')
                );
              } else {
                visitsQ = query(collection(db, 'visits'), where('territory', '==', 'NONE'));
              }
            }
            visitsSnap = await getDocs(visitsQ);
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'visits');
            return;
          }
          const visits = visitsSnap.docs.map(d => d.data() as Visit);

          const tableData = dealers.map(dealer => {
            const dealerVisits = visits.filter(v => v.dealerUid === dealer.uid);
            return {
              id: dealer.uid,
              name: dealer.displayName || 'Unnamed Dealer',
              visits: dealerVisits.length,
              revenue: dealerVisits.reduce((acc, v) => acc + (v.totalRevenue || 0), 0),
              conversion: dealerVisits.length > 0 ? (dealerVisits.filter(v => v.visitConverted).length / dealerVisits.length) * 100 : 0,
              slab: dealer.slab || 'N/A'
            };
          });
          setData(tableData);
        } else if (activeTab === ReportTab.CLINICS) {
           let clinicsSnap;
           try {
             let clinicsQ;
             if (profile.role === UserRole.ADMIN) {
               clinicsQ = query(collection(db, 'accounts'));
             } else {
               // Manager reporting focuses on their territory
               if (profile.territory) {
                 clinicsQ = query(
                   collection(db, 'accounts'), 
                   where('territory', '>=', profile.territory),
                   where('territory', '<=', profile.territory + '\uf8ff')
                 );
               } else {
                 clinicsQ = query(collection(db, 'accounts'), where('territory', '==', 'NONE'));
               }
             }
             clinicsSnap = await getDocs(clinicsQ);
           } catch (e) {
             handleFirestoreError(e, OperationType.LIST, 'accounts');
             return;
           }
           const clinics = clinicsSnap.docs.map(d => {
             const docData = d.data() as any;
             // Sanitize: move legacy fields to camelCase properties if they exist
             const noOfPatients = docData.noOfPatients ?? docData['AVG PATIENTS / MONTH'] ?? 0;
             const clinicType = docData.clinicType ?? docData['CLINIC TYPE'] ?? '';
             const dealerCode = docData.dealerCode ?? docData['DEALER CODE'] ?? '';
             const resellerLandingCost = docData.resellerLandingCost ?? docData['RESELLER LANDING COST'] ?? 0;
             
             const { 
                'AVG PATIENTS / MONTH': _, 
                'CLINIC TYPE': __, 
                'DEALER CODE': ___, 
                'RESELLER LANDING COST': ____, 
                ...cleanData 
             } = docData;

             return { 
                id: d.id, 
                ...cleanData,
                noOfPatients: Number(noOfPatients),
                clinicType: clinicType,
                dealerCode: dealerCode,
                resellerLandingCost: Number(resellerLandingCost)
             } as Account;
           });
           
           let visitsSnap;
           try {
             let visitsQ;
             if (profile.role === UserRole.ADMIN) {
               visitsQ = query(collection(db, 'visits'));
             } else {
               if (profile.territory) {
                 visitsQ = query(
                   collection(db, 'visits'), 
                   where('territory', '>=', profile.territory),
                   where('territory', '<=', profile.territory + '\uf8ff')
                 );
               } else {
                 visitsQ = query(collection(db, 'visits'), where('territory', '==', 'NONE'));
               }
             }
             visitsSnap = await getDocs(visitsQ);
           } catch (e) {
             handleFirestoreError(e, OperationType.LIST, 'visits');
             return;
           }
           const visits = visitsSnap.docs.map(d => d.data() as Visit);

           const tableData = clinics.map(clinic => {
             const clinicVisits = visits.filter(v => v.accountId === clinic.id);
             return {
               id: clinic.id,
               name: clinic.name,
               totalVisits: clinicVisits.length,
               totalSpend: clinicVisits.reduce((acc, v) => acc + (v.totalRevenue || 0), 0),
               lastVisit: clinicVisits.length > 0 ? clinicVisits[0].dateTime : 'N/A'
             };
           });
           setData(tableData);
        } else if (activeTab === ReportTab.MARGIN) {
          // Aggregate margin info
          let visitsQ;
          if (profile.role === UserRole.ADMIN) {
            visitsQ = query(collection(db, 'visits'));
          } else {
            if (profile.territory) {
              visitsQ = query(
                collection(db, 'visits'), 
                where('territory', '>=', profile.territory),
                where('territory', '<=', profile.territory + '\uf8ff')
              );
            } else {
              visitsQ = query(collection(db, 'visits'), where('territory', '==', 'NONE'));
            }
          }
          let visitsSnap = await getDocs(visitsQ);
          const visits = visitsSnap.docs.map(d => ({ id: d.id, ...(d.data() as object) } as any));
          
          let usersQ;
          if (profile.role === UserRole.ADMIN) {
            usersQ = query(collection(db, 'users'), where('role', '==', UserRole.DEALER));
          } else {
            if (profile.territory) {
              usersQ = query(
                collection(db, 'users'), 
                where('role', '==', UserRole.DEALER), 
                where('territory', '>=', profile.territory),
                where('territory', '<=', profile.territory + '\uf8ff')
              );
            } else {
              usersQ = query(collection(db, 'users'), where('role', '==', 'NONE'));
            }
          }
          let usersSnap = await getDocs(usersQ);
          const dealers = usersSnap.docs.map(d => ({ uid: d.id, ...(d.data() as object) } as UserProfile));

          const tableData = dealers.map(dealer => {
            const dealerVisits = visits.filter(v => v.dealerUid === dealer.uid);
            const revenue = dealerVisits.reduce((acc, v) => acc + (v.totalRevenue || 0), 0);
            const cost = dealerVisits.reduce((acc, v) => acc + (v.totalPILSalesValue ? v.totalPILSalesValue * 0.7 : 0), 0); // Simulated cost based on 70% of list price
            return {
              id: dealer.uid,
              name: dealer.displayName || 'Unnamed Dealer',
              revenue,
              margin: revenue - cost,
              marginPercent: revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0
            };
          });
          setData(tableData);
        } else {
          // Products
          let prodSnap;
          try {
            prodSnap = await getDocs(collection(db, 'products'));
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, 'products');
            return;
          }
          setData(prodSnap.docs.map(d => ({ id: d.id, ...(d.data() as object) })));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'reports_general');
      } finally {
        setLoading(false);
      }
    }

    fetchReportData();
  }, [activeTab, profile]);

  if (profile?.role === UserRole.DEALER) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mb-4 animate-bounce">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Restricted Access</h2>
        <p className="text-slate-400 mt-2">Personal reports are coming soon. Global reports are for Managers & Admins only.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">Advanced Analytics</h2>
          <p className="text-slate-500 text-sm">Deep dive into sales performance and clinic engagement.</p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 sm:py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10">
          <Download className="w-4 h-4" />
          Export Datatable
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl w-fit border border-slate-200">
          {Object.values(ReportTab).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
             {activeTab === ReportTab.DEALERS && <Users className="w-5 h-5 text-blue-500" />}
             {activeTab === ReportTab.CLINICS && <Building2 className="w-5 h-5 text-emerald-500" />}
             {activeTab === ReportTab.PRODUCTS && <BarChart3 className="w-5 h-5 text-indigo-500" />}
             <h3 className="font-bold text-slate-900">{activeTab} Performance</h3>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
             <div className="relative flex-1 sm:flex-none">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Filter data..." 
                  className="w-full sm:w-48 pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
                />
             </div>
             <button className="p-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                <Filter className="w-4 h-4 text-slate-500" />
             </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === ReportTab.DEALERS && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <tr className="border-b border-gray-50">
                  <th className="px-8 py-4">Dealer Name</th>
                  <th className="px-8 py-4">Slab</th>
                  <th className="px-8 py-4">Visits Logged</th>
                  <th className="px-8 py-4">Total Revenue</th>
                  <th className="px-8 py-4">Conv. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-slate-600">
                {loading ? (
                  [1, 2, 3].map(i => <tr key={`skeleton-dealers-${i}`}><td colSpan={5} className="px-8 py-6 animate-pulse bg-slate-50/50" /></tr>)
                ) : data.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{item.name}</td>
                    <td className="px-8 py-5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">{item.slab}</span>
                    </td>
                    <td className="px-8 py-5 font-mono text-xs text-slate-500">{item.visits}</td>
                    <td className="px-8 py-5 font-bold text-slate-900">₹{item.revenue?.toLocaleString('en-IN') || '0'}</td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2">
                         <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                            <div className="h-full bg-slate-900" style={{ width: `${item.conversion}%` }} />
                         </div>
                         <span className="font-bold text-xs truncate">{(item.conversion || 0).toFixed(1)}%</span>
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === ReportTab.CLINICS && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <tr className="border-b border-gray-50">
                  <th className="px-8 py-4">Clinic Name</th>
                  <th className="px-8 py-4">Total Interactions</th>
                  <th className="px-8 py-4">LTV (Life Time Value)</th>
                  <th className="px-8 py-4">Engagement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-slate-600">
                {loading ? (
                  [1, 2, 3].map(i => <tr key={`skeleton-clinics-${i}`}><td colSpan={4} className="px-8 py-6 animate-pulse bg-slate-50/50" /></tr>)
                ) : data.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{item.name}</td>
                    <td className="px-8 py-5 font-mono text-xs">{item.totalVisits}</td>
                    <td className="px-8 py-5 font-bold text-slate-900">₹{item.totalSpend?.toLocaleString('en-IN') || '0'}</td>
                    <td className="px-8 py-5">
                       <span className={cn(
                         "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                         item.totalVisits > 5 ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                       )}>
                         {item.totalVisits > 5 ? 'High Engagement' : 'Growing'}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === ReportTab.MARGIN && (
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50/50 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <tr className="border-b border-gray-50">
                  <th className="px-8 py-4">Dealer Name</th>
                  <th className="px-8 py-4">Total Revenue</th>
                  <th className="px-8 py-4">Estimated Margin</th>
                  <th className="px-8 py-4">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-slate-600">
                {loading ? (
                  [1, 2, 3].map(i => <tr key={`skeleton-margin-${i}`}><td colSpan={4} className="px-8 py-6 animate-pulse bg-slate-50/50" /></tr>)
                ) : data.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-5 font-bold text-slate-900">{item.name}</td>
                    <td className="px-8 py-5 font-bold text-slate-900">₹{item.revenue?.toLocaleString('en-IN') || '0'}</td>
                    <td className="px-8 py-5 text-emerald-600 font-bold">₹{item.margin?.toLocaleString('en-IN') || '0'}</td>
                    <td className="px-8 py-5">
                       <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold">
                         {(item.marginPercent || 0).toFixed(1)}%
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === ReportTab.PRODUCTS && (
            <div className="p-8 text-center text-slate-400 italic">
               Product sales aggregation requires cross-collection sub-queries. Coming in V2.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendingBadge({ value }: { value: boolean }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
      value ? "text-emerald-600 bg-emerald-50" : "text-amber-600 bg-amber-50"
    )}>
      {value ? <TrendingUp className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
      {value ? '+12%' : 'Steady'}
    </div>
  );
}

