/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, where, addDoc, serverTimestamp, writeBatch, doc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Account, 
  AccountType, 
  Contact, 
  VisitType,
  ActivityType,
  VisitStatus,
  UserRole
} from '../types';
import { 
  ArrowLeft, 
  Plus, 
  CheckCircle2,
  ShieldCheck,
  Calendar,
  X,
  AlertCircle,
  MapPin,
  Clock
} from 'lucide-react';
import { handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { SearchableLookup } from '../components/SearchableLookup';
import { TERRITORIES, getTerritoryName } from '../constants';

export default function PlanVisit() {
  const navigate = useNavigate();
  const { user, profile, isDealer, isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [savingContact, setSavingContact] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  // Quick Contact Form
  const [contactForm, setContactForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: ''
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [visitType, setVisitType] = useState<VisitType>(VisitType.SELL);
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.MEETING);
  const [subject, setSubject] = useState('');
  const [plannedDate, setPlannedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendeeCount, setAttendeeCount] = useState(1);
  const [conferenceName, setConferenceName] = useState('');
  const [area, setArea] = useState('');
  
  // Advanced fields
  const [currency, setCurrency] = useState('INR');
  const [packageValue, setPackageValue] = useState('');
  const [testFinancialYear, setTestFinancialYear] = useState('');
  const [digitalExponent2021, setDigitalExponent2021] = useState('');

  // Access Control
  useEffect(() => {
    if (profile && !isAdmin && !isDealer) {
      navigate('/visits');
    }
  }, [profile, isAdmin, isDealer, navigate]);

  useEffect(() => {
    async function fetchData() {
      if (!profile) return;
      try {
        let accQuery;
        if (profile.role === UserRole.ADMIN) {
          accQuery = query(collection(db, 'accounts'), where('type', '==', AccountType.CLINIC));
        } else {
          if (profile.territory) {
            accQuery = query(
              collection(db, 'accounts'), 
              where('type', '==', AccountType.CLINIC),
              where('territory', '>=', profile.territory),
              where('territory', '<=', profile.territory + '\uf8ff')
            );
          } else {
            accQuery = query(collection(db, 'accounts'), where('type', '==', AccountType.CLINIC), where('territory', '==', 'UNASSIGNED'), limit(1));
          }
        }
        const accSnap = await getDocs(accQuery);
        setAccounts(accSnap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Account)));
      } catch (err) {
        console.error("Error fetching accounts:", err);
      }
    }
    fetchData();
  }, [profile]);

  useEffect(() => {
    if (selectedAccountId) {
      async function fetchContacts() {
        try {
          const q = query(collection(db, `accounts/${selectedAccountId}/contacts`));
          const snap = await getDocs(q);
          setContacts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Contact)));
        } catch (err) {
          console.error("Error fetching contacts:", err);
        }
      }
      fetchContacts();
    } else {
      setContacts([]);
    }
  }, [selectedAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    
    setLoading(true);
    setError(null);

    try {
      if (!selectedAccountId || !selectedContactId) {
        throw new Error("Please select both a clinic and a contact.");
      }

      const account = accounts.find(a => a.id === selectedAccountId);
      const visitDate = parseSafeDate(plannedDate);
      const financialYear = visitDate.getMonth() >= 3 
        ? `FY${visitDate.getFullYear().toString().slice(-2)}-${(visitDate.getFullYear() + 1).toString().slice(-2)}`
        : `FY${(visitDate.getFullYear() - 1).toString().slice(-2)}-${visitDate.getFullYear().toString().slice(-2)}`;
      
      const visitName = `${account?.name || 'Visit'} - Planned: ${plannedDate}`;

      const visitData = {
        name: visitName,
        accountId: selectedAccountId,
        contactId: selectedContactId,
        dealerId: profile.dealerId || "",
        dealerUid: user.uid,
        dealerCode: profile.dealerCode || "",
        territory: account?.territory || profile.territory || "",
        status: VisitStatus.PLANNED,
        visitType,
        activityType,
        subject: subject || visitName,
        plannedDate,
        dateTime: plannedDate,
        totalRevenue: 0,
        totalProductSold: 0,
        totalPILSalesValue: 0,
        hasSoldProduct: false,
        visitConverted: false,
        attendeeCount,
        attendees: selectedAttendeeIds,
        conferenceName,
        area: area || account?.territory || "",
        slab: profile.slab || "",
        financialYear,
        currency,
        package: packageValue,
        testFinancialYear,
        digitalExponent2021,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, "visits"), visitData);
      navigate("/visits");
    } catch (err: any) {
      setError("Error planning visit: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId) return;
    setSavingContact(true);
    setContactError(null);
    try {
      const batch = writeBatch(db);
      const newContactRef = doc(collection(db, `accounts/${selectedAccountId}/contacts`));
      const payload = {
        ...contactForm,
        accountId: selectedAccountId,
        specialty: 'General',
        createdAt: new Date().toISOString()
      };
      batch.set(newContactRef, payload);
      await batch.commit();
      const newContact = { id: newContactRef.id, ...payload } as Contact;
      setContacts(prev => [newContact, ...prev]);
      setSelectedContactId(newContact.id);
      setShowAddContactModal(false);
      setContactForm({ firstName: '', lastName: '', email: '', mobile: '' });
    } catch (error) {
      setContactError("Failed to add contact.");
    } finally {
      setSavingContact(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {showAddContactModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Quick Add Doctor</h3>
              <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleQuickAddContact} className="p-6 space-y-4">
              {contactError && <div className="p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2"><AlertCircle className="w-4 h-4" />{contactError}</div>}
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First Name" value={contactForm.firstName} onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
                <input required placeholder="Last Name" value={contactForm.lastName} onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
              </div>
              <input required type="email" placeholder="Email Address" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold" />
              <input placeholder="Mobile Number" value={contactForm.mobile} onChange={e => setContactForm(f => ({ ...f, mobile: e.target.value }))} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-mono" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddContactModal(false)} className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                <button type="submit" disabled={savingContact} className="flex-[2] py-3 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 shadow-lg shadow-blue-600/20">{savingContact ? "Saving..." : "Add & Select"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 px-4 md:px-0">
        <button onClick={() => navigate('/visits')} className="p-2.5 hover:bg-white rounded-lg transition-colors border border-gray-100 md:border-transparent hover:border-gray-200"><ArrowLeft className="w-5 h-5 text-slate-600" /></button>
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 uppercase">Schedule Field Visit</h2>
          <p className="text-slate-500 text-[11px] md:text-sm">Initiate a new visit plan in your operational queue.</p>
        </div>
      </div>

      {error && <div className="mx-4 md:mx-0 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold flex items-center gap-4 animate-in slide-in-from-top-2"><AlertCircle className="w-6 h-6" />{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8 px-4 md:px-0">
        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-10 space-y-8">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Mission Parameters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <SearchableLookup 
              label="TARGET CLINIC"
              options={accounts.map(acc => ({
                id: acc.id,
                label: acc.name,
                subLabel: `Zone: ${acc.territory} (${getTerritoryName(acc.territory)})`
              }))}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              placeholder="Search by clinic name..."
              required
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PRIMARY CONTACT</label>
                {selectedAccountId && <button type="button" onClick={() => setShowAddContactModal(true)} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline">+ Quick Add</button>}
              </div>
              <SearchableLookup 
                label=""
                options={contacts.map(c => ({
                  id: c.id,
                  label: `${c.firstName} ${c.lastName}`,
                  subLabel: c.specialty || 'General Practice'
                }))}
                value={selectedContactId}
                onChange={setSelectedContactId}
                placeholder={selectedAccountId ? "Select doctor..." : "Clinical target required"}
                disabled={!selectedAccountId}
                required
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SELECT ADDITIONAL ATTENDEES</label>
              <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                {selectedAttendeeIds.length === 0 ? <span className="text-[10px] text-slate-300 italic px-2 py-1 uppercase tracking-tighter">No secondary personnel selected</span> : 
                  selectedAttendeeIds.map(id => {
                    const c = contacts.find(x => x.id === id);
                    if (!c) return null;
                    return (
                      <div key={id} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm text-[10px] font-bold text-slate-700 uppercase tracking-tighter">
                        {c.firstName} {c.lastName}
                        <button type="button" onClick={() => { setSelectedAttendeeIds(prev => prev.filter(aid => aid !== id)); setAttendeeCount(prev => Math.max(1, prev - 1)); }} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })
                }
              </div>
              <SearchableLookup 
                label=""
                options={contacts.filter(c => c.id !== selectedContactId && !selectedAttendeeIds.includes(c.id)).map(c => ({ id: c.id, label: `${c.firstName} ${c.lastName}`, subLabel: c.specialty || 'General Practice' }))}
                value=""
                onChange={(id) => { if (id) { setSelectedAttendeeIds(prev => [...prev, id]); setAttendeeCount(prev => prev + 1); }}}
                placeholder="Lookup to add more..."
                disabled={!selectedAccountId}
              />
            </div>

            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">VISIT SUBJECT / OBJECTIVE</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Main goal for this field interaction..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PLANNED EXECUTION DATE</label>
              <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="date" value={plannedDate} onChange={e => setPlannedDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">INTERACTION TYPE</label>
              <select required value={visitType} onChange={e => setVisitType(e.target.value as VisitType)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                {Object.values(VisitType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">HUB ACTIVITY PROTOCOL</label>
              <select required value={activityType} onChange={e => setActivityType(e.target.value as ActivityType)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                {Object.values(ActivityType).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

             <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ZONE OVERRIDE (OPTIONAL)</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select value={area} onChange={e => setArea(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 transition-all outline-none">
                  <option value="">INHERIT FROM CLINIC</option>
                  {TERRITORIES.map(t => <option key={t.code} value={t.code}>{t.code} - {t.name}</option>)}
                </select>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-10 space-y-8">
           <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">System Parameters</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PACKAGE SKU</label>
              <input type="text" value={packageValue} onChange={e => setPackageValue(e.target.value)} placeholder="Identity SKU..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CURRENCY</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FINANCIAL YEAR</label>
              <input type="text" value={testFinancialYear} onChange={e => setTestFinancialYear(e.target.value)} placeholder="FY2XX-XX" className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" />
            </div>
          </div>
        </section>

        <button type="submit" disabled={loading} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.3em] hover:bg-blue-600 transition-all shadow-2xl shadow-slate-900/20 disabled:opacity-50">
          {loading ? "COMMITTING PLAN TO HUB..." : "SCHEDULE FIELD INTERACTION"}
        </button>
      </form>
    </div>
  );
}
