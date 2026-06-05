import React, { useState, useEffect, useMemo } from 'react';
import { 
  REGIONS, 
  getStatesByRegion, 
  getTerritoriesByState 
} from '../../constants';

interface CreateManagerProps {
  onSave: (data: {
    displayName: string;
    email: string;
    role: string;
    region: string | null;
    stateCode: string | null;
    territory: string | null;
  }) => void;
  onCancel: () => void;
  loading?: boolean;
}

/**
 * Admin form for creating manager accounts with dynamic hierarchical geographic selection.
 */
export default function CreateManager({ onSave, onCancel, loading }: CreateManagerProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [region, setRegion] = useState<string>('');
  const [stateCode, setStateCode] = useState<string>('');
  const [territory, setTerritory] = useState<string>('');

  // Reset dependent selections when higher-level choice changes to maintain data integrity
  useEffect(() => {
    setRegion('');
    setStateCode('');
    setTerritory('');
  }, [role]);

  useEffect(() => {
    setStateCode('');
    setTerritory('');
  }, [region]);

  useEffect(() => {
    setTerritory('');
  }, [stateCode]);

  // Memoized filtered lists based on current selection
  const availableStates = useMemo(() => getStatesByRegion(region), [region]);
  const availableAreas = useMemo(() => getTerritoriesByState(stateCode), [stateCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      displayName,
      email,
      role,
      region: region || null,
      stateCode: stateCode || null,
      territory: territory || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-xl mx-auto">
      <div>
        <h3 className="text-xl font-bold text-slate-900">Create Manager Account</h3>
        <p className="text-sm text-slate-500">Enter user details and assign their management level.</p>
      </div>

      <div className="space-y-4">
        {/* 0. Identity Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">FULL NAME</label>
            <input
              required
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">EMAIL ADDRESS</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="manager@wizdent.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
            />
          </div>
        </div>

        <div className="h-px bg-slate-100 my-2" />

        {/* 1. Manager Level Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">MANAGER LEVEL</label>
          <select
            required
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
          >
            <option value="">Select Level</option>
            <option value="RSM">Regional Sales Manager (RSM)</option>
            <option value="STATE_MANAGER">State wise Sales Manager</option>
            <option value="ASM">Area Sales Manager (ASM)</option>
          </select>
        </div>

        {role && (
          <>
            {/* 2. Region selection: Required for all manager levels */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">REGION</label>
              <select
                required
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none"
              >
                <option value="">Select Region</option>
                {REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>

            {/* 3. State selection: Required for State Manager and ASM */}
            {(role === 'STATE_MANAGER' || role === 'ASM') && (
              <div className="space-y-1.5 animate-in slide-in-from-top-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ASSIGNED STATE</label>
                <select
                  required
                  disabled={!region}
                  value={stateCode}
                  onChange={(e) => setStateCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none disabled:opacity-50"
                >
                  <option value="">{region ? "Select State" : "Select Region First"}</option>
                  {availableStates.map((s) => (
                    <option key={s.code} value={s.code}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Area selection: Required for ASM only */}
            {role === 'ASM' && (
              <div className="space-y-1.5 animate-in slide-in-from-top-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ASSIGNED AREA (ASM ONLY)</label>
                <select
                  required
                  disabled={!stateCode}
                  value={territory}
                  onChange={(e) => setTerritory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none disabled:opacity-50"
                >
                  <option value="">{stateCode ? "Select Area" : "Select State First"}</option>
                  {availableAreas.map((a) => (
                    <option key={a.code} value={a.code}>{a.name} ({a.code})</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex gap-4 pt-4 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
        <button type="submit" disabled={loading || !role} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 shadow-xl shadow-slate-900/10">
          {loading ? "Creating..." : "Save Manager Account"}
        </button>
      </div>
    </form>
  );
}