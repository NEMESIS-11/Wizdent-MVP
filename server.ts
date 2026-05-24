import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin
const adminApp = admin.apps.length 
  ? admin.app() 
  : admin.initializeApp({
      projectId: firebaseConfig.projectId,
    });

const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const auth = getAuth(adminApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Create User (Admin Only)
  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, displayName, role, dealerId, dealerCode, territory } = req.body;
    const authHeader = req.headers.authorization;
    console.log(`Request to create user: ${email}, DB ID: ${firebaseConfig.firestoreDatabaseId}`);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const idToken = authHeader.split("Bearer ")[1];

    try {
      // Verify the requester is an admin
      console.log("Verifying ID token with Admin SDK...");
      const decodedToken = await auth.verifyIdToken(idToken);
      const requesterId = decodedToken.uid;
      const requesterEmail = decodedToken.email;
      
      console.log(`Checking admin status for: ${requesterEmail} (${requesterId})`);
      
      let hasAdminRole = false;
      try {
        console.log("Attempting Firestore READ for requester role via REST...");
        // Use REST API with the requester's token to read their own profile or check admin status
        // Since the rules allow an admin to read any profile, this should work if the requester is an admin
        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${requesterId}`;
        const fsResponse = await fetch(firestoreUrl, {
          headers: {
            "Authorization": `Bearer ${idToken}`
          }
        });
        
        if (fsResponse.ok) {
          const fsData: any = await fsResponse.json();
          // Use a different name to avoid shadowing the 'role' from req.body
          const requesterFSDataRole = fsData.fields?.role?.stringValue;
          hasAdminRole = requesterFSDataRole === "ADMIN";
          console.log(`User role in Firestore: ${requesterFSDataRole || "NOT_FOUND"}`);
        } else {
          const errData = await fsResponse.json();
          console.warn("Firestore REST READ FAILED:", errData.error?.message || fsResponse.statusText);
        }
      } catch (dbErr: any) {
        console.warn("Firestore READ Fetch Error:", dbErr.message);
      }

      const isExplicitAdmin = requesterEmail === 'parvvirmani07@gmail.com' || requesterEmail === 'admin@wizdent.system';

      if (!isExplicitAdmin && !hasAdminRole) {
        console.log("User is not an admin.");
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }

      console.log(`Creating auth user for email: ${email} using REST API...`);
      // Create Auth User via REST API
      const restUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseConfig.apiKey}`;
      const restResponse = await fetch(restUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      });
      
      let restData = await restResponse.json();
      let newUid: string;
      let newUserToken: string;

      if (!restResponse.ok) {
        if (restData.error?.message === "EMAIL_EXISTS") {
          console.log("Email already exists in Auth. Attempting to recover UID via signIn...");
          // If email exists, try to sign in with provided password to get UID
          const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;
          const signInResponse = await fetch(signInUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              returnSecureToken: true
            })
          });
          const signInData = await signInResponse.json();
          
          if (!signInResponse.ok) {
            // Cannot get UID without password or proper Admin SDK
            return res.status(409).json({ 
              error: "EMAIL_EXISTS", 
              message: "This email is already registered. If you are trying to register this user into the directory, ensure the password matches their existing one, or manage them via the Firebase Console." 
            });
          }
          
          newUid = signInData.localId;
          newUserToken = signInData.idToken;
          console.log(`Recovered existing UID: ${newUid}`);
        } else {
          throw new Error(`Auth REST API failed: ${restData.error?.message || "Unknown error"}`);
        }
      } else {
        newUid = restData.localId;
        newUserToken = restData.idToken;
      }

      console.log(`User UID identified as: ${newUid}. Synchronizing profile...`);

      // Set display name via REST API (this works for both new and existing users if token is valid)
      const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${firebaseConfig.apiKey}`;
      await fetch(updateUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken: newUserToken,
          displayName,
          returnSecureToken: true
        })
      });

      console.log(`Saving to Firestore profile for UID: ${newUid} via REST...`);
      // Use Firestore PATCH with updateMask to ensure creation/overwrite
      const fields: any = {
        uid: { stringValue: newUid },
        email: { stringValue: email },
        displayName: { stringValue: displayName },
        role: { stringValue: role },
        dealerId: dealerId ? { stringValue: dealerId } : { nullValue: null },
        dealerCode: dealerCode ? { stringValue: dealerCode } : { nullValue: null },
        territory: territory ? { stringValue: territory } : { nullValue: null },
        createdAt: { timestampValue: new Date().toISOString() },
        updatedAt: { timestampValue: new Date().toISOString() }
      };
      
      const updateMask = Object.keys(fields).map(f => `updateMask.fieldPaths=${f}`).join("&");
      const patchFsUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${newUid}?${updateMask}`;
      
      const patchFsResponse = await fetch(patchFsUrl, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/users/${newUid}`,
          fields
        })
      });

      if (!patchFsResponse.ok) {
        const errData = await patchFsResponse.json();
        throw new Error(`Firestore REST WRITE failed: ${errData.error?.message || patchFsResponse.statusText}`);
      }
      
      console.log("Firestore profile created.");

      res.json({ message: "User created successfully", uid: newUid });
    } catch (error: any) {
      console.error("Error creating user. Full error details:");
      console.error(JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
      res.status(500).json({ error: error.message, code: error.code, details: error.details });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
