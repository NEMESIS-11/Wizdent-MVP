/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, deleteApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { db } from './firebase';
import { UserRole } from '../types';

export interface ProvisionUserInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole | string;
  dealerId?: string;
  dealerCode?: string;
  territory?: string;
}

export interface ProvisionUserResult {
  uid: string;
  /** false when the auth account already existed and we just (re)linked the profile */
  created: boolean;
}

/**
 * Creates/links a user account entirely on the client so it works on static
 * Firebase Hosting (no backend server). This replaces the old `/api/admin/create-user`
 * Express endpoint, which only existed during local `npm run dev` and returned the SPA
 * `index.html` in production (causing the "Unexpected token '<'" JSON parse error).
 *
 * The Auth account is created via a throwaway "secondary" Firebase app instance so the
 * signed-in admin's primary session is never disturbed. The Firestore directory profile
 * is then written with the admin's own session — Firestore rules already permit an admin
 * to create/update any `users/{uid}` document.
 */
export async function provisionUser(input: ProvisionUserInput): Promise<ProvisionUserResult> {
  const { email, password, displayName, role, dealerId, dealerCode, territory } = input;

  // A uniquely-named app avoids collisions when provisioning several users in one session.
  const secondaryAppName = `provision-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const secondaryApp = initializeApp(firebaseConfig as Record<string, string>, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);

  let uid: string;
  let created = true;

  try {
    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      uid = cred.user.uid;
      if (displayName) {
        // Non-fatal: directory profile below is the source of truth for the name.
        try { await updateProfile(cred.user, { displayName }); } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/email-already-in-use') {
        // Recover the existing UID so we can (re)link the directory profile. This only
        // succeeds when the supplied password matches the account's existing password,
        // which keeps re-running "Provision Existing Dealers" idempotent.
        try {
          const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
          uid = cred.user.uid;
          created = false;
        } catch {
          throw new Error('EMAIL_EXISTS');
        }
      } else if (code === 'auth/operation-not-allowed') {
        throw new Error(
          'Email/Password sign-in is disabled. Enable it in Firebase Console → Authentication → Sign-in method.'
        );
      } else if (code === 'auth/weak-password') {
        throw new Error('Password is too weak (minimum 6 characters).');
      } else if (code === 'auth/invalid-email') {
        throw new Error(`The email '${email}' is not formatted correctly.`);
      } else {
        throw err;
      }
    }

    // Write the directory profile using the ADMIN's primary session (rules allow admins).
    await setDoc(
      doc(db, 'users', uid),
      {
        uid,
        email,
        displayName,
        role,
        dealerId: dealerId || null,
        dealerCode: dealerCode || null,
        territory: territory || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { uid, created };
  } finally {
    // Tear down the throwaway app + its session so nothing lingers.
    try { await signOut(secondaryAuth); } catch { /* ignore */ }
    try { await deleteApp(secondaryApp); } catch { /* ignore */ }
  }
}
