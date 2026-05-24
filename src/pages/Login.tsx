/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';
import { LogIn, User, Key, Mail, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'google' | 'password'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        const isAdminEmail = user.email === 'parvvirmani07@gmail.com' || user.email === 'admin@wizdent.system';
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: isAdminEmail ? UserRole.ADMIN : UserRole.DEALER,
          createdAt: serverTimestamp(),
        });
      }
      
      navigate('/');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError("The sign-in popup was closed. Please try again and complete the sign-in process.");
      } else if (err.code === 'auth/popup-blocked') {
        setError("Sign-in popup was blocked by your browser. Please allow popups for this site.");
      } else if (err.code === 'auth/cancelled-by-user') {
        setError("Sign-in was cancelled.");
      } else {
        setError(err.message || "Failed to log in");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Map username aliases to internal email
    let loginEmail = email.trim();
    if (loginEmail === 'username-admin' || loginEmail === 'admin') {
      loginEmail = 'admin@wizdent.system';
    } else if (!loginEmail.includes('@')) {
      setError("Please enter a valid email address or the 'admin' username.");
      setLoading(false);
      return;
    }

    try {
      console.log(`[AUTH] Attempting login for mapping: ${email} -> ${loginEmail}`);
      await signInWithEmailAndPassword(auth, loginEmail, password);
      console.log("[AUTH] Login successful");
      navigate('/');
    } catch (err: any) {
      console.error("[AUTH] Login failed:", err.code, err.message);
      if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password sign-in is disabled. Please enable it in the Firebase Console under Authentication > Sign-in method.");
      } else if (err.code === 'auth/invalid-email') {
        setError(`The email '${loginEmail}' is not formatted correctly.`);
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError(`Login failed for '${loginEmail}'. IMPORTANT: You must add this user in the 'Authentication' tab of the Firebase Console. Adding them to Firestore is not enough for login.`);
      } else {
        setError("Authentication failed: " + (err.message || "Unknown error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 mx-auto rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-900/20">
            <span className="text-2xl font-bold text-white font-mono">W</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Wizdent CRM</h1>
          <p className="text-slate-400 mt-2">Field sales automation for dental supply</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-xs mb-6 italic">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex p-1 bg-slate-800/50 rounded-xl border border-slate-700">
            <button 
              onClick={() => setMethod('google')}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                method === 'google' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Google
            </button>
            <button 
              onClick={() => setMethod('password')}
              className={cn(
                "flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded-lg transition-all",
                method === 'password' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-white"
              )}
            >
              Credentials
            </button>
          </div>

          {method === 'google' ? (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 hover:bg-slate-100 font-semibold py-3 px-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-slate-900/20 border-t-slate-900 rounded-full animate-spin" />
              ) : (
                <LogIn className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              )}
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Username / Email</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="username-admin"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Password</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-all disabled:opacity-50 mt-2 shadow-lg shadow-blue-900/20"
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-[10px] text-slate-500 leading-relaxed uppercase tracking-widest">
          Proprietary system for Wizdent employees. 
          Unauthorized access is prohibited.
        </p>
      </motion.div>
    </div>
  );
}
