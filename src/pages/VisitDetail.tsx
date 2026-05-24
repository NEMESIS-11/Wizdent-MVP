/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  Visit, 
  Account, 
  Contact, 
  SoldProduct, 
  DemoProduct, 
  DiscussedProduct, 
  FreeProduct,
  VisitStatus,
  Product
} from '../types';
import { 
  ArrowLeft, 
  Calendar, 
  MapPin, 
  User, 
  Shield,
  ShieldCheck,
  Clock, 
  ShoppingCart, 
  MonitorPlay, 
  MessageSquare, 
  Gift, 
  Activity,
  ChevronRight,
  Printer,
  ExternalLink,
  Navigation,
  LogOut,
  AlertCircle,
  Plus,
  Trash2,
  Save
} from 'lucide-react';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { TERRITORIES, getTerritoryName } from '../constants';

export default function VisitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile, isDealer, isAdmin } = useAuth();
  
  const [visit, setVisit] = useState<Visit | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [dealerAccount, setDealerAccount] = useState<Account | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [attendees, setAttendees] = useState<Contact[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // Real-time logging state
  const [soldProducts, setSoldProducts] = useState<Partial<SoldProduct>[]>([]);
  const [demoProducts, setDemoProducts] = useState<Partial<DemoProduct>[]>([]);
  const [discussedProducts, setDiscussedProducts] = useState<Partial<DiscussedProduct>[]>([]);
  const [freeProducts, setFreeProducts] = useState<Partial<FreeProduct>[]>([]);
  const [actionPoints, setActionPoints] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVisitData() {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch Visit
        const visitDoc = await getDoc(doc(db, 'visits', id));
        if (!visitDoc.exists()) {
          setLoading(false);
          return;
        }
        const visitData = { id: visitDoc.id, ...visitDoc.data() } as Visit;
        setVisit(visitData);

        // Fetch Account
        const accDoc = await getDoc(doc(db, 'accounts', visitData.accountId));
        if (accDoc.exists()) {
          setAccount({ id: accDoc.id, ...accDoc.data() } as Account);
        }

        // Fetch Dealer Account if available
        if (visitData.dealerId) {
          const dealerDoc = await getDoc(doc(db, 'accounts', visitData.dealerId));
          if (dealerDoc.exists()) {
            setDealerAccount({ id: dealerDoc.id, ...dealerDoc.data() } as Account);
          }
        }

        // Fetch Primary Contact
        const contactDoc = await getDoc(doc(db, `accounts/${visitData.accountId}/contacts`, visitData.contactId));
        if (contactDoc.exists()) {
          setContact({ id: contactDoc.id, ...contactDoc.data() } as Contact);
        }

        // Fetch Attendees
        if (visitData.attendees && visitData.attendees.length > 0) {
          const attendeePromises = visitData.attendees.map(aid => 
            getDoc(doc(db, `accounts/${visitData.accountId}/contacts`, aid))
          );
          const attendeeDocs = await Promise.all(attendeePromises);
          setAttendees(attendeeDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as Contact)));
        }

        // Fetch Subcollections
        const [soldSnap, demoSnap, discussedSnap, freeSnap, prodSnap] = await Promise.all([
          getDocs(collection(db, `visits/${id}/soldProducts`)),
          getDocs(collection(db, `visits/${id}/demoProducts`)),
          getDocs(collection(db, `visits/${id}/discussedProducts`)),
          getDocs(collection(db, `visits/${id}/freeProducts`)),
          getDocs(collection(db, 'products'))
        ]);

        setSoldProducts(soldSnap.docs.map(d => ({ id: d.id, ...d.data() } as SoldProduct)));
        setDemoProducts(demoSnap.docs.map(d => ({ id: d.id, ...d.data() } as DemoProduct)));
        setDiscussedProducts(discussedSnap.docs.map(d => ({ id: d.id, ...d.data() } as DiscussedProduct)));
        setFreeProducts(freeSnap.docs.map(d => ({ id: d.id, ...d.data() } as FreeProduct)));
        setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));
        setActionPoints(visitData.visitActionPoints || '');

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `visits/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchVisitData();
  }, [id]);

  const getCurrentLocation = (): Promise<GeolocationPosition> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    });
  };

  const handleCheckIn = async () => {
    if (!visit || !id) return;
    setActionLoading(true);
    setError(null);
    try {
      const position = await getCurrentLocation();
      const checkInLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      const checkInTime = new Date().toISOString();

      await updateDoc(doc(db, 'visits', id), {
        status: VisitStatus.IN_PROGRESS,
        checkInTime,
        checkInLocation,
        updatedAt: serverTimestamp()
      });

      setVisit(prev => prev ? { ...prev, status: VisitStatus.IN_PROGRESS, checkInTime, checkInLocation } : null);
    } catch (err: any) {
      setError("Failed to check-in: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const calculateDuration = (start: string, end: string) => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    return Math.round((endTime - startTime) / (1000 * 60));
  };

  const handleCheckOut = async () => {
    if (!visit || !id) return;
    setActionLoading(true);
    setError(null);
    try {
      const position = await getCurrentLocation();
      const checkOutLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy
      };
      const checkOutTime = new Date().toISOString();
      const durationMinutes = visit.checkInTime ? calculateDuration(visit.checkInTime, checkOutTime) : 0;

      const totalRevenue = soldProducts.reduce((acc, item) => acc + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
      const totalProductSold = soldProducts.reduce((acc, item) => acc + Number(item.quantity || 0), 0);
      const totalPILSalesValue = soldProducts.reduce((acc, item) => acc + (Number(item.listPrice || 0) * Number(item.quantity || 0)), 0);

      const batch = writeBatch(db);
      const visitRef = doc(db, 'visits', id);

      batch.update(visitRef, {
        status: VisitStatus.COMPLETED,
        checkOutTime,
        checkOutLocation,
        durationMinutes,
        totalRevenue,
        totalProductSold,
        totalPILSalesValue,
        hasSoldProduct: soldProducts.length > 0,
        visitConverted: soldProducts.length > 0,
        visitActionPoints: actionPoints,
        dateTime: visit?.checkInTime, // Set actual visit time to check-in time
        updatedAt: serverTimestamp()
      });

      // Save Sold Products
      soldProducts.forEach(item => {
        if (!item.productId) return;
        const ref = doc(collection(db, `visits/${id}/soldProducts`));
        batch.set(ref, {
          ...item,
          visitId: id,
          totalSoldPrice: Number(item.price || 0) * Number(item.quantity || 0),
          totalListPrice: Number(item.listPrice || 0) * Number(item.quantity || 0),
          stockUpdated: true,
          stockUpdatedIn: new Date().toISOString()
        });
      });

      demoProducts.forEach(item => {
        if (!item.productId) return;
        const ref = doc(collection(db, `visits/${id}/demoProducts`));
        batch.set(ref, { ...item, visitId: id, demoDate: checkOutTime });
      });

      discussedProducts.forEach(item => {
        if (!item.productId) return;
        const ref = doc(collection(db, `visits/${id}/discussedProducts`));
        batch.set(ref, { ...item, visitId: id });
      });

      freeProducts.forEach(item => {
        if (!item.productId) return;
        const ref = doc(collection(db, `visits/${id}/freeProducts`));
        batch.set(ref, { ...item, visitId: id });
      });
      
      await batch.commit();
      setVisit(prev => prev ? { 
        ...prev, 
        status: VisitStatus.COMPLETED, 
        checkOutTime, 
        checkOutLocation, 
        durationMinutes,
        totalRevenue,
        visitConverted: soldProducts.length > 0
      } : null);
    } catch (err: any) {
      setError("Failed to check-out: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Product editing helpers
  const addSoldItem = () => setSoldProducts([...soldProducts, { productId: '', quantity: 1, price: 0, listPrice: 0, resellerCost: 0 }]);
  const removeSoldItem = (idx: number) => setSoldProducts(soldProducts.filter((_, i) => i !== idx));
  const updateSoldItem = (idx: number, field: string, val: any) => {
    const news = [...soldProducts];
    news[idx] = { ...news[idx], [field]: val };
    if (field === 'productId') {
      const p = products.find(p => p.id === val);
      if (p) {
        news[idx].productName = p.name;
        news[idx].brandName = p.brand;
        news[idx].price = p.dentistPrice || 0;
        news[idx].listPrice = p.standardPrice || 0;
        news[idx].resellerCost = p.resellerPrice || 0;
      }
    }
    setSoldProducts(news);
  };

  const addDemoItem = () => setDemoProducts([...demoProducts, { productId: '', quantity: 1, remarks: '' }]);
  const removeDemoItem = (idx: number) => setDemoProducts(demoProducts.filter((_, i) => i !== idx));
  const updateDemoItem = (idx: number, field: string, val: any) => {
    const news = [...demoProducts];
    news[idx] = { ...news[idx], [field]: val };
    if (field === 'productId') {
      const p = products.find(p => p.id === val);
      if (p) news[idx].productName = p.name;
    }
    setDemoProducts(news);
  };

  const addFreeItem = () => setFreeProducts([...freeProducts, { productId: '', quantity: 1, type: 'SAMPLE' }]);
  const removeFreeItem = (idx: number) => setFreeProducts(freeProducts.filter((_, i) => i !== idx));
  const updateFreeItem = (idx: number, field: string, val: any) => {
    const news = [...freeProducts];
    news[idx] = { ...news[idx], [field]: val };
    if (field === 'productId') {
      const p = products.find(p => p.id === val);
      if (p) news[idx].productName = p.name;
    }
    setFreeProducts(news);
  };

  const addDiscussedItem = () => setDiscussedProducts([...discussedProducts, { productId: '', remarks: '' }]);
  const removeDiscussedItem = (idx: number) => setDiscussedProducts(discussedProducts.filter((_, i) => i !== idx));
  const updateDiscussedItem = (idx: number, field: string, val: any) => {
    const news = [...discussedProducts];
    news[idx] = { ...news[idx], [field]: val };
    if (field === 'productId') {
      const p = products.find(p => p.id === val);
      if (p) news[idx].productName = p.name;
    }
    setDiscussedProducts(news);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-slate-900/10 border-t-slate-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!visit) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-slate-900">Visit not found</h2>
        <button onClick={() => navigate('/visits')} className="mt-4 text-slate-600 font-bold uppercase text-xs tracking-widest border border-slate-200 px-4 py-2 rounded-lg">Back to Visits</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Top Banner / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/visits')} className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-2">
               <h2 className="text-2xl font-bold tracking-tight text-slate-900">{visit.name || 'Field Activity'}</h2>
               <span className={cn(
                 "px-2 py-0.5 text-[9px] font-black rounded uppercase border",
                 visit.status === VisitStatus.COMPLETED ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                 visit.status === VisitStatus.IN_PROGRESS ? "bg-blue-50 text-blue-700 border-blue-100 animate-pulse" :
                 "bg-slate-50 text-slate-600 border-slate-200"
               )}>
                 {visit.status || 'PLANNED'}
               </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {(visit.dealerCode || dealerAccount) && (
                <span className="text-blue-600 text-[9px] font-black uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                   <Shield className="w-3 h-3" />
                   Dealer: {dealerAccount?.name || visit.dealerCode}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
           {visit.status === VisitStatus.PLANNED && isDealer && (
             <button 
               onClick={handleCheckIn}
               disabled={actionLoading}
               className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
             >
               {actionLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Navigation className="w-4 h-4" />}
               Check-in Now
             </button>
           )}

           {visit.status === VisitStatus.IN_PROGRESS && isDealer && (
             <button 
               onClick={handleCheckOut}
               disabled={actionLoading}
               className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
             >
               {actionLoading ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <LogOut className="w-4 h-4" />}
               Check-out & Finish
             </button>
           )}

           <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-bold uppercase tracking-widest transition-all">
             <Printer className="w-4 h-4" />
             Print Report
           </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[10px] font-bold uppercase tracking-widest animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-2">Net Revenue</p>
          <p className="text-xl font-bold tracking-tight">₹{visit.totalRevenue?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PIL Sales Value</p>
          <p className="text-xl font-bold text-slate-900 tracking-tight">₹{visit.totalPILSalesValue?.toLocaleString('en-IN') || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Visit Type</p>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">{visit.visitType}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">
            {visit.status === VisitStatus.COMPLETED ? 'Duration' : 'Status'}
          </p>
          <div className="flex items-center gap-2">
            {visit.status === VisitStatus.COMPLETED ? (
              <>
                <Clock className="w-4 h-4 text-slate-400" />
                <p className="text-lg font-bold text-slate-900 tracking-tight">{visit.durationMinutes || 0} min</p>
              </>
            ) : (
              <p className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded inline-block">{visit.status || 'PLANNED'}</p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Visit Date</p>
          <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            {visit.checkInTime ? format(new Date(visit.checkInTime), 'MMM dd, yyyy') : format(parseSafeDate(visit.plannedDate || visit.dateTime), 'MMM dd, yyyy')}
          </p>
          {visit.checkInTime && (
            <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">{format(new Date(visit.checkInTime), 'hh:mm a')}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Context & Relationship */}
        <div className="lg:col-span-1 space-y-6">
          {/* Clinic Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Dental Clinic</h3>
              </div>
              {account && (
                <Link to={`/accounts/${account.id}`} className="text-slate-400 hover:text-blue-600 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="p-6">
              {account ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">{account.name}</p>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{account.address}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Territory</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{account.territory} ({getTerritoryName(account.territory)})</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Life Visits</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{account.visitCounter || 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Clinic data unavailable</p>
              )}
            </div>
          </div>

          {/* Dealer Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Fulfillment Partner</h3>
              </div>
              {dealerAccount && (
                <Link to={`/accounts/${dealerAccount.id}`} className="text-slate-400 hover:text-indigo-600 transition-colors">
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
            </div>
            <div className="p-6">
              {dealerAccount ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-lg font-bold text-slate-900 tracking-tight">{dealerAccount.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        Code: {dealerAccount.dealerCode || visit.dealerCode}
                      </span>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Slab</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{dealerAccount.slab || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Territory</p>
                      <p className="text-xs font-bold text-slate-700 mt-1">{dealerAccount.territory ? `${dealerAccount.territory} (${getTerritoryName(dealerAccount.territory)})` : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-bold text-slate-900">Code: {visit.dealerCode || 'N/A'}</p>
                  <p className="text-[10px] text-slate-400 italic">Account details not found. Linked via manual code.</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Primary Contact</h3>
              </div>
            </div>
            <div className="p-6">
              {contact ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-bold text-slate-900 tracking-tight">{contact.firstName} {contact.lastName}</p>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1 bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
                        {contact.specialty || 'General Practitioner'}
                      </p>
                    </div>
                    {account && (
                      <Link to={`/accounts/${account.id}/contacts/${contact.id}`} className="text-slate-400 hover:text-emerald-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Contact details not found.</p>
              )}
            </div>
          </div>

          {/* Attendees List */}
          {attendees.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Other Attendees ({attendees.length})</h3>
              </div>
              <div className="divide-y divide-slate-50">
                {attendees.map(a => (
                  <div key={a.id} className="p-4 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-700">{a.firstName} {a.lastName}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{a.specialty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BRD Meta Section */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
               <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Technical Meta</h3>
              </div>
            </div>
            <div className="p-6 space-y-4">
               {visit.package && (
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Package / SKU</p>
                   <p className="text-sm font-bold text-slate-900">{visit.package}</p>
                 </div>
               )}
               {visit.financialYear && (
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Financial Year</p>
                   <p className="text-sm font-bold text-slate-900">{visit.financialYear}</p>
                 </div>
               )}
               {visit.testFinancialYear && (
                 <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Test FY Mapping</p>
                   <p className="text-sm font-bold text-slate-900 text-indigo-600 font-mono tracking-tighter">{visit.testFinancialYear}</p>
                 </div>
               )}
               <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Currency</p>
                    <p className="text-sm font-bold text-slate-900">{visit.currency || 'INR'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Date Count</p>
                    <p className="text-sm font-bold text-slate-900">{visit.dateCount ? 'YES' : 'NO'}</p>
                  </div>
               </div>
               {visit.digitalExponent2021 && (
                 <div className="pt-2">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Digital Engagement</p>
                   <p className="text-[11px] font-bold text-slate-600 italic">{visit.digitalExponent2021}</p>
                 </div>
               )}

               {/* External Link Section */}
               <div className="pt-4 mt-4 border-t border-slate-50 space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">System Links</p>
                  <div className="grid grid-cols-1 gap-2">
                    {visit.rebrandyUrlDealer && (
                      <a href={visit.rebrandyUrlDealer} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:bg-blue-50 transition-colors">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">Rebrandy Dealer URL</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    )}
                    {visit.rebrandyUrlDentist && (
                      <a href={visit.rebrandyUrlDentist} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:bg-blue-50 transition-colors">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">Rebrandy Dentist URL</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    )}
                    {visit.dentistResponseUrl && (
                      <a href={visit.dentistResponseUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:bg-blue-50 transition-colors">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">Dentist Feedback Link</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    )}
                    {visit.urlVisitDetails && (
                      <a href={visit.urlVisitDetails} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-2 bg-slate-50 rounded-lg group hover:bg-blue-50 transition-colors">
                        <span className="text-[10px] font-bold text-slate-600 group-hover:text-blue-700">Official Visit Details</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
                      </a>
                    )}
                  </div>
               </div>
            </div>
          </div>

          {/* Action Points */}
          <div className="bg-amber-50 rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-100 bg-amber-100/30">
               <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-700" />
                <h3 className="text-xs font-black uppercase tracking-widest text-amber-900/50">Action Points & Notes</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-sm font-medium text-amber-900/80 leading-relaxed italic">
                {visit.visitActionPoints || 'No specific action points recorded for this visit.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Product Interactions */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Check-in info in Right Column for Planned */}
          {visit.status === VisitStatus.PLANNED && (
            <div className="bg-blue-50 p-8 rounded-3xl border border-blue-100 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-white rounded-full shadow-sm text-blue-600">
                <Navigation className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-widest text-blue-900">Ready to start?</h4>
                <p className="text-xs text-blue-700/60 mt-1 max-w-[200px] mx-auto">Press Check-in when you reach the clinic to record your arrival.</p>
              </div>
            </div>
          )}

          {/* Sold Products Grid */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Products Sold</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.1em] mt-0.5">Commercial Transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SUB-TOTAL</p>
                <p className="text-lg font-bold text-slate-900">₹{soldProducts.reduce((acc, sp) => acc + (Number(sp.price || 0) * Number(sp.quantity || 0)), 0).toLocaleString('en-IN')}</p>
              </div>
              {visit.status === VisitStatus.IN_PROGRESS && (
                <button onClick={addSoldItem} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-widest font-black text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4">Product Name</th>
                    <th className="px-4 py-4 text-center">Qty</th>
                    <th className="px-4 py-4 text-right">Unit Price</th>
                    <th className="px-8 py-4 text-right">Total Price</th>
                    {visit.status === VisitStatus.IN_PROGRESS && <th className="px-4 py-4"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {soldProducts.length === 0 ? (
                    <tr>
                      <td colSpan={visit.status === VisitStatus.IN_PROGRESS ? 5 : 4} className="px-8 py-10 text-center text-slate-400 text-xs italic">No commercial transaction recorded.</td>
                    </tr>
                  ) : soldProducts.map((sp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5">
                        {visit.status === VisitStatus.IN_PROGRESS ? (
                          <select 
                            value={sp.productId} 
                            onChange={e => updateSoldItem(idx, 'productId', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500"
                          >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        ) : (
                          <>
                            <p className="text-sm font-bold text-slate-900">{sp.productName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5">{sp.brandName}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-5 text-center">
                        {visit.status === VisitStatus.IN_PROGRESS ? (
                          <input 
                            type="number"
                            min="1"
                            value={sp.quantity} 
                            onChange={e => updateSoldItem(idx, 'quantity', Number(e.target.value))}
                            className="w-16 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-center outline-none focus:border-blue-500"
                          />
                        ) : (
                          <span className="font-mono text-sm font-black text-slate-600">{sp.quantity}</span>
                        )}
                      </td>
                      <td className="px-4 py-5 text-right font-mono text-xs font-bold text-slate-900 font-mono">
                        {visit.status === VisitStatus.IN_PROGRESS ? (
                          <input 
                            type="number"
                            value={sp.price} 
                            onChange={e => updateSoldItem(idx, 'price', Number(e.target.value))}
                            className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-right outline-none focus:border-blue-500"
                          />
                        ) : (
                          `₹${sp.price?.toLocaleString('en-IN')}`
                        )}
                      </td>
                      <td className="px-8 py-5 text-right font-mono text-sm font-black text-slate-900">
                        ₹{(Number(sp.price || 0) * Number(sp.quantity || 0)).toLocaleString('en-IN')}
                      </td>
                      {visit.status === VisitStatus.IN_PROGRESS && (
                         <td className="px-4 py-5">
                            <button onClick={() => removeSoldItem(idx)} className="text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Action Points / Feedback - Editable during In-Progress */}
          <section className="bg-amber-50 rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-amber-100 bg-amber-100/30 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-amber-900/50">Action Points & Notes</h3>
               </div>
            </div>
            <div className="p-8">
              {visit.status === VisitStatus.IN_PROGRESS ? (
                <textarea 
                  rows={4}
                  value={actionPoints}
                  onChange={e => setActionPoints(e.target.value)}
                  placeholder="Capture key discussion points and outcomes here..."
                  className="w-full bg-white/50 border border-amber-200/50 rounded-2xl px-6 py-4 text-xs font-medium text-amber-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                />
              ) : (
                <p className="text-sm font-medium text-amber-900/80 leading-relaxed italic">
                  {visit.visitActionPoints || 'No specific action points recorded for this visit.'}
                </p>
              )}
            </div>
          </section>

          {/* Demos & Free Samples Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             {/* Demo Products Section */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-blue-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Clinical Demo</h3>
                </div>
                {visit.status === VisitStatus.IN_PROGRESS && (
                  <button onClick={addDemoItem} className="p-1 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-[10px] font-black uppercase tracking-widest transition-all">
                    ADD
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4">
                {demoProducts.length === 0 ? (
                   <p className="text-[10px] text-slate-400 italic">No demonstration items linked.</p>
                ) : demoProducts.map((dp, idx) => (
                   <div key={idx} className="bg-slate-50 p-4 rounded-xl space-y-3">
                      {visit.status === VisitStatus.IN_PROGRESS ? (
                        <div className="flex items-center gap-2">
                           <select 
                            value={dp.productId} 
                            onChange={e => updateDemoItem(idx, 'productId', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none"
                          >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button onClick={() => removeDemoItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p className="text-xs font-bold text-slate-900">{dp.productName}</p>
                      )}
                      <textarea 
                        disabled={visit.status !== VisitStatus.IN_PROGRESS}
                        value={dp.remarks}
                        onChange={e => updateDemoItem(idx, 'remarks', e.target.value)}
                        placeholder="Trial feedback..."
                        className="w-full bg-white/50 border border-slate-200 rounded-lg p-2 text-[10px] h-12 resize-none outline-none focus:border-blue-400 disabled:opacity-50 font-medium"
                      />
                   </div>
                ))}
              </div>
            </section>

            {/* Free Samples Section */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Free Samples</h3>
                </div>
                {visit.status === VisitStatus.IN_PROGRESS && (
                  <button onClick={addFreeItem} className="p-1 px-3 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 text-[10px] font-black uppercase tracking-widest transition-all">
                    ADD
                  </button>
                )}
              </div>
              <div className="p-6 space-y-4">
                {freeProducts.length === 0 ? (
                   <p className="text-[10px] text-slate-400 italic">No free samples recorded.</p>
                ) : freeProducts.map((fp, idx) => (
                   <div key={idx} className="bg-slate-50 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                         {visit.status === VisitStatus.IN_PROGRESS ? (
                            <select 
                              value={fp.productId} 
                              onChange={e => updateFreeItem(idx, 'productId', e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[11px] font-bold outline-none"
                            >
                              <option value="">Select Product...</option>
                              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                         ) : (
                            <p className="text-xs font-bold text-slate-900 flex-1">{fp.productName}</p>
                         )}
                         <div className="flex items-center gap-2">
                            {visit.status === VisitStatus.IN_PROGRESS ? (
                               <input 
                                  type="number"
                                  value={fp.quantity}
                                  onChange={e => updateFreeItem(idx, 'quantity', Number(e.target.value))}
                                  className="w-12 bg-white border border-slate-200 rounded-lg px-1 py-1 text-center text-xs font-mono"
                               />
                            ) : (
                               <span className="text-xs font-black text-slate-400 bg-white px-2 py-0.5 rounded border">x{fp.quantity}</span>
                            )}
                            {visit.status === VisitStatus.IN_PROGRESS && <button onClick={() => removeFreeItem(idx)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
                         </div>
                      </div>
                   </div>
                ))}
              </div>
            </section>
          </div>

          {/* Check-out Reminder */}
          {visit.status === VisitStatus.IN_PROGRESS && (
             <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl">
                      <LogOut className="w-5 h-5" />
                   </div>
                   <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-900">Visit Concluding?</h5>
                      <p className="text-[10px] text-emerald-700/60 font-bold uppercase tracking-tight">Record all outcomes before logging out.</p>
                   </div>
                </div>
                <button 
                  onClick={handleCheckOut}
                  disabled={actionLoading}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
                >
                  Confirm Checkout
                </button>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
