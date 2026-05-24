/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, getDocs, orderBy, writeBatch, doc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { Package, Plus, Trash2, CheckSquare, Square, Loader2, X } from 'lucide-react';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export default function Products() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    division: '',
    brand: '',
    category: '',
    packSize: '',
    standardPrice: 0,
    resellerPrice: 0,
    dentistPrice: 0,
    active: true
  });

  useEffect(() => {
    const path = 'products';
    setError(null);
    setLoading(true);

    // Use onSnapshot for real-time updates
    const q = query(collection(db, path), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = querySnapshot.docs.map(doc => {
        const docData = doc.data() as any;
        return { id: doc.id, ...docData } as Product;
      });
      setProducts(data);
      setLoading(false);
    }, (err: any) => {
      console.error("Fetch products failed:", err);
      // If orderBy fails (e.g. index missing or field missing), try without it
      if (err.message?.includes('index')) {
        const fallbackQ = query(collection(db, path));
        onSnapshot(fallbackQ, (snapshot) => {
          const fallbackData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
          setProducts(fallbackData);
          setLoading(false);
        });
      } else {
        setError("Failed to load products. Check your permission.");
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, path);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setIsAdding(true);
    setError(null);
    try {
      await addDoc(collection(db, 'products'), {
        ...formData,
        standardPrice: Number(formData.standardPrice),
        resellerPrice: Number(formData.resellerPrice),
        dentistPrice: Number(formData.dentistPrice),
        createdAt: new Date().toISOString()
      });
      
      setSuccess(`${formData.name} added successfully!`);
      setShowAddModal(false);
      setFormData({
        name: '',
        code: '',
        division: '',
        brand: '',
        category: '',
        packSize: '',
        standardPrice: 0,
        resellerPrice: 0,
        dentistPrice: 0,
        active: true
      });
    } catch (err: any) {
      setError("Failed to add product.");
      handleFirestoreError(err, OperationType.CREATE, 'products');
    } finally {
      setIsAdding(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      setError("Only administrators can delete products.");
      return;
    }
    if (selectedIds.size === 0) return;
    
    setIsDeleting(true);
    setError(null);
    setSuccess(null);
    
    console.log(`Starting bulk deletion of ${selectedIds.size} products...`);
    
    const batch = writeBatch(db);
    const count = selectedIds.size;
    
    try {
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'products', id));
      });
      
      await batch.commit();
      console.log("Bulk delete batch committed successfully.");
      setSelectedIds(new Set());
      setSuccess(`Successfully removed ${count} products from the catalog.`);
    } catch (err: any) {
      console.error("Bulk delete failed:", err);
      setError("Operation failed. This might be due to security rules or network issues.");
      handleFirestoreError(err, OperationType.DELETE, 'products');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Product Catalog</h2>
          <p className="text-slate-500 text-sm">Wizdent dental SKU master list.</p>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && selectedIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-900/20 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete ({selectedIds.size})
                </>
              )}
            </button>
          )}
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 sm:py-2 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10"
          >
            <Plus className="w-4 h-4" />
            Add SKU
          </button>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 tracking-tight">Add New SKU</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white border hover:border-gray-200 rounded-xl transition-all">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Product Name</label>
                  <input
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="e.g. Wizdent Composite A1"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">SKU Code</label>
                  <input
                    required
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData(f => ({ ...f, code: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="WIZ-CMP-A1"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Brand</label>
                  <input
                    required
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData(f => ({ ...f, brand: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="Wizdent"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Division</label>
                  <input
                    required
                    type="text"
                    value={formData.division}
                    onChange={e => setFormData(f => ({ ...f, division: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="Consumables"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Pack Size</label>
                  <input
                    required
                    type="text"
                    value={formData.packSize}
                    onChange={e => setFormData(f => ({ ...f, packSize: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                    placeholder="4g Syringe"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Std Price</label>
                  <input
                    required
                    type="number"
                    value={formData.standardPrice}
                    onChange={e => setFormData(f => ({ ...f, standardPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Reseller</label>
                  <input
                    required
                    type="number"
                    value={formData.resellerPrice}
                    onChange={e => setFormData(f => ({ ...f, resellerPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dentist</label>
                  <input
                    required
                    type="number"
                    value={formData.dentistPrice}
                    onChange={e => setFormData(f => ({ ...f, dentistPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-2"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Confirm Addition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(error || success) && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-3 text-xs font-bold">
              <Trash2 className="w-4 h-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100 flex items-center gap-3 text-xs font-bold">
              <CheckSquare className="w-4 h-4" />
              {success}
            </div>
          )}
        </div>
      )}

      <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-900"
          >
            {selectedIds.size === products.length && products.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            {selectedIds.size === products.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {selectedIds.size} Selected
          </span>
        </div>
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{products.length} Items</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse h-48 shadow-sm" />
          ))
        ) : products.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-xl border border-dashed border-gray-300 text-center">
            <Package className="w-10 h-10 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-medium italic">No products in catalog yet.</p>
          </div>
        ) : (
          products.map(product => (
            <div 
              key={product.id} 
              onClick={() => navigate(`/products/${product.id}`)}
              className={cn(
                "bg-white p-5 rounded-xl border transition-all group relative cursor-pointer",
                selectedIds.has(product.id) ? "border-blue-500 ring-2 ring-blue-500/10" : "border-gray-200 hover:border-blue-200 hover:shadow-md"
              )}
            >
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(product.id);
                }}
                className={cn(
                  "absolute top-4 left-4 z-10 transition-opacity p-1 hover:bg-slate-50 rounded-lg",
                  selectedIds.has(product.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                {selectedIds.has(product.id) ? (
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                ) : (
                  <Square className="w-5 h-5 text-slate-300 bg-white rounded" />
                )}
              </div>

              <div className="flex items-start gap-4 mb-4 pl-8">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                  selectedIds.has(product.id) ? "bg-blue-100 text-blue-600" : "bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600"
                )}>
                  <Package className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate leading-tight">{product.name}</h3>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-1">{product.division}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">SKU CODE</p>
                  <p className="text-xs font-mono font-semibold text-slate-700">{product.code}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">BRAND</p>
                  <p className="text-xs font-semibold text-slate-700">{product.brand}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-blue-50/30">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Standard</p>
                  <p className="text-[10px] font-bold text-slate-700">₹{product.standardPrice || 0}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-50/30">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Dealer</p>
                  <p className="text-[10px] font-bold text-slate-700">₹{product.resellerPrice || 0}</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-purple-50/30">
                  <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Dentist</p>
                  <p className="text-[10px] font-bold text-slate-700">₹{product.dentistPrice || 0}</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border",
                  product.active ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                )}>
                  {product.active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-[10px] text-slate-400 font-medium italic">{product.packSize}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

