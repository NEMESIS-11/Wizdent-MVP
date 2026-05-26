import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserRole, Visit } from '../types';
import { 
  ArrowLeft, 
  MapPin, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Building2, 
  CheckCircle2, 
  TrendingUp,
  ExternalLink,
  ShieldCheck,
  FileText,
  Loader2,
  AlertCircle,
  Edit2,
  X,
  Save,
  User as UserIcon
} from 'lucide-react';
import { cn, parseSafeDate } from '../lib/utils';
import { TERRITORIES, getTerritoryName } from '../constants';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  territory?: string;
  dealerCode?: string;
  dealerId?: string;
  createdAt?: any;
}

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAdmin, isManager } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentVisits, setRecentVisits] = useState<Visit[]>([]);
  const [stats, setStats] = useState({ totalVisits: 0, thisMonth: 0 });

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    displayName: '',
    role: UserRole.DEALER,
    territory: '',
    dealerCode: ''
  });

  useEffect(() => {
    if (id) {
      fetchUserDetail();
    }
  }, [id]);

  const fetchUserDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!id) return;
      
      const userDoc = await getDoc(doc(db, 'users', id));
      if (!userDoc.exists()) {
        setError('User profile not found.');
        return;
      }

      const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      setProfile(userData);
      setEditFormData({
        displayName: userData.displayName || '',
        role: userData.role || UserRole.DEALER,
        territory: userData.territory || '',
        dealerCode: userData.dealerCode || ''
      });

      // Fetch recent visits
      const visitsQuery = query(
        collection(db, 'visits'),
        where('dealerUid', '==', id),
        orderBy('dateTime', 'desc'),
        limit(10)
      );
      
      const visitsSnapshot = await getDocs(visitsQuery);
      const visits = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visit));
      setRecentVisits(visits);

      // Simple stats
      setStats({
        totalVisits: visits.length,
        thisMonth: visits.filter(v => parseSafeDate(v.dateTime).getMonth() === new Date().getMonth()).length
      });

    } catch (err) {
      console.error(err);
      setError('Failed to fetch user data sequence.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin) return;
    setActionLoading(true);
    try {
      await updateDoc(doc(db, 'users', id), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      setProfile(prev => prev ? { ...prev, ...editFormData } : null);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError("Failed to update profile: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (isManager) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6">
        <div className="bg-slate-900 border border-slate-800 p-12 rounded-[2.5rem] text-center space-y-6 shadow-2xl text-white">
          <Shield className="w-16 h-16 text-rose-500 mx-auto animate-pulse" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-white">Security Access Warning</h2>
            <p className="text-slate-400 text-sm font-medium">
              Sales Managers are restricted from accessing individual user details and the Team Directory to maintain compliance with resource allocation guidelines.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => navigate('/')}
              className="inline-block bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black px-8 py-3.5 rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
            >
              Return to Center
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center">Decrypting Identity Profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-6">
        <div className="bg-rose-50 border border-rose-100 p-8 rounded-3xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <p className="text-lg font-bold text-rose-900">{error || 'Unknown Error'}</p>
          <button onClick={() => navigate('/users')} className="text-[10px] font-black text-white bg-rose-500 px-6 py-2.5 rounded-xl uppercase tracking-widest">Back to Directory</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20 px-4 md:px-8">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/users')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Directory</span>
        </button>

        {isAdmin && !isEditing && (
          <button 
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Modify Profile
          </button>
        )}
      </div>

      {isEditing && (
        <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white animate-in slide-in-from-top-4 duration-500">
           <form onSubmit={handleUpdateProfile} className="space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-6 h-6" />
                  <h3 className="text-xl font-black uppercase tracking-tight">Identity Modification Mode</h3>
                </div>
                <button type="button" onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Display Name</label>
                    <input 
                      required
                      type="text"
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-white/10"
                      value={editFormData.displayName}
                      onChange={e => setEditFormData({...editFormData, displayName: e.target.value})}
                    />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Operational Role</label>
                    <select 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-white/10"
                      value={editFormData.role}
                      onChange={e => setEditFormData({...editFormData, role: e.target.value as UserRole})}
                    >
                      <option value={UserRole.ADMIN} className="text-slate-900">ADMINISTRATOR</option>
                      <option value={UserRole.MANAGER} className="text-slate-900">SALES MANAGER</option>
                      <option value={UserRole.DEALER} className="text-slate-900">FIELD DEALER</option>
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Territory Allocation</label>
                    <select 
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-white/10 text-white"
                      value={editFormData.territory}
                      onChange={e => setEditFormData({...editFormData, territory: e.target.value})}
                    >
                      <option value="" className="text-slate-900">CENTRAL POOL</option>
                      {TERRITORIES.map(t => (
                        <option key={t.code} value={t.code} className="text-slate-900">
                          {t.code} - {t.name}
                        </option>
                      ))}
                    </select>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 ml-1">Dealer Reference Code</label>
                    <input 
                      type="text"
                      className="w-full bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none focus:ring-4 focus:ring-white/10"
                      placeholder="WD-DL-XXX"
                      value={editFormData.dealerCode}
                      onChange={e => setEditFormData({...editFormData, dealerCode: e.target.value})}
                    />
                 </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                 <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className="px-6 py-3 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={actionLoading}
                  className="px-8 py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-xl shadow-black/20 flex items-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  COMMIT CHANGES
                </button>
              </div>
           </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-32 bg-slate-900 relative">
              <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay" />
              <div className="absolute -bottom-16 left-8">
                <div className={cn(
                  "w-32 h-32 rounded-3xl flex items-center justify-center text-4xl font-black border-8 border-white shadow-2xl",
                  profile.role === UserRole.ADMIN ? "bg-slate-800 text-white" :
                  profile.role === UserRole.MANAGER ? "bg-indigo-600 text-white" :
                  "bg-blue-100 text-blue-600"
                )}>
                  {profile.displayName?.substring(0, 2).toUpperCase() || '??'}
                </div>
              </div>
            </div>

            <div className="pt-20 px-8 pb-8">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{profile.displayName}</h3>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
                    profile.role === UserRole.ADMIN ? "bg-slate-50 text-slate-900 border-slate-200" :
                    profile.role === UserRole.MANAGER ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                    "bg-blue-50 text-blue-700 border-blue-100"
                  )}>
                    {profile.role}
                  </span>
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified User</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 space-y-6">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Primary Email</p>
                    <p className="text-xs font-bold text-slate-900 select-all">{profile.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned Territory</p>
                    <p className="text-xs font-bold text-slate-900">
                      {profile.territory ? `${profile.territory} (${getTerritoryName(profile.territory)})` : 'None Assigned'}
                    </p>
                  </div>
                </div>

                {profile.dealerCode && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-500 border border-blue-100 shadow-sm">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Professional Code</p>
                      <p className="text-xs font-black text-blue-700">{profile.dealerCode}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Core Stats Card */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-slate-900/40">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full -mr-10 -mt-10 blur-2xl" />
            <div className="relative z-10 space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] text-blue-400">Activity Hub</h4>
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Field Statistics</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Visits logged</p>
                  <p className="text-2xl font-black text-white">{stats.thisMonth}</p>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Lifetime</p>
                  <p className="text-2xl font-black text-white">{stats.totalVisits}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Major Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Details & Actions Section */}
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Recent Engagement Activity</h3>
              </div>
              <Link to="/visits" className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-[0.2em]">View History</Link>
            </div>

            <div className="space-y-4">
              {recentVisits.length > 0 ? (
                recentVisits.map(visit => (
                  <Link 
                    key={visit.id}
                    to={`/visits/${visit.id}`}
                    className="flex items-center justify-between p-5 bg-slate-50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5 rounded-3xl transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase">{format(parseSafeDate(visit.dateTime), 'MMM')}</span>
                        <span className="text-xl font-black text-slate-900 leading-none">{format(parseSafeDate(visit.dateTime), 'dd')}</span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors uppercase truncate max-w-[200px]">{visit.name}</p>
                        <div className="flex items-center gap-3 text-slate-400">
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black uppercase">
                            {visit.visitType}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-[10px] font-medium">{format(parseSafeDate(visit.dateTime), 'hh:mm a')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))
              ) : (
                <div className="text-center py-12 px-6 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] space-y-3">
                  <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center mx-auto text-slate-300 shadow-sm">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">No Activity Records</p>
                    <p className="text-[10px] text-slate-400 font-medium">This personnel has not logged any visits yet.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Territory & Context Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Regional Coverage</h3>
              </div>
              <div className="space-y-4">
                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-3xl">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Primary Zone</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-black text-slate-900 leading-tight uppercase tracking-tight">{profile.territory || 'Unassigned'}</p>
                      <p className="text-[10px] font-bold text-indigo-600 mt-1 uppercase tracking-widest">
                        {profile.territory ? getTerritoryName(profile.territory) : 'Global Pool'}
                      </p>
                    </div>
                    <MapPin className="w-10 h-10 text-indigo-200" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-widest italic text-center pt-2">
                  Visibility strictly scoped to zone parameters.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900">Security Clearance</h3>
              </div>
              <div className="space-y-6">
                 <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                     <Shield className="w-4 h-4" />
                   </div>
                   <div>
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Tier</p>
                     <p className="text-[11px] font-bold text-slate-900 uppercase">{profile.role === UserRole.ADMIN ? 'Level 0: Total Oversight' : profile.role === UserRole.MANAGER ? 'Level 1: Regional Access' : 'Level 2: Operational Only'}</p>
                   </div>
                 </div>
                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Account Status</span>
                   <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded">ACTIVE</span>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
