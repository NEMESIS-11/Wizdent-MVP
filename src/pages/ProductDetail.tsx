/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { format } from 'date-fns';
import { 
  Package, 
  ChevronLeft, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Tag, 
  ShieldCheck, 
  Layers, 
  Box,
  IndianRupee,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn, handleFirestoreError, OperationType, parseSafeDate } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({});

  useEffect(() => {
    async function fetchProduct() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Product;
          setProduct(data);
          setFormData(data);
        } else {
          setError("Product not found.");
        }
      } catch (err: any) {
        handleFirestoreError(err, OperationType.GET, `products/${id}`);
        setError("Failed to load product details.");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !isAdmin) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const docRef = doc(db, 'products', id);
      const updateData = {
        ...formData,
        standardPrice: Number(formData.standardPrice),
        resellerPrice: Number(formData.resellerPrice),
        dentistPrice: Number(formData.dentistPrice),
        updatedAt: new Date().toISOString()
      };
      
      await updateDoc(docRef, updateData);
      setProduct({ ...product, ...updateData } as Product);
      setIsEditing(false);
      setSuccess("Product updated successfully!");
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${id}`);
      setError("Failed to update product.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !isAdmin) return;
    
    setIsDeleting(true);
    setError(null);

    try {
      await deleteDoc(doc(db, 'products', id));
      navigate('/products');
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `products/${id}`);
      setError("Failed to delete product.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">Loading product matrix...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="bg-red-50 border border-red-100 p-8 rounded-3xl mb-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Operation Error</h2>
          <p className="text-slate-600 mb-6">{error || "The product you're looking for doesn't exist."}</p>
          <button 
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Catalog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/products')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold text-[10px] uppercase tracking-[0.2em] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Product Catalog
        </button>
        
        <div className="flex items-center gap-3">
          {isAdmin && !isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
              >
                <Edit3 className="w-4 h-4" />
                Edit SKU
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 bg-white border border-red-100 text-red-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete SKU
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 -z-10" />
              <Trash2 className="w-12 h-12 text-red-500 mb-6" />
              <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Destructive Action</h3>
              <p className="text-slate-500 text-sm mb-8">Are you sure you want to delete this product? This action is permanent and cannot be undone.</p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="w-full bg-red-600 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-900/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Deletion"}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600"
                >
                  Keep SKU
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3 text-emerald-700 text-xs font-bold shadow-lg shadow-emerald-500/10"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Header section with icon and key info */}
            <div className="p-8 pb-0 flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-20 h-20 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-2xl shadow-blue-600/30">
                <Package className="w-10 h-10" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {product.code}
                  </span>
                  <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    {product.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-2">
                  {product.name}
                </h1>
                <p className="text-slate-500 text-sm font-medium">{product.brand} • {product.category}</p>
              </div>
            </div>

            <div className="p-8">
              {!isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <DetailItem icon={Layers} label="Division" value={product.division} />
                    <DetailItem icon={Box} label="Pack Size" value={product.packSize} />
                  </div>
                  <div className="space-y-6">
                    <DetailItem icon={Calendar} label="Last Updated" value={format(parseSafeDate(product.updatedAt || product.createdAt), 'dd MMM yyyy, hh:mm a')} />
                    <DetailItem icon={ShieldCheck} label="Brand Authority" value={product.brand} />
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField 
                      label="Product Name" 
                      value={formData.name || ''} 
                      onChange={v => setFormData(f => ({...f, name: v}))}
                      placeholder="Product Name"
                    />
                    <InputField 
                      label="Division" 
                      value={formData.division || ''} 
                      onChange={v => setFormData(f => ({...f, division: v}))}
                      placeholder="Division"
                    />
                    <InputField 
                      label="Pack Size" 
                      value={formData.packSize || ''} 
                      onChange={v => setFormData(f => ({...f, packSize: v}))}
                      placeholder="Pack Size"
                    />
                    <InputField 
                      label="Brand" 
                      value={formData.brand || ''} 
                      onChange={v => setFormData(f => ({...f, brand: v}))}
                      placeholder="Brand"
                    />
                    <InputField 
                      label="Category" 
                      value={formData.category || ''} 
                      onChange={v => setFormData(f => ({...f, category: v}))}
                      placeholder="Category"
                    />
                    <div className="flex items-center gap-2 sm:col-span-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="active" 
                        checked={formData.active}
                        onChange={e => setFormData(f => ({...f, active: e.target.checked}))}
                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="active" className="text-sm font-bold text-slate-700">Set as Active SKU</label>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-slate-100">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 bg-slate-900 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Finalize Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData(product);
                      }}
                      className="px-6 py-4 border border-slate-200 text-slate-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
                    >
                      Discard
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Strategy Column */}
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-900/40 relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-widest text-blue-400">Pricing Matrix</h3>
              </div>

              {!isEditing ? (
                <div className="space-y-8">
                  <PriceCard label="Standard Price" value={product.standardPrice} variant="primary" />
                  <PriceCard label="Reseller Rate" value={product.resellerPrice} variant="secondary" />
                  <PriceCard label="Dentist Rate" value={product.dentistPrice} variant="secondary" />
                </div>
              ) : (
                <div className="space-y-4">
                  <PriceInputField 
                    label="Standard Rate" 
                    value={formData.standardPrice || 0} 
                    onChange={v => setFormData(f => ({...f, standardPrice: v}))}
                  />
                  <PriceInputField 
                    label="Reseller Rate" 
                    value={formData.resellerPrice || 0} 
                    onChange={v => setFormData(f => ({...f, resellerPrice: v}))}
                  />
                  <PriceInputField 
                    label="Dentist Rate" 
                    value={formData.dentistPrice || 0} 
                    onChange={v => setFormData(f => ({...f, dentistPrice: v}))}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] p-6 border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <AlertCircle className="w-3 h-3 text-blue-500" />
              Inventory Metadata
            </h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-xs">
                <span className="text-slate-500">Global ID</span>
                <code className="bg-slate-50 px-2 py-0.5 rounded text-blue-600 font-mono">{product.id.slice(0, 8)}</code>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 text-xs">
                <span className="text-slate-500">Stock Status</span>
                <span className="font-bold text-emerald-600">IN STOCK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: any, label: string, value: string }) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-3xl bg-slate-50/50 border border-slate-100/50">
      <div className="p-3 bg-white rounded-2xl shadow-sm text-blue-600">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className="font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{label}</label>
      <input
        required
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
        placeholder={placeholder}
      />
    </div>
  );
}

function PriceCard({ label, value, variant }: { label: string, value: number, variant: 'primary' | 'secondary' }) {
  return (
    <div className={cn(
      "p-6 rounded-[2rem] border transition-all",
      variant === 'primary' 
        ? "bg-blue-600 border-blue-500 shadow-xl shadow-blue-600/20" 
        : "bg-white/5 border-white/10 hover:border-white/20"
    )}>
      <p className={cn(
        "text-[10px] font-black uppercase tracking-widest mb-2",
        variant === 'primary' ? "text-blue-100" : "text-blue-400"
      )}>
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span className={cn(
          "text-sm font-bold opacity-70",
          variant === 'primary' ? "text-white" : "text-slate-400"
        )}>₹</span>
        <span className="text-3xl font-black tracking-tight">{value.toLocaleString('en-IN')}</span>
      </div>
    </div>
  );
}

function PriceInputField({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-blue-400 ml-1">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
        <input
          required
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-sm text-white focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none"
        />
      </div>
    </div>
  );
}
