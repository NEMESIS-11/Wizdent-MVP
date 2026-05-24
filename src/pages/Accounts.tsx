/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, writeBatch, doc, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account, AccountType, UserRole } from '../types';
import { Building2, Plus, Filter, Search, Trash2, CheckCircle2, ShieldCheck, MapPin, ExternalLink, MoreVertical, X } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { TERRITORIES, getTerritoryName } from '../constants';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Accounts() {
  const { isAdmin, profile } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AccountType | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: AccountType.CLINIC,
    territory: '',
    dealerCode: '',
    address: '',
    noOfPatients: 0,
    clinicType: '',
    resellerLandingCost: 0,
    slab: 'Regular'
  });

  async function fetchAccounts() {
    const path = 'accounts';
    try {
      let q;
      if (profile?.role === UserRole.DEALER) {
        // Dealers only see clinics in their territory
        if (profile.territory) {
          q = query(
            collection(db, path), 
            where('type', '==', AccountType.CLINIC),
            where('territory', '>=', profile.territory),
            where('territory', '<=', profile.territory + '\uf8ff')
          );
        } else {
          // If dealer but no territory, they see nothing or unassigned
          q = query(collection(db, path), where('type', '==', AccountType.CLINIC), where('territory', '==', 'UNASSIGNED'), limit(1));
        }
      } else if (profile?.role === UserRole.MANAGER) {
        // Managers see hierarchical territory accounts
        if (profile.territory) {
          q = query(
            collection(db, path),
            where('territory', '>=', profile.territory),
            where('territory', '<=', profile.territory + '\uf8ff')
          );
        } else {
          q = query(collection(db, path), where('territory', '==', 'UNASSIGNED'), limit(1));
        }
      } else if (profile?.role === UserRole.ADMIN) {
        q = query(collection(db, path));
      } else {
        // Fallback for unset profile or unknown roles
        q = query(collection(db, path), limit(1));
      }
      
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data() as any;
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
          id: doc.id, 
          ...cleanData,
          noOfPatients: Number(noOfPatients),
          clinicType: clinicType,
          dealerCode: dealerCode,
          resellerLandingCost: Number(resellerLandingCost)
        } as Account;
      });

      // Sort by name client-side since range queries limit server-side ordering options
      data.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      
      setAccounts(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    } finally {
      setLoading(false);
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const batch = writeBatch(db);
      const newAccRef = doc(collection(db, 'accounts'));
      
      const payload = {
        ...formData,
        noOfPatients: Number(formData.noOfPatients),
        resellerLandingCost: Number(formData.resellerLandingCost || 0),
        visitCounter: 0,
        firstConvertedVisit: false,
        createdAt: new Date().toISOString()
      };

      batch.set(newAccRef, payload);
      await batch.commit();
      
      setShowAddModal(false);
      setFormData({
        name: '',
        type: AccountType.CLINIC,
        territory: '',
        dealerCode: '',
        address: '',
        noOfPatients: 0,
        clinicType: '',
        resellerLandingCost: 0,
        slab: 'Regular'
      });
      await fetchAccounts();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'accounts');
    } finally {
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (profile) {
      fetchAccounts();
    }
  }, [profile]);

  const filteredAccounts = accounts.filter(acc => filter === 'ALL' || acc.type === filter);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredAccounts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAccounts.map(a => a.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      const idsToDelete: string[] = Array.from(selectedIds);

      for (const accountId of idsToDelete) {
        // 1. Delete Contacts subcollection
        const contactsSnap = await getDocs(collection(db, `accounts/${accountId}/contacts`));
        contactsSnap.docs.forEach(d => batch.delete(d.ref));

        // 2. Delete Visits and their sub-items
        const visitsSnap = await getDocs(query(collection(db, 'visits'), where('accountId', '==', accountId)));
        for (const visitDoc of visitsSnap.docs) {
          const soldSnap = await getDocs(collection(db, `visits/${visitDoc.id}/soldProducts`));
          soldSnap.docs.forEach(s => batch.delete(s.ref));
          const demoSnap = await getDocs(collection(db, `visits/${visitDoc.id}/demoProducts`));
          demoSnap.docs.forEach(d => batch.delete(d.ref));
          const freeSnap = await getDocs(collection(db, `visits/${visitDoc.id}/freeProducts`));
          freeSnap.docs.forEach(f => batch.delete(f.ref));
          batch.delete(visitDoc.ref);
        }

        // 3. Delete Account
        batch.delete(doc(db, 'accounts', accountId));
      }

      await batch.commit();
      setSelectedIds(new Set());
      setShowBulkConfirm(false);
      await fetchAccounts();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'bulk_accounts');
      setShowBulkConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Account Management</h2>
          <p className="text-slate-500 text-sm">Manage clinics and dealer partners.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
        >
          <Plus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 tracking-tight text-sm uppercase tracking-widest">Register Account</h3>
              </div>
              <button 
                onClick={() => setShowAddModal(false)} 
                className="p-2 hover:bg-white border hover:border-gray-200 rounded-xl transition-all"
              >
                <Filter className="w-5 h-5 text-slate-400 rotate-45" /> {/* Using Filter as X since X not imported here */}
              </button>
            </div>
            
            <form onSubmit={handleAddAccount} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Name</label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  placeholder="Clinic or Dealer Name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
                  <select
                    disabled={profile?.role === UserRole.DEALER}
                    value={formData.type}
                    onChange={e => setFormData(f => ({ ...f, type: e.target.value as AccountType }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all disabled:opacity-50"
                  >
                    <option value={AccountType.CLINIC}>Clinic</option>
                    {profile?.role !== UserRole.DEALER && <option value={AccountType.DEALER}>Dealer</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Territory</label>
                  <select
                    required
                    value={formData.territory}
                    onChange={e => setFormData(f => ({ ...f, territory: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                  >
                    <option value="">Select Territory...</option>
                    {TERRITORIES.map(t => (
                      <option key={t.code} value={t.code}>
                        {t.code} - {t.name} ({t.region})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formData.type === AccountType.DEALER ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dealer Code</label>
                    <input
                      required
                      type="text"
                      value={formData.dealerCode}
                      onChange={e => setFormData(f => ({ ...f, dealerCode: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="WZ-DL-001"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reseller Landing Cost</label>
                    <input
                      type="number"
                      value={formData.resellerLandingCost}
                      onChange={e => setFormData(f => ({ ...f, resellerLandingCost: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      placeholder="₹"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clinic Type</label>
                    <input
                      type="text"
                      value={formData.clinicType}
                      onChange={e => setFormData(f => ({ ...f, clinicType: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                      placeholder="e.g. Private, Chain"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Avg Patients / Month</label>
                    <input
                      required
                      type="number"
                      value={formData.noOfPatients}
                      onChange={e => setFormData(f => ({ ...f, noOfPatients: Number(e.target.value) }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-20 resize-none"
                  placeholder="Full physical address..."
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                >
                  {isAdding ? "Registering..." : "Confirm Entity Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <button 
                onClick={() => setFilter('ALL')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  filter === 'ALL' ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-slate-400 hover:text-slate-600"
                )}
              >
                All
              </button>
              <button 
                onClick={() => setFilter(AccountType.CLINIC)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  filter === AccountType.CLINIC ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Clinics
              </button>
              {profile?.role !== UserRole.DEALER && (
                <button 
                  onClick={() => setFilter(AccountType.DEALER)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                    filter === AccountType.DEALER ? "bg-white text-blue-600 shadow-sm border border-gray-200" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  Dealers
                </button>
              )}
            </div>

            <div className="flex items-center gap-4">
              {isAdmin && selectedIds.size > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2 py-1 px-3 bg-red-50/50 border border-red-100 rounded-lg">
                  <span className="text-[10px] font-black text-red-500 uppercase tracking-widest leading-none">{selectedIds.size} Selected</span>
                  
                  {showBulkConfirm ? (
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        {isDeleting ? "..." : "Delete All"}
                      </button>
                      <button 
                        onClick={() => setShowBulkConfirm(false)}
                        disabled={isDeleting}
                        className="px-2 py-1 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase tracking-widest disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setShowBulkConfirm(true)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white hover:bg-red-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Bulk Delete
                    </button>
                  )}
                </div>
              )}

              <div className="relative flex-1 md:flex-none min-w-[200px]">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search clinics..." 
                  className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 w-10">
                  <input 
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === filteredAccounts.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4">Account Name</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Territory</th>
                <th className="px-6 py-4">Code / Info</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-slate-600">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    No accounts found. Start by adding your first clinic or dealer.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map(acc => (
                  <tr 
                    key={acc.id} 
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors group",
                      selectedIds.has(acc.id) && "bg-blue-50/30"
                    )}
                  >
                    <td className="px-6 py-4">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(acc.id)}
                        onChange={() => toggleSelect(acc.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                          selectedIds.has(acc.id) ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
                        )}>
                          {acc.type === AccountType.DEALER ? <ShieldCheck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="font-black text-slate-900 leading-none">{acc.name}</div>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1 truncate max-w-[150px]">{acc.address || 'No Address'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-0.5 text-[9px] font-black rounded uppercase border tracking-widest",
                        acc.type === AccountType.CLINIC 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-indigo-50 text-indigo-700 border-indigo-100"
                      )}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-500">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900">{acc.territory}</span>
                        <span className="text-[9px] text-slate-400 uppercase tracking-tight">{getTerritoryName(acc.territory)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {acc.type === AccountType.DEALER ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Code: {acc.dealerCode || 'N/A'}</span>
                          <span className="text-xs font-mono font-bold text-emerald-600">₹{acc.resellerLandingCost?.toLocaleString('en-IN') || '0'}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{acc.clinicType || 'Private Clinic'}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Avg Patients: {acc.noOfPatients || 0}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/accounts/${acc.id}`}
                        className="text-blue-600 hover:underline font-bold text-[10px] uppercase tracking-widest"
                      >
                        Detail
                      </Link>
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
