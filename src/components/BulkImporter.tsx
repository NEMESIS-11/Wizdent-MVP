import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileJson, 
  ChevronRight,
  Database,
  Trash2
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { cn } from '../lib/utils';

type EntityType = 'products' | 'accounts' | 'contacts';

interface ColumnMapping {
  [key: string]: string;
}

export default function BulkImporter() {
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('products');
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setData([]);
    }
  };

  const parseFile = async () => {
    if (!file) return;
    setParsing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer);
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (jsonData.length === 0) {
        throw new Error("The selected sheet is empty.");
      }

      setData(jsonData);
    } catch (err: any) {
      setError(`Parsing Error: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setUploading(true);
    setError(null);
    setSuccess(null);

    const batch = writeBatch(db);
    const collectionRef = collection(db, selectedEntity);
    let count = 0;

    try {
      // Process in chunks if data is large (Firestore batch limit is 500)
      const chunks = [];
      for (let i = 0; i < data.length; i += 500) {
        chunks.push(data.slice(i, i + 500));
      }

      for (const chunk of chunks) {
        const currentBatch = writeBatch(db);
        chunk.forEach(item => {
          // Normalize keys to lowercase and remove spaces for mapping
          const normalizedItem: any = {};
          
          Object.entries(item).forEach(([key, value]) => {
            const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '');
            
            // Map common variations to internal schema
            if (selectedEntity === 'products') {
              if (cleanKey === 'name' || cleanKey === 'productname') normalizedItem.name = value;
              else if (cleanKey === 'code' || cleanKey === 'sku' || cleanKey === 'skucode') normalizedItem.code = value;
              else if (cleanKey === 'division') normalizedItem.division = value;
              else if (cleanKey === 'brand') normalizedItem.brand = value;
              else if (cleanKey === 'category') normalizedItem.category = value;
              else if (cleanKey === 'packsize') normalizedItem.packSize = value;
              else if (cleanKey === 'standardprice' || cleanKey === 'stdprice') normalizedItem.standardPrice = Number(value || 0);
              else if (cleanKey === 'resellerprice' || cleanKey === 'dealerprice') normalizedItem.resellerPrice = Number(value || 0);
              else if (cleanKey === 'dentistprice') normalizedItem.dentistPrice = Number(value || 0);
              else if (cleanKey === 'active') normalizedItem.active = value === true || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'y';
              else normalizedItem[key.trim()] = value;
            } 
            else if (selectedEntity === 'accounts') {
              if (cleanKey === 'name' || cleanKey === 'accountname') normalizedItem.name = value;
              else if (cleanKey === 'type') normalizedItem.type = String(value).toUpperCase();
              else if (cleanKey === 'territory') normalizedItem.territory = value;
              else if (cleanKey === 'email') normalizedItem.email = value;
              else if (cleanKey === 'phone' || cleanKey === 'mobile') normalizedItem.phone = value;
              else if (cleanKey === 'address') normalizedItem.address = value;
              else normalizedItem[key.trim()] = value;
            }
            else if (selectedEntity === 'contacts') {
              if (cleanKey === 'firstname') normalizedItem.firstName = value;
              else if (cleanKey === 'lastname') normalizedItem.lastName = value;
              else if (cleanKey === 'email') normalizedItem.email = value;
              else if (cleanKey === 'phone' || cleanKey === 'mobile') normalizedItem.phone = value;
              else if (cleanKey === 'designation' || cleanKey === 'specialty') normalizedItem.designation = value;
              else if (cleanKey === 'accountid') normalizedItem.accountId = value;
              else normalizedItem[key.trim()] = value;
            }
          });

          // Ensure default values for required fields
          if (selectedEntity === 'products') {
            if (!normalizedItem.name) normalizedItem.name = "Unnamed Product";
            if (!normalizedItem.division) normalizedItem.division = "General";
            if (normalizedItem.active === undefined) normalizedItem.active = true;
          } else if (selectedEntity === 'accounts') {
            if (!normalizedItem.name) normalizedItem.name = "Unnamed Account";
            if (!normalizedItem.type) normalizedItem.type = "CLINIC";
            if (!normalizedItem.territory) normalizedItem.territory = "General";
            if (!normalizedItem.address) normalizedItem.address = "No Address Provided";
            if (normalizedItem.visitCounter === undefined) normalizedItem.visitCounter = 0;
            if (normalizedItem.firstConvertedVisit === undefined) normalizedItem.firstConvertedVisit = false;
          } else if (selectedEntity === 'contacts') {
            if (!normalizedItem.firstName) normalizedItem.firstName = "Unnamed";
            if (!normalizedItem.lastName) normalizedItem.lastName = "Contact";
            if (!normalizedItem.email) normalizedItem.email = "no-email@wizdent.system";
          }
          
          normalizedItem.createdAt = new Date().toISOString();
          normalizedItem.updatedAt = new Date().toISOString();

          const newDocRef = doc(collectionRef);
          currentBatch.set(newDocRef, normalizedItem);
        });
        await currentBatch.commit();
        count += chunk.length;
      }

      setSuccess(`Successfully imported ${count} ${selectedEntity}.`);
      setData([]);
      setFile(null);
    } catch (err: any) {
      setError(`Upload Error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 leading-tight">Bulk Data Import</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">XLSX / CSV Master Processor</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['products', 'accounts', 'contacts'] as EntityType[]).map((type) => (
          <button
            key={type}
            onClick={() => {
              setSelectedEntity(type);
              setData([]);
              setFile(null);
            }}
            className={cn(
              "py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
              selectedEntity === type 
                ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20" 
                : "bg-white text-slate-400 border-gray-200 hover:border-slate-300"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
          <FileSpreadsheet className="w-3 h-3" />
          Expected Columns
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {selectedEntity === 'products' ? (
            ['name', 'code', 'division', 'brand', 'category', 'packSize', 'standardPrice'].map(col => (
              <span key={col} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-mono text-slate-500">{col}</span>
            ))
          ) : selectedEntity === 'accounts' ? (
            ['name', 'type', 'territory', 'email', 'phone', 'address'].map(col => (
              <span key={col} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-mono text-slate-500">{col}</span>
            ))
          ) : (
            ['firstName', 'lastName', 'email', 'phone', 'designation', 'accountId'].map(col => (
              <span key={col} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[9px] font-mono text-slate-500">{col}</span>
            ))
          )}
        </div>
      </div>

      <div className="relative group">
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={cn(
          "p-8 border-2 border-dashed rounded-3xl text-center transition-all",
          file ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200 group-hover:border-slate-300"
        )}>
          {file ? (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-500/30 mb-3">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-900 mb-1">{file.name}</p>
              <p className="text-[10px] font-medium text-blue-600 uppercase tracking-widest">
                {(file.size / 1024).toFixed(1)} KB Ready
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-slate-200 text-slate-400 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-500 mb-1">Upload File</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Excel or CSV formats supported</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-bold border border-red-100 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-bold border border-emerald-100 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {file && !data.length && (
        <button
          onClick={parseFile}
          disabled={parsing}
          className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 hover:bg-blue-500 transition-all flex items-center justify-center gap-3"
        >
          {parsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
          Analyze Source File
        </button>
      )}

      {data.length > 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <div className="bg-slate-900 rounded-2xl p-5 text-white overflow-hidden relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Database className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Staging Buffer</p>
                  <p className="text-xs font-bold">{data.length} Records Detected</p>
                </div>
              </div>
              <button 
                onClick={() => setData([])}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-40 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {data.slice(0, 5).map((row, i) => (
                <div key={i} className="p-2 bg-white/5 rounded-lg border border-white/10 flex items-center gap-3">
                  <FileJson className="w-3 h-3 text-slate-500" />
                  <p className="text-[10px] font-mono text-slate-400 truncate">
                    {JSON.stringify(row).substring(0, 50)}...
                  </p>
                </div>
              ))}
              {data.length > 5 && (
                <p className="text-[9px] text-center font-bold text-slate-500 uppercase tracking-widest py-1">
                  + {data.length - 5} more records
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleImport}
            disabled={uploading}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/40 hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Confirm Production Write
          </button>
        </div>
      )}
    </div>
  );
}
