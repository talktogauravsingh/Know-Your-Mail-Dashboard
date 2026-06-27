import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, FileSpreadsheet } from 'lucide-react';

/**
 * VariableAutocomplete — renders a floating dropdown when user types `{{`
 * in a text input or textarea. Shows searchable CSV headers to insert as variables.
 */
export function VariableAutocomplete({ inputRef, value, csvHeaders = [], onChange, fieldType = 'textarea' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  // Store the position of the `{{` trigger (start of the variable placeholder)
  const triggerStartRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Detect `{{` typing pattern — reads directly from the DOM element for immediacy
  useEffect(() => {
    const el = inputRef?.current;
    if (!el) return;

    const handler = (e) => {
      // Read the LIVE value from the element, not the React prop (which hasn't re-rendered yet)
      const liveValue = el.value;
      const cursorPos = el.selectionStart;
      const textBefore = liveValue.substring(0, cursorPos);

      // Check if the text before cursor ends with `{{`
      if (textBefore.endsWith('{{')) {
        triggerStartRef.current = cursorPos - 2; // position of the first `{`
        setSearch('');
        setIsOpen(true);

        // Position dropdown near the field
        const rect = el.getBoundingClientRect();
        if (fieldType === 'input') {
          setPosition({ top: rect.height + 4, left: 0 });
        } else {
          const lineCount = textBefore.split('\n').length;
          const lineHeight = 20;
          setPosition({
            top: Math.min(lineCount * lineHeight + 8, rect.height - 10),
            left: 16,
          });
        }

        // Focus the search input after a tick
        setTimeout(() => searchInputRef.current?.focus(), 30);
      }
    };

    el.addEventListener('input', handler);
    return () => el.removeEventListener('input', handler);
  }, [inputRef, fieldType]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef?.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, inputRef]);

  const insertVariable = (header) => {
    const triggerStart = triggerStartRef.current;
    if (triggerStart === null) return;

    const el = inputRef?.current;
    // Read the CURRENT live value (user may have typed more chars since trigger)
    const liveValue = el ? el.value : value;
    const currentCursor = el ? el.selectionStart : liveValue.length;

    // Replace everything from `{{` (triggerStart) to current cursor with `{{header}}`
    const before = liveValue.substring(0, triggerStart);
    const after = liveValue.substring(currentCursor);
    const newValue = before + '{{' + header + '}}' + after;

    onChange(newValue);
    setIsOpen(false);
    triggerStartRef.current = null;

    // Restore focus and place cursor after the inserted `{{header}}`
    const newCursorPos = triggerStart + header.length + 4; // {{ + header + }}
    setTimeout(() => {
      if (el) {
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 30);
  };

  const filteredHeaders = csvHeaders.filter(h =>
    h.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen || csvHeaders.length === 0) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/50">
        <div className="flex items-center gap-2 mb-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Insert Variable</span>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredHeaders.length > 0) {
                e.preventDefault();
                insertVariable(filteredHeaders[0]);
              }
              if (e.key === 'Escape') {
                setIsOpen(false);
                inputRef?.current?.focus();
              }
            }}
            placeholder="Search fields..."
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Options list */}
      <div className="max-h-48 overflow-y-auto py-1">
        {filteredHeaders.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-500">No matching fields found</p>
          </div>
        ) : (
          filteredHeaders.map((header) => (
            <button
              key={header}
              type="button"
              onClick={() => insertVariable(header)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors flex items-center justify-between group"
            >
              <span className="font-mono text-xs text-slate-800 dark:text-slate-200 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                {header}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                {`{{${header}}}`}
              </span>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30">
        <p className="text-[9px] text-slate-400 dark:text-slate-500">
          Enter to insert · Esc to close
        </p>
      </div>
    </div>
  );
}
