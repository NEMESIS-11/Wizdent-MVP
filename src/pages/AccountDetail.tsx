/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Account, Contact, Visit } from '../types';
import { Building2, ArrowLeft, ArrowRight, Users, Car, MapPin, Phone, Mail, Clock, TrendingUp, TrendingDown, Trash2, Edit3, Save, X, Plus } from 'lucide-react';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTerritoryInfo, TERRITORIES } from '../constants';

export default function AccountDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isRSM, isDealer } = useAuth();
  
  const [account, setAccount] = useState<Account | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<Account>>({});

  useEffect(() => {
    async function fetchAccountData() {
      if (!id) return;
      try {
        // Fetch Account
        const accDoc = await getDoc(doc(db, 'accounts', id));
        if (accDoc.exists()) {
          const rawData = accDoc.data() as any;
          // Sanitize: move legacy fields to camelCase properties if they exist
          const noOfPatients = rawData.noOfPatients ?? rawData['AVG PATIENTS / MONTH'] ?? 0;
          const clinicType = rawData.clinicType ?? rawData['CLINIC TYPE'] ?? '';
          const dealerCode = rawData.dealerCode ?? rawData['DEALER CODE'] ?? '';
          const resellerLandingCost = rawData.resellerLandingCost ?? rawData['RESELLER LANDING COST'] ?? 0;
          
          // Remove the invalid fields from the data object to prevent update errors
          const { 
            'AVG PATIENTS / MONTH': _, 
            'CLINIC TYPE': __, 
            'DEALER CODE': ___, 
            'RESELLER LANDING COST': ____, 
            ...cleanData 
          } = rawData;
          
          const data = { 
            id: accDoc.id, 
            ...cleanData,
            noOfPatients: Number(noOfPatients),
            clinicType: clinicType,
            dealerCode: dealerCode,
            resellerLandingCost: Number(resellerLandingCost)
          } as Account;
          
          // Auto-assignment of territory code if stored as name
          const info = getTerritoryInfo(data.territory);
          if (info && data.territory !== info.code && (isAdmin || isRSM)) {
            // Silently update if it's a name to ensure consistency
            const batch = writeBatch(db);
            batch.update(accDoc.ref, { territory: info.code });
            batch.commit().catch(console.error);
            data.territory = info.code;
          }

          setAccount(data);
          setFormData(data);
        }

        // Fetch Related Contacts (Lookup relationship)
        const contactsSnap = await getDocs(query(collection(db, `accounts/${id}/contacts`)));
        setContacts(contactsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));

        // Fetch Related Visits (Lookup relationship)
        const visitsSnap = await getDocs(query(collection(db, 'visits'), where('accountId', '==', id), orderBy('dateTime', 'desc')));
        setVisits(visitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)));

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `accounts/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchAccountData();
  }, [id]);

  const [showAddContact, setShowAddContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    specialty: '',
    mobile: '',
    email: ''
  });

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const batch = writeBatch(db);
      const newContactRef = doc(collection(db, `accounts/${id}/contacts`));
      
      const payload = {
        ...contactForm,
        accountId: id,
        createdAt: new Date().toISOString()
      };

      batch.set(newContactRef, payload);
      await batch.commit();
      
      setContacts(prev => [{ id: newContactRef.id, ...payload } as Contact, ...prev]);
      setShowAddContact(false);
      setContactForm({ firstName: '', lastName: '', specialty: '', mobile: '', email: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `accounts/${id}/contacts`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Create a copy and remove invalid field paths
      const cleanedFormData = { ...formData };
      delete (cleanedFormData as any)['AVG PATIENTS / MONTH'];
      delete (cleanedFormData as any)['CLINIC TYPE'];
      delete (cleanedFormData as any)['DEALER CODE'];
      delete (cleanedFormData as any)['RESELLER LANDING COST'];

      const payload = {
        ...cleanedFormData,
        noOfPatients: Number(formData.noOfPatients || 0),
        resellerLandingCost: Number(formData.resellerLandingCost || 0),
        updatedAt: new Date().toISOString()
      };
      
      const batch = writeBatch(db);
      batch.update(doc(db, 'accounts', id!), payload);
      await batch.commit();
      
      setAccount({ ...account, ...payload } as Account);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `accounts/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // 1. Delete Contacts (Subcollection of Account)
      const contactsSnap = await getDocs(collection(db, `accounts/${id}/contacts`));
      contactsSnap.docs.forEach((contactDoc) => {
        batch.delete(contactDoc.ref);
      });

      // 2. Delete Visits and their sub-items (Linked to Account)
      const visitsSnap = await getDocs(query(collection(db, 'visits'), where('accountId', '==', id)));
      for (const visitDoc of visitsSnap.docs) {
        // Delete visit subcollections
        const soldSnap = await getDocs(collection(db, `visits/${visitDoc.id}/soldProducts`));
        soldSnap.docs.forEach(s => batch.delete(s.ref));

        const demoSnap = await getDocs(collection(db, `visits/${visitDoc.id}/demoProducts`));
        demoSnap.docs.forEach(d => batch.delete(d.ref));

        const freeSnap = await getDocs(collection(db, `visits/${visitDoc.id}/freeProducts`));
        freeSnap.docs.forEach(f => batch.delete(f.ref));

        // Delete visit itself
        batch.delete(visitDoc.ref);
      }

      // 3. Delete Account itself
      batch.delete(doc(db, 'accounts', id));

      await batch.commit();
      navigate('/accounts');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `accounts/${id}`);
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-900">Account not found</h2>
        <button onClick={() => navigate('/accounts')} className="mt-4 text-blue-600 font-bold uppercase text-xs tracking-widest">Back to Accounts</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/accounts')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{account.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold uppercase">{account.type}</span>
              <span className="text-slate-400 text-xs font-medium tracking-tight flex items-center gap-1">
                <MapPin className="w-3 h-3" /> 
                {(() => {
                  const info = getTerritoryInfo(account.territory || '');
                  return info ? `${info.name} (${info.code})` : (account.territory || 'Unassigned');
                })()}
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                >
                  <Edit3 className="w-4 h-4" />
                  Edit
                </button>
                {showConfirm ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mr-2">Confirm Delete?</p>
                    <button 
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {deleting ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button 
                      onClick={() => setShowConfirm(false)}
                      disabled={deleting}
                      className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUpdate}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20"
                >
                  {saving ? "Saving..." : <><Save className="w-4 h-4" /> Save</>}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData(account);
                  }}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-8 border-b border-gray-100 bg-slate-50/50">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Edit Entity Metadata</h3>
          </div>
          <form onSubmit={handleUpdate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Account Name</label>
              <input
                required
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Territory / Area</label>
              <select
                required
                value={formData.territory || ''}
                onChange={e => setFormData(f => ({ ...f, territory: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
              >
                <option value="">Select Territory...</option>
                {TERRITORIES.map(t => (
                  <option key={t.code} value={t.code}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>
            
            {account.type === 'DEALER' ? (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dealer Code</label>
                  <input
                    type="text"
                    value={formData.dealerCode || ''}
                    onChange={e => setFormData(f => ({ ...f, dealerCode: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reseller Landing Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.resellerLandingCost || 0}
                    onChange={e => setFormData(f => ({ ...f, resellerLandingCost: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Clinic Type (e.g. Private, Chain)</label>
                  <input
                    type="text"
                    value={formData.clinicType || ''}
                    onChange={e => setFormData(f => ({ ...f, clinicType: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Average Patients / Month</label>
                  <input
                    type="number"
                    value={formData.noOfPatients || 0}
                    onChange={e => setFormData(f => ({ ...f, noOfPatients: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Physical Address</label>
              <textarea
                value={formData.address || ''}
                onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all h-24 resize-none"
              />
            </div>
          </form>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Total Visits</p>
              <p className="text-2xl font-bold text-slate-900 text-center tracking-tight leading-none mt-2">{account.visitCounter || 0}</p>
            </div>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                {account.type === 'DEALER' ? 'Dealer Code' : 'Clinic Type'}
              </p>
              <p className="text-sm font-bold text-slate-700 text-center truncate uppercase leading-none mt-2">
                {account.type === 'DEALER' ? account.dealerCode : (account.clinicType || 'Standard')}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                {account.type === 'DEALER' ? 'Landing Cost' : 'Avg Patients'}
              </p>
              {account.type === 'DEALER' ? (
                <p className="text-xl font-bold text-slate-900 text-center tracking-tight mt-1 leading-none">₹{account.resellerLandingCost?.toLocaleString('en-IN')}</p>
              ) : (
                <p className="text-2xl font-bold text-slate-900 text-center tracking-tight leading-none mt-2">{account.noOfPatients || 0}</p>
              )}
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Lifecycle</p>
              <div className="flex justify-center mt-2">
                <span className={cn(
                  "text-[9px] font-black tracking-widest px-2 py-1 rounded-md border",
                  account.firstConvertedVisit ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-blue-50 text-blue-600 border-blue-100"
                )}>
                  {account.firstConvertedVisit ? "CONVERTED" : "PROSPECT"}
                </span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Territory</p>
              <p className="text-xs font-bold text-slate-600 text-center truncate leading-none mt-2">
                {(() => {
                  const info = getTerritoryInfo(account.territory || '');
                  return info ? `${info.name} (${info.code})` : (account.territory || 'Unassigned');
                })()}
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
              <MapPin className="w-4 h-4" />
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">{account.address || 'Address not registered in system'}</p>
          </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left side: Related Contacts */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Related Contacts</h3>
              </div>
              {(isAdmin || isDealer) && (
                <button 
                  onClick={() => setShowAddContact(true)}
                  className="p-1.5 hover:bg-white border hover:border-gray-200 rounded-lg text-blue-600 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

              {showAddContact && (
              <div className="p-6 bg-slate-50 border-b border-gray-100 animate-in slide-in-from-top duration-300">
                <form onSubmit={handleAddContact} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      required
                      placeholder="First Name"
                      value={contactForm.firstName}
                      onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    />
                    <input
                      required
                      placeholder="Last Name"
                      value={contactForm.lastName}
                      onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                    />
                  </div>
                  <input
                    placeholder="Specialty (e.g. Orthodontist)"
                    value={contactForm.specialty}
                    onChange={e => setContactForm(f => ({ ...f, specialty: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  />
                  <input
                    type="email"
                    required
                    placeholder="Email Address"
                    value={contactForm.email}
                    onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
                  />
                  <div className="flex gap-2">
                    <input
                      placeholder="Mobile Number"
                      value={contactForm.mobile}
                      onChange={e => setContactForm(f => ({ ...f, mobile: e.target.value }))}
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono"
                    />
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="p-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            )}
            <div className="divide-y divide-gray-50">
              {contacts.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-xs">No contacts linked.</div>
              ) : contacts.map(c => (
                <Link 
                  key={c.id} 
                  to={`/accounts/${id}/contacts/${c.id}`}
                  className="block p-5 hover:bg-slate-50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors uppercase tracking-tight">{c.firstName} {c.lastName}</p>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1.5 px-2 py-0.5 bg-blue-50 rounded-md inline-block">
                        {c.specialty || 'General Practitioner'}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-slate-50">
                    <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                      <div className="p-1 bg-slate-50 rounded-md">
                        <Mail className="w-3 h-3 text-slate-300" />
                      </div>
                      <span className="truncate group-hover:text-slate-600 transition-colors">{c.email}</span>
                    </div>
                    {c.mobile && (
                      <div className="flex items-center gap-2.5 text-[10px] font-bold text-slate-400">
                        <div className="p-1 bg-slate-50 rounded-md">
                          <Phone className="w-3 h-3 text-slate-300" />
                        </div>
                        <span className="font-mono group-hover:text-slate-600 transition-colors">{c.mobile}</span>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Related Visits */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Visit History</h3>
              </div>
              {isDealer && (
                <button onClick={() => navigate('/visits/new')} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline">Log Visit</button>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {visits.length === 0 ? (
                <div className="p-12 text-center text-slate-400 italic text-sm">No visits logged for this account yet.</div>
              ) : visits.map(v => (
                <Link 
                  key={v.id} 
                  to={`/visits/${v.id}`}
                  className="p-6 hover:bg-slate-50/30 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                      <span className="text-[10px] font-bold leading-none">{format(parseSafeDate(v.dateTime), 'MMM')}</span>
                      <span className="text-sm font-bold leading-none mt-0.5">{format(parseSafeDate(v.dateTime), 'dd')}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{v.visitType}</p>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{v.subject || 'Standard Visit'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-bold text-slate-900">₹{v.totalRevenue?.toLocaleString('en-IN')}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <span className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        v.visitConverted ? "bg-emerald-500" : "bg-slate-300"
                      )} />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{v.visitConverted ? 'Converted' : 'Regular'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )}
</div>
);
}
