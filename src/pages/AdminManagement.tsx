import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, AccountType } from '../types';
import { Plus, User, Shield, Key, Mail, Building2, Save, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, Search, MapPin, ShieldCheck, ExternalLink, Users as UsersIcon, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { collection, getDocs, query, collectionGroup } from 'firebase/firestore';
import { provisionUser } from '../lib/provisionUser';
import { cn } from '../lib/utils';
import { TERRITORIES, getTerritoryName } from '../constants';
import BulkImporter from '../components/BulkImporter';

interface ProvisionResult {
  name: string;
  email: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export default function AdminManagement() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provisionResults, setProvisionResults] = useState<ProvisionResult[]>([]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    role: UserRole.DEALER,
    dealerCode: '',
    territory: '',
  });

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-800">
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-slate-500">Only administrators can access this page.</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      await provisionUser({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        role: formData.role,
        dealerCode: formData.dealerCode,
        territory: formData.territory,
      });

      setSuccess(`User ${formData.email} created successfully!`);
      setFormData({
        email: '',
        password: '',
        displayName: '',
        role: UserRole.DEALER,
        dealerCode: '',
        territory: '',
      });
    } catch (err: any) {
      if (err.message === "EMAIL_EXISTS") {
        setError("This email is already registered in Auth. To link it to the directory, re-enter the user's exact existing password.");
      } else {
        setError(err.message || "Failed to create user");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Control Tower</h2>
          <p className="text-slate-500 text-sm font-medium mt-1">Identity Management & Security Operations Protocol.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/5 rounded-full border border-emerald-500/10">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">System Online</span>
          </div>
          <Link 
            to="/users"
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <Search className="w-3.5 h-3.5" />
            View Directory
          </Link>
          <button
            onClick={async () => {
              setLoading(true);
              setProvisionResults([]);
              setError(null);
              setSuccess(null);
              
              try {
                const accSnap = await getDocs(collection(db, 'accounts'));
                const dealers = accSnap.docs
                  .map(d => ({ id: d.id, ...d.data() } as any))
                  .filter(a => a.type === AccountType.DEALER);

                const results: ProvisionResult[] = [];
                for (const d of dealers) {
                  const slug = (d.name || 'dealer').toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
                  const email = `${slug}@gmail.com`;

                  try {
                    await provisionUser({
                      email,
                      password: '12345678',
                      displayName: d.name,
                      role: UserRole.DEALER,
                      dealerId: d.id,
                      dealerCode: d.dealerCode || "",
                      territory: d.territory || ""
                    });
                    results.push({ name: d.name, email, status: 'success' });
                  } catch (e: any) {
                    results.push({
                      name: d.name,
                      email,
                      status: 'error',
                      message: e.message === 'EMAIL_EXISTS' ? 'Already registered (password mismatch)' : e.message
                    });
                  }
                  setProvisionResults([...results]);
                }
                
                const successCount = results.filter(r => r.status === 'success').length;
                setSuccess(`Provisioning completed. ${successCount} accounts were successfully processed.`);
              } catch (err: any) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-slate-900/20"
          >
            <Shield className="w-3.5 h-3.5" />
            Provision Existing Dealers
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className="space-y-4 max-w-4xl">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-100 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Hand: Provisioning Hub */}
        <div className="lg:col-span-8 space-y-8">
          {provisionResults.length > 0 && (
            <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 bg-slate-50 border-b border-gray-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Loader2 className={cn("w-3 h-3 text-blue-600", loading && "animate-spin")} />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Provisioning Feed</h3>
                </div>
                <button onClick={() => setProvisionResults([])} className="text-[10px] font-black text-slate-400 hover:text-slate-900 transition-colors uppercase tracking-widest">Dismiss</button>
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 p-2">
                {provisionResults.map((res, i) => (
                  <div key={i} className="p-3 flex items-center justify-between hover:bg-slate-50 rounded-xl transition-colors">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900">{res.name}</span>
                      <span className="text-slate-500 text-[10px] font-mono">{res.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {res.status === 'success' ? (
                        <div className="flex items-center gap-2 text-emerald-600">
                          <span className="text-[8px] font-black uppercase tracking-widest">Linked</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-rose-500">
                          <span className="text-[8px] font-black uppercase tracking-widest truncate max-w-[120px]">{res.message}</span>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Manual Onboarding</h3>
                <p className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-widest">Provision single identity</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Legal Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="text" 
                      value={formData.displayName}
                      onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                      placeholder="John Doe"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="email" 
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="name@wizdent.com"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Security Key</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      required
                      type="password" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Access Tier</label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                    >
                      <option value={UserRole.MANAGER}>Sales Manager / RSM</option>
                      <option value={UserRole.DEALER}>Field Dealer</option>
                      <option value={UserRole.ADMIN}>Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Geographic Assignment</label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <select 
                      value={formData.territory}
                      onChange={(e) => setFormData({...formData, territory: e.target.value})}
                      className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all appearance-none"
                    >
                      <option value="">Central Pool</option>
                      {TERRITORIES.map(t => (
                        <option key={t.code} value={t.code}>
                          {t.code} - {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {formData.role === UserRole.DEALER && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dealer Code</label>
                    <div className="relative">
                      <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        value={formData.dealerCode}
                        onChange={(e) => setFormData({...formData, dealerCode: e.target.value})}
                        placeholder="WD-DL-441"
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loading ? "PROVISIONING..." : "COMMIT IDENTITY"}
              </button>
            </form>
          </section>

          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
            <BulkImporter />
          </section>
        </div>

        {/* Right Hand: Intelligence */}
        <div className="lg:col-span-4 space-y-8">
          <Link 
            to="/users"
            className="group block bg-white rounded-3xl border border-slate-200 shadow-sm p-8 hover:shadow-xl hover:border-blue-200 transition-all overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <UsersIcon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">User Directory</h4>
                <p className="text-xs text-slate-500 font-medium">Access full personnel database, filter teams, and view individual activity logs.</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest">
                Explore Database
                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
