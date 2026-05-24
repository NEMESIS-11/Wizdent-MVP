/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import { Layout } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Products from './pages/Products';
import Visits from './pages/Visits';
import PlanVisit from './pages/PlanVisit';
import Reports from './pages/Reports';
import AdminManagement from './pages/AdminManagement';
import Contacts from './pages/Contacts';
import AccountDetail from './pages/AccountDetail';
import ContactDetail from './pages/ContactDetail';
import ProductDetail from './pages/ProductDetail';
import Profile from './pages/Profile';
import Users from './pages/Users';
import UserDetail from './pages/UserDetail';

import VisitDetail from './pages/VisitDetail';

// Placeholder Pages
const ReportsPlaceholder = () => <div>Reports coming soon</div>;

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
        <div className="w-8 h-8 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  return <Layout>{children}</Layout>;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/accounts" element={
            <ProtectedRoute>
              <Accounts />
            </ProtectedRoute>
          } />
          <Route path="/accounts/:id" element={
            <ProtectedRoute>
              <AccountDetail />
            </ProtectedRoute>
          } />
          <Route path="/accounts/:accountId/contacts/:contactId" element={
            <ProtectedRoute>
              <ContactDetail />
            </ProtectedRoute>
          } />
          <Route path="/contacts" element={
            <ProtectedRoute>
              <Contacts />
            </ProtectedRoute>
          } />
          <Route path="/products" element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="/products/:id" element={
            <ProtectedRoute>
              <ProductDetail />
            </ProtectedRoute>
          } />
          <Route path="/visits" element={
            <ProtectedRoute>
              <Visits />
            </ProtectedRoute>
          } />
          <Route path="/visits/:id" element={
            <ProtectedRoute>
              <VisitDetail />
            </ProtectedRoute>
          } />
          <Route path="/visits/new" element={
            <ProtectedRoute>
              <PlanVisit />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminManagement />
            </ProtectedRoute>
          } />
          <Route path="/users" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
          <Route path="/users/:id" element={
            <ProtectedRoute>
              <UserDetail />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          {/* Default catch-all */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
