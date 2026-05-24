/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Contact, Account, Visit } from '../types';
import { Users, ArrowLeft, Building2, Phone, Mail, Clock, Calendar, CheckSquare, TrendingUp, Trash2, Edit3, Save, X } from 'lucide-react';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

export default function ContactDetail() {
  const { accountId, contactId } = useParams<{ accountId: string, contactId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [contact, setContact] = useState<Contact | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formData, setFormData] = useState<Partial<Contact>>({});

  useEffect(() => {
    async function fetchContactData() {
      if (!accountId || !contactId) return;
      try {
        const [contactDoc, accountDoc] = await Promise.all([
          getDoc(doc(db, `accounts/${accountId}/contacts`, contactId)),
          getDoc(doc(db, 'accounts', accountId))
        ]);

        if (contactDoc.exists()) {
          const data = { id: contactDoc.id, ...contactDoc.data() } as Contact;
          setContact(data);
          setFormData(data);
        }
        if (accountDoc.exists()) {
          setAccount({ id: accountDoc.id, ...accountDoc.data() } as Account);
        }

        // Fetch visits filtered by both account and specific contact
        const visitsSnap = await getDocs(query(
          collection(db, 'visits'), 
          where('accountId', '==', accountId),
          where('contactId', '==', contactId),
          orderBy('dateTime', 'desc')
        ));
        setVisits(visitsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Visit)));

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `contacts/${contactId}`);
      } finally {
        setLoading(false);
      }
    }
    fetchContactData();
  }, [accountId, contactId]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      const contactRef = doc(db, `accounts/${accountId}/contacts`, contactId!);
      const batch = writeBatch(db);
      batch.update(contactRef, payload);
      await batch.commit();
      
      setContact({ ...contact, ...payload } as Contact);
      setIsEditing(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `contacts/${contactId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteDoc(doc(db, `accounts/${accountId}/contacts`, contactId));
      navigate(`/accounts/${accountId}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contacts/${contactId}`);
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

  if (!contact || !account) {
    const isOrphan = contact && !account;

    return (
      <div className="text-center py-20 flex flex-col items-center justify-center">
        <Users className="w-12 h-12 text-slate-200 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">
          {isOrphan ? "Orphaned Contact Detected" : "Contact or Clinic not found"}
        </h2>
        <p className="text-slate-500 text-sm mt-2 max-w-sm mx-auto">
          {isOrphan 
            ? "This contact exists but its associated clinic record has been deleted. You can delete this orphaned record or go back."
            : "The link you followed may be broken or the record was removed."}
        </p>
        
        <div className="flex flex-col gap-3 mt-8">
          <button 
            onClick={() => navigate('/contacts')} 
            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            Back to Contact List
          </button>
          
          {isOrphan && isAdmin && (
            <button 
              onClick={handleDelete}
              disabled={deleting}
              className="px-6 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-100 transition-all disabled:opacity-50"
            >
              {deleting ? "Deleting Orphan..." : "Delete Orphaned Record"}
            </button>
          )}
          
          <button 
            onClick={() => navigate('/accounts')} 
            className="text-slate-400 font-bold uppercase text-[10px] tracking-tight hover:text-slate-600"
          >
            Go to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
       <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-gray-200 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{contact.firstName} {contact.lastName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded text-[10px] font-bold uppercase">{contact.specialty}</span>
              <span className="text-slate-400 text-xs font-medium tracking-tight flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {account.name}
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
                    setFormData(contact);
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
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400">Edit Contact Information</h3>
          </div>
          <form onSubmit={handleUpdate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">First Name</label>
              <input
                required
                type="text"
                value={formData.firstName || ''}
                onChange={e => setFormData(f => ({ ...f, firstName: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Last Name</label>
              <input
                required
                type="text"
                value={formData.lastName || ''}
                onChange={e => setFormData(f => ({ ...f, lastName: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Specialty</label>
              <input
                type="text"
                value={formData.specialty || ''}
                onChange={e => setFormData(f => ({ ...f, specialty: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mobile</label>
              <input
                type="text"
                value={formData.mobile || ''}
                onChange={e => setFormData(f => ({ ...f, mobile: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email</label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </form>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Mobile</p>
              <p className="text-sm font-bold text-slate-900 text-center tracking-tight font-mono mt-2">{contact.mobile || '—'}</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm md:col-span-2 flex flex-col justify-between overflow-hidden">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Email</p>
              <p className="text-sm font-bold text-slate-600 text-center truncate mt-2">{contact.email || '—'}</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Visits Attended</p>
              <p className="text-2xl font-bold text-slate-900 text-center tracking-tight leading-none mt-2">{visits.length}</p>
            </div>
          </div>

          <Link 
            to={`/accounts/${account.id}`}
            className="group block bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-800 rounded-xl text-slate-400 group-hover:text-blue-400 transition-colors">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Associated Clinic / Dealer</p>
                  <p className="text-md font-bold text-white tracking-tight">{account.name}</p>
                  <p className="text-xs text-slate-400">{account.territory} Territory</p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 text-slate-700 group-hover:text-white group-hover:translate-x-1 transition-all rotate-180" />
            </div>
          </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-slate-50/30">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Personal Visit History
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {visits.length === 0 ? (
            <div className="p-12 text-center text-slate-400 italic text-sm">No personal interactions logged with this doctor yet.</div>
          ) : (
             <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50/50 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Visit Type</th>
                    <th className="px-6 py-3">Revenue</th>
                    <th className="px-6 py-3">Action Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-slate-600">
                  {visits.map(v => (
                    <tr 
                      key={v.id} 
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/visits/${v.id}`)}
                    >
                      <td className="px-6 py-4 font-medium text-slate-900 group-hover:text-blue-600 transition-colors">{format(parseSafeDate(v.dateTime), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 uppercase text-[10px] font-bold">{v.visitType}</td>
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">₹{v.totalRevenue?.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-xs italic text-slate-400 line-clamp-1">{v.visitActionPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
             </div>
          )}
        </div>
      </div>
    </>
  )}
</div>
);
}
