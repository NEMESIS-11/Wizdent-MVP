/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isDealer: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            const data = profileDoc.data() as UserProfile;
            const isAdminEmail = user.email === 'parvvirmani07@gmail.com' || user.email === 'admin@wizdent.system';
            
            // Auto-promote to admin if email matches but role doesn't
            if (isAdminEmail && data.role !== UserRole.ADMIN) {
              const { updateDoc, doc: fireDoc } = await import('firebase/firestore');
              await updateDoc(fireDoc(db, 'users', user.uid), { role: UserRole.ADMIN });
              setProfile({ ...data, role: UserRole.ADMIN });
            } else {
              setProfile(data);
            }
          } else {
            // Default profile for first-time login if needed
            // In a real SaaS, profiles are often pre-provisioned or created on invite
            setProfile(null);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === UserRole.ADMIN || user?.email === 'parvvirmani07@gmail.com' || user?.email === 'admin@wizdent.system',
    isManager: profile?.role === UserRole.MANAGER,
    isDealer: profile?.role === UserRole.DEALER,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
