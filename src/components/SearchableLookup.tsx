/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface LookupOption {
  id: string;
  label: string;
  subLabel?: string;
}

interface SearchableLookupProps {
  label: string;
  options: LookupOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function SearchableLookup({ 
  label, 
  options, 
  value, 
  onChange, 
  placeholder = "Search...", 
  disabled = false,
  required = false,
  className
}: SearchableLookupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.id === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={cn("space-y-1.5", className)} ref={containerRef}>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all",
            disabled && "opacity-50 cursor-not-allowed",
            isOpen && "border-blue-500 ring-2 ring-blue-500/20 bg-white"
          )}
        >
          <div className="flex flex-col items-start overflow-hidden">
            {selectedOption ? (
              <>
                <span className="font-semibold text-slate-900 truncate w-full text-left">{selectedOption.label}</span>
                {selectedOption.subLabel && (
                  <span className="text-[10px] text-slate-400 font-bold uppercase truncate">{selectedOption.subLabel}</span>
                )}
              </>
            ) : (
              <span className="text-slate-400">{placeholder}</span>
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filter results..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="max-h-60 overflow-y-auto p-1">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-slate-400 italic">
                  No matches found
                </div>
              ) : (
                filteredOptions.map(option => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors",
                      value === option.id ? "bg-blue-50" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex flex-col">
                      <span className={cn("text-xs font-semibold", value === option.id ? "text-blue-700" : "text-slate-700")}>
                        {option.label}
                      </span>
                      {option.subLabel && (
                        <span className="text-[9px] text-slate-400 font-bold uppercase">{option.subLabel}</span>
                      )}
                    </div>
                    {value === option.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
