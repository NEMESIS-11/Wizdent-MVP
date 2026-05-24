/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  DEALER = 'DEALER',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  dealerId?: string;
  dealerCode?: string;
  territory?: string;
  createdAt: string;
}

export enum AccountType {
  CLINIC = 'CLINIC',
  DEALER = 'DEALER',
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  address: string;
  territory: string;
  dealerCode?: string;
  resellerLandingCost?: number;
  noOfPatients?: number;
  clinicType?: string;
  visitCounter: number;
  firstConvertedVisit: boolean;
  slab?: string;
}

export interface Contact {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  mobile: string;
  email: string;
}

export interface Product {
  id: string;
  name: string;
  code: string;
  division: string;
  brand: string;
  active: boolean;
  category: string;
  packSize: string;
  standardPrice: number;
  resellerPrice: number;
  dentistPrice: number;
  materialType?: string;
  volume?: string;
  weight?: string;
  activeFlag?: boolean;
}

export enum VisitType {
  SELL = 'SELL',
  DEMO = 'DEMO',
  DEMO_SELL = 'DEMO & SELL',
  FOLLOW_UP = 'Follow Up',
  SAMPLING = 'Sampling',
  PROMOTION = 'Promotion',
  PROMOTION_SELL = 'Promotion and Sell',
}

export enum ActivityType {
  MEETING = 'Meeting',
  WORKSHOP = 'Workshop',
  CONFERENCE = 'Conference',
}

export enum VisitStatus {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface GeolocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface Visit {
  id: string;
  name?: string; // Auto-named based on Account and Date
  accountId: string;
  dealerId: string;
  dealerUid: string;
  dealerCode?: string;
  territory?: string;
  contactId: string;
  status: VisitStatus;
  visitType: VisitType;
  plannedDate: string;
  checkInTime?: string;
  checkOutTime?: string;
  checkInLocation?: GeolocationData;
  checkOutLocation?: GeolocationData;
  durationMinutes?: number;
  dateTime: string;
  startDate?: string;
  visitActionPoints?: string;
  activityType?: ActivityType;
  conferenceName?: string;
  totalRevenue: number;
  totalProductSold: number;
  totalVisitPrice?: number;
  totalPILSalesValue?: number;
  discountAmount?: number;
  hasSoldProduct: boolean;
  visitConverted: boolean;
  visitBefore3PM?: boolean;
  visitAfter3PM?: boolean;
  attendeeCount: number;
  attendees?: string[];
  visitCounter?: number;
  packageId?: string;
  packageCategory?: string;
  soldPackage?: string;
  sampleDelivery?: boolean;
  samplePickUp?: boolean;
  area?: string;
  slab?: string;
  week?: string;
  financialYear?: string;
  orderReceivedByDentist?: boolean;
  orderDispatch?: boolean;
  visitSubject?: string;
  currency?: string;
  noOfPatients?: number;
  dateCount?: boolean;
  package?: string;
  testFinancialYear?: string;
  resellerLandingCost?: number;
  firstConvertedVisit?: boolean;
  digitalExponent2021?: string;
  rebrandyUrlDealer?: string;
  rebrandyUrlDentist?: string;
  dentistResponseUrl?: string;
  urlVisitDetails?: string;
  urlResponseFromClinic?: string;
  urlResponseFromDealer?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SoldProduct {
  id: string;
  visitId: string;
  productId: string;
  productName: string;
  brandName: string;
  quantity: number;
  price: number; 
  listPrice: number; 
  resellerCost: number; 
  totalSoldPrice: number;
  totalListPrice: number;
  stockUpdated?: boolean;
  stockUpdatedIn?: string;
  firstProductForAccount?: boolean;
}

export interface DemoProduct {
  id: string;
  visitId: string;
  productId: string;
  productName: string;
  quantity: number;
  demoDate?: string;
  remarks?: string;
}

export interface DiscussedProduct {
  id: string;
  visitId: string;
  productId: string;
  productName: string;
  remarks?: string;
}

export interface FreeProduct {
  id: string;
  visitId: string;
  productId: string;
  productName: string;
  quantity: number;
  type: 'SAMPLE' | 'PROMO';
}
