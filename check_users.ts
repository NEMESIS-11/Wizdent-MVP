import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

async function run() {
  const app = admin.initializeApp({ projectId: firebaseConfig.projectId });
  const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
  
  try {
    const snap = await db.collection("users").get();
    console.log(`Found ${snap.size} users in Firestore.`);
    snap.forEach(doc => {
      console.log(`- ${doc.id}: ${doc.data().email} (${doc.data().role})`);
    });
  } catch (e: any) {
    console.error("Failed to read users:", e.message);
  }
}

run();
