/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { collectionGroup, getDocs, orderBy, query, collection, writeBatch, doc, where, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Contact, Account, UserRole } from '../types';
import { Building2, Plus, Search, Mail, Phone, Users, X, Filter, ArrowRight, AlertCircle } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchableLookup } from '../components/SearchableLookup';

export default function Contacts() {
  const { isAdmin, isDealer, profile } = useAuth();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<(Contact & { id: string })[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    specialty: '',
    accountId: ''
  });

  async function fetchContacts() {
    try {
      const q = query(collectionGroup(db, 'contacts'), orderBy('firstName', 'asc'));
      const querySnapshot = await getDocs(q);
      setContacts(querySnapshot.docs.map(doc => {
        const data = doc.data();
        const accountId = data.accountId || doc.ref.parent.parent?.id;
        return {
          id: doc.id,
          ...data,
          accountId
        } as Contact & { id: string };
      }));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContacts();
    
    // Fetch accounts for the selection dropdown
    async function fetchAccounts() {
      if (!profile) return;
      try {
        let q;
        if (profile.role === UserRole.ADMIN) {
          q = query(collection(db, 'accounts'), orderBy('name', 'asc'));
        } else if (profile.role === UserRole.MANAGER || profile.role === UserRole.DEALER) {
          if (profile.territory) {
             q = query(
              collection(db, 'accounts'),
              where('territory', '>=', profile.territory),
              where('territory', '<=', profile.territory + '\uf8ff')
            );
          } else {
             q = query(collection(db, 'accounts'), where('territory', '==', 'UNASSIGNED'), limit(1));
          }
        } else {
          q = query(collection(db, 'accounts'), limit(1));
        }

        const accSnap = await getDocs(q);
        setAccounts(accSnap.docs.map(d => {
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
        }));
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    }
    fetchAccounts();
  }, [profile]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!formData.accountId) {
      setError("Please select an Account.");
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const newContactRef = doc(collection(db, `accounts/${formData.accountId}/contacts`));
      
      const payload = {
        ...formData,
        createdAt: new Date().toISOString()
      };

      batch.set(newContactRef, payload);
      await batch.commit();
      
      setShowAddModal(false);
      setFormData({ firstName: '', lastName: '', email: '', mobile: '', specialty: '', accountId: '' });
      fetchContacts();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `accounts/${formData.accountId}/contacts`);
    } finally {
      setSaving(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    `${contact.firstName} ${contact.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Contact Management</h2>
          <p className="text-slate-500 text-sm">Manage doctors, dentists, and clinical staff.</p>
        </div>
        {(isAdmin || isDealer) && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 tracking-tight text-sm uppercase tracking-widest">Add New Contact</h3>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                }} 
                className="p-2 hover:bg-white border hover:border-gray-200 rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddContact} className="p-6 space-y-5">
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
                  <input
                    required
                    type="text"
                    value={formData.firstName}
                    onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
                  <input
                    required
                    type="text"
                    value={formData.lastName}
                    onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  />
                </div>
              </div>

              <SearchableLookup 
                label="Associated Clinic / Dealer"
                options={accounts.map(acc => ({
                  id: acc.id,
                  label: acc.name,
                  subLabel: acc.territory
                }))}
                value={formData.accountId}
                onChange={id => setFormData(f => ({ ...f, accountId: id }))}
                placeholder="Search to link contact..."
                required
              />

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specialty</label>
                <input
                  type="text"
                  placeholder="e.g. Orthodontist"
                  value={formData.specialty}
                  onChange={e => setFormData(f => ({ ...f, specialty: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
                  <input
                    required
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile</label>
                  <input
                    type="text"
                    value={formData.mobile}
                    onChange={e => setFormData(f => ({ ...f, mobile: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                  />
                </div>
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
                  disabled={saving || !formData.accountId}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20"
                >
                  {saving ? "Saving..." : "Add Contact"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-md text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4">Full Name</th>
                <th className="px-6 py-4">Specialty</th>
                <th className="px-6 py-4">Contact Info</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-slate-600">
              {loading ? (
                [1, 2, 3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={4} className="px-6 py-8 bg-slate-50/20" />
                  </tr>
                ))
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                    {searchTerm ? "No contacts match your search." : "No contacts found. Contacts are added within Dental Clinics."}
                  </td>
                </tr>
              ) : (
                filteredContacts.map(contact => {
                  const account = accounts.find(a => a.id === contact.accountId);
                  return (
                    <tr key={contact.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm uppercase group-hover:scale-110 transition-transform">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{contact.firstName} {contact.lastName}</div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase mt-1">
                              <Building2 className="w-3 h-3 text-slate-300" />
                              {account?.name || 'Searching...'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 text-[9px] font-black rounded border bg-slate-50 text-slate-500 border-slate-200 uppercase tracking-widest">
                          {contact.specialty || 'General Practitioner'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold group-hover:text-slate-600 transition-colors">
                            <Mail className="w-3 h-3 text-slate-300" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono font-bold group-hover:text-slate-600 transition-colors">
                            <Phone className="w-3 h-3 text-slate-300" />
                            <span>{contact.mobile}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/accounts/${contact.accountId}/contacts/${contact.id}`}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-black text-[10px] uppercase tracking-widest px-3 py-1.5 bg-blue-50 rounded-lg transition-all hover:bg-blue-100 active:scale-95"
                        >
                          View Detail
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
