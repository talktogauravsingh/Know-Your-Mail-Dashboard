import React, { useState, useEffect } from 'react';
import { X, Download, Monitor, Smartphone, AlertTriangle } from 'lucide-react';
import api from '../lib/api';

export function CampaignPreview({
  template,
  body,
  subject,
  onClose,
  inline = false,
  variableMappings = {},
  csvFirstRow = {},
  detectedVariables = []
}) {
  const [previewMode, setPreviewMode] = useState('desktop');
  const [mergedHtml, setMergedHtml] = useState('');
  const [processedSubject, setProcessedSubject] = useState(subject);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        setLoading(true);
        
        // Prepare base preview variables
        const previewVariables = {
          name: 'Preview User',
          email: 'preview@example.com',
        };

        // Inject high-visibility indicators for any unmapped variables so they stand out in the HTML preview
        if (detectedVariables && detectedVariables.length > 0) {
          detectedVariables.forEach(v => {
            const isMapped = variableMappings && variableMappings[v.name];
            if (!isMapped) {
              previewVariables[v.name] = `<span style="display: inline-block; border: 1px dashed #ef4444; background-color: #fef2f2; color: #dc2626; padding: 1px 4px; font-size: 0.85em; font-family: monospace; border-radius: 4px; font-weight: 600;" title="Unmapped Variable">{{${v.name}}}</span>`;
            }
          });
        }

        const templateId = template?.id || template;

        const response = await api.post('/campaigns/preview', {
          template_id: templateId,
          body: body,
          subject: subject,
          variables: previewVariables,
          variable_mappings: variableMappings,
          csv_first_row: csvFirstRow,
        });

        setMergedHtml(response.data.htmlBody);
        setProcessedSubject(response.data.processedSubject || subject);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate preview');
        console.error('Preview generation failed:', err);
      } finally {
        setLoading(false);
      }
    };

    if (template) {
      generatePreview();
    }
  }, [template, body, subject, variableMappings, csvFirstRow, detectedVariables]);

  const canvasWidth = previewMode === 'mobile' ? 360 : '100%';
  const unmappedCount = detectedVariables.filter(v => !variableMappings[v.name]).length;

  const renderContent = () => {
    return (
      <div className={`flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden ${
        inline ? 'w-full h-full min-h-[600px]' : 'max-h-[90vh] w-full max-w-4xl'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50">Campaign Live Preview</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Subject:</span> {processedSubject || '(No Subject Line)'}
            </p>
          </div>
          {!inline && onClose && (
            <button
              onClick={onClose}
              className="rounded-full border border-slate-200 dark:border-slate-800 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
          )}
        </div>

        {/* Unmapped variables banner warning */}
        {unmappedCount > 0 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 px-6 py-2.5 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 shrink-0" />
            <span className="text-xs font-medium text-amber-800 dark:text-amber-400">
              There are {unmappedCount} unmapped variables. They are highlighted with a dashed red border in the preview below.
            </span>
          </div>
        )}

        {/* Preview Mode Toggle */}
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-6 py-3 bg-slate-50/50 dark:bg-slate-950/50">
          <button
            onClick={() => setPreviewMode('desktop')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              previewMode === 'desktop'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" /> Desktop
          </button>
          <button
            onClick={() => setPreviewMode('mobile')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              previewMode === 'mobile'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/10'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" /> Mobile
          </button>
          <div className="flex-1" />
          <button
            onClick={() => {
              const element = document.createElement('a');
              element.href = 'data:text/html;charset=utf-8,' + encodeURIComponent(mergedHtml);
              element.download = `campaign-preview-${Date.now()}.html`;
              document.body.appendChild(element);
              element.click();
              document.body.removeChild(element);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-slate-800 text-xs font-semibold transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Export HTML
          </button>
        </div>

        {/* Preview Content Area */}
        <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 p-6 flex justify-center items-start min-h-[400px]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 w-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Updating preview render...</p>
            </div>
          )}
          
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-20 w-full max-w-md text-center">
              <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-500 rounded-full mb-3 border border-red-150 dark:border-red-900/30">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Failed to render template</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
          )}

          {!loading && !error && mergedHtml && (
            <div
              className={`rounded-xl bg-white shadow-lg overflow-hidden border border-slate-200 dark:border-slate-850 flex-1 transition-all ${
                previewMode === 'mobile' ? 'max-w-[360px]' : 'w-full'
              }`}
              style={{ width: canvasWidth }}
            >
              <iframe
                title="Campaign Preview"
                srcDoc={mergedHtml}
                className="w-full h-full min-h-[600px] border-none"
              />
            </div>
          )}
        </div>

        {/* Footer (only in modal mode) */}
        {!inline && onClose && (
          <div className="border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    );
  };

  if (inline) {
    return renderContent();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
}

