/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { AccountType, VisitType } from '../types';
import { subDays } from 'date-fns';

const DUMMY_PRODUCTS = [
  { id: 'prod-1', name: 'Wonder Edge DC Chromatic (5ml)', code: 'FWD8013007WEC5A', division: 'IP1', brand: 'Wizdent', active: true, category: 'Bonding', packSize: '5ml', standardPrice: 3000, resellerPrice: 1800, dentistPrice: 2325 },
  { id: 'prod-2', name: 'Composite Pro-Fill A2', code: 'CPF002-A2', division: 'IP1', brand: 'Wizdent', active: true, category: 'Restorative', packSize: '4g Syringe', standardPrice: 1500, resellerPrice: 900, dentistPrice: 1200 },
  { id: 'prod-3', name: 'Dental Implant Titanium G2', code: 'IMP-G2-001', division: 'IP2', brand: 'Precision', active: true, category: 'Implants', packSize: 'Single Unit', standardPrice: 12000, resellerPrice: 8000, dentistPrice: 9500 },
  { id: 'prod-4', name: 'Nano-Coating Kit v2', code: 'NCK-V2-88', division: 'IP1', brand: 'Wizdent', active: true, category: 'Coating', packSize: 'Kit', standardPrice: 5000, resellerPrice: 3500, dentistPrice: 4200 },
  { id: 'prod-5', name: 'Ortho Brackets Metal Set', code: 'ORB-MET-01', division: 'IP3', brand: 'OrthoLine', active: true, category: 'Orthodontics', packSize: '20 Units', standardPrice: 4000, resellerPrice: 2800, dentistPrice: 3500 },
];

const DUMMY_CLINICS = [
  { id: 'clinic-1', name: 'SmileDental Clinic', type: AccountType.CLINIC, address: '123 Health Ave, New York', territory: 'NY-NORTH', noOfPatients: 450, clinicType: 'General', visitCounter: 12, firstConvertedVisit: true },
  { id: 'clinic-2', name: 'WhitePearls Lab', type: AccountType.CLINIC, address: '45 Pearl St, Brooklyn', territory: 'NY-SOUTH', noOfPatients: 200, clinicType: 'Specialist', visitCounter: 8, firstConvertedVisit: true },
  { id: 'clinic-3', name: 'Zenith Dental Care', type: AccountType.CLINIC, address: '88 Zenith Way, Queens', territory: 'NY-EAST', noOfPatients: 600, clinicType: 'Multi-Specialty', visitCounter: 5, firstConvertedVisit: false },
  { id: 'clinic-4', name: 'Metro Oral Health', type: AccountType.CLINIC, address: '12 Metro Plaza, Bronx', territory: 'NY-WEST', noOfPatients: 320, clinicType: 'General', visitCounter: 3, firstConvertedVisit: false },
  { id: 'clinic-5', name: 'Elite Braces Center', type: AccountType.CLINIC, address: '99 Elite Blvd, Manhattan', territory: 'NY-NORTH', noOfPatients: 150, clinicType: 'Orthodontic', visitCounter: 7, firstConvertedVisit: true },
];

const DUMMY_DEALERS = [
  { id: 'dealer-1', name: 'ProMis Dental Systems', type: AccountType.DEALER, address: 'Corporate Hub, NJ', territory: 'NY-RETAIL', dealerCode: 'PMDS-001', resellerLandingCost: 10000, slab: 'Slab 5' },
  { id: 'dealer-2', name: 'Advanced Medicorp', type: AccountType.DEALER, address: 'Pharma Park, CT', territory: 'NY-WHOLESALE', dealerCode: 'AMC-99', resellerLandingCost: 8000, slab: 'Slab 3' },
];

export async function seedSystemData(currentUserId: string) {
  console.log("Starting batch seed process...");
  const batch = writeBatch(db);

  // 1. Seed Products
  DUMMY_PRODUCTS.forEach(p => {
    const { id, ...data } = p;
    const ref = doc(db, 'products', id);
    batch.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  });

  // 2. Seed Dealers
  DUMMY_DEALERS.forEach(d => {
    const { id, ...data } = d;
    const ref = doc(db, 'accounts', id);
    batch.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  });

  // 3. Seed Clinics
  DUMMY_CLINICS.forEach(c => {
    const { id, ...data } = c;
    const ref = doc(db, 'accounts', id);
    batch.set(ref, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  });

  // 4. Seed Contacts for Clinics and Historical Visits
  DUMMY_CLINICS.forEach((clinic, i) => {
    // Contact
    const contactId = `contact-${clinic.id}`;
    const contactRef = doc(db, `accounts/${clinic.id}/contacts`, contactId);
    batch.set(contactRef, {
      accountId: clinic.id,
      firstName: ['Sarah', 'John', 'Li', 'Alice', 'Michael'][i % 5],
      lastName: ['Tan', 'Doe', 'Wang', 'Gray', 'Smith'][i % 5],
      specialty: ['GP', 'Orthodontist', 'Implantologist', 'Periodontist', 'GP'][i % 5],
      mobile: `+1-555-010${i}`,
      email: `dr.${i}@example.com`,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Visits (2 per clinic)
    for (let j = 0; j < 2; j++) {
      const visitId = `visit-${clinic.id}-${j}`;
      const date = subDays(new Date(), (i * 2) + j);
      const isConverted = (i + j) % 2 === 0;
      const rev = isConverted ? 2500 + (j * 500) : 0;
      
      const visitRef = doc(db, 'visits', visitId);
      batch.set(visitRef, {
        accountId: clinic.id,
        dealerId: DUMMY_DEALERS[0].id,
        dealerUid: currentUserId,
        contactId: contactId,
        visitType: j === 0 ? VisitType.SELL : VisitType.DEMO,
        dateTime: date.toISOString(),
        visitActionPoints: 'Automated demo data visit record.',
        totalRevenue: rev,
        totalProductSold: isConverted ? 2 : 0,
        hasSoldProduct: isConverted,
        visitConverted: isConverted,
        attendeeCount: 1,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  });

  await batch.commit();
  console.log("Seeding complete via batch.");
}

