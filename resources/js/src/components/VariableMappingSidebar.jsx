import React from 'react';
import { CheckCircle2, AlertTriangle, FileSpreadsheet, Sparkles, HelpCircle } from 'lucide-react';
import { Label } from './ui/Input';

export function VariableMappingSidebar({
  variables = [],
  csvHeaders = [],
  csvFirstRow = {},
  mappings = {},
  onMappingChange,
  recipientSource = 'campaign'
}) {
  const mappedCount = variables.filter(v => mappings[v.name] && mappings[v.name] !== '').length;
  const totalCount = variables.length;
  const isFullyMapped = mappedCount === totalCount;

  // Render a nice tag based on the variable's source
  const renderSourceBadge = (source) => {
    switch (source) {
      case 'template':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/30">
            Template
          </span>
        );
      case 'content':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400 border border-purple-200/50 dark:border-purple-900/30">
            Content
          </span>
        );
      case 'subject':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/30">
            Subject
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full lg:w-[400px] flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in slide-in-from-right duration-300">
      {/* Sidebar Header */}
      <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-indigo-50/50 via-white to-purple-50/20 dark:from-slate-950 dark:to-slate-900">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Variable Mapping
          </h3>
          <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full transition-all ${
            isFullyMapped 
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400'
          }`}>
            {mappedCount} / {totalCount} Mapped
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Map variables in your email template or body content to fields from your recipient list to personalize each email.
        </p>
      </div>

      {/* Variable Mappings List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Sparkles className="w-8 h-8 text-indigo-400 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No variables found</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
              We couldn't detect any variables like {"{{customer_name}}"} in your email yet.
            </p>
          </div>
        ) : (
          variables.map((variable) => {
            const selectedHeader = mappings[variable.name] || '';
            const previewValue = selectedHeader ? csvFirstRow[selectedHeader] : null;
            const isMapped = selectedHeader !== '';

            return (
              <div 
                key={variable.name} 
                className={`group p-4 rounded-xl border transition-all duration-200 ${
                  isMapped
                    ? 'border-indigo-100 bg-indigo-50/10 dark:border-indigo-900/20 dark:bg-indigo-950/5 hover:border-indigo-200 dark:hover:border-indigo-900/40'
                    : 'border-rose-100 bg-rose-50/10 dark:border-rose-950/20 dark:bg-rose-950/5 hover:border-rose-200 dark:hover:border-rose-900/30'
                }`}
              >
                {/* Variable Label & Badge Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {"{{"}{variable.name}{"}}"}
                    </span>
                    {isMapped ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {variable.sources?.map(source => (
                      <React.Fragment key={source}>
                        {renderSourceBadge(source)}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {/* Dropdown Selection */}
                <div className="space-y-2">
                  <select
                    value={selectedHeader}
                    onChange={(e) => onMappingChange(variable.name, e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-850 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-sm transition-all"
                  >
                    <option value="">— Unmapped (Renders fallback or blank) —</option>
                    {csvHeaders.length > 0 ? (
                      <optgroup label="CSV Headers">
                        {csvHeaders.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </optgroup>
                    ) : (
                      <optgroup label="Default Fields">
                        <option value="name">name (Recipient Name)</option>
                        <option value="email">email (Recipient Email)</option>
                      </optgroup>
                    )}
                  </select>

                  {/* Real-time Value Preview */}
                  {isMapped && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 font-medium overflow-hidden">
                      <span className="shrink-0 font-bold uppercase tracking-wider text-[9px] text-indigo-500 dark:text-indigo-400">Preview:</span>
                      <span className="truncate" title={previewValue ?? '—'}>
                        {previewValue !== null && previewValue !== undefined ? String(previewValue) : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Info Footer */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
        <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal">
          Mapped values are pulled from the first row of your audience list for previewing. During the actual delivery, they will dynamically substitute with each recipient's specific data.
        </p>
      </div>
    </div>
  );
}
