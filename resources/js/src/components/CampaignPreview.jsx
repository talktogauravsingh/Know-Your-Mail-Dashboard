import React, { useState, useEffect } from 'react';
import { X, Download, Monitor, Smartphone } from 'lucide-react';
import api from '../lib/api';

export function CampaignPreview({ template, body, subject, onClose }) {
  const [previewMode, setPreviewMode] = useState('desktop');
  const [mergedHtml, setMergedHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const generatePreview = async () => {
      try {
        setLoading(true);
        const response = await api.post('/campaigns/preview', {
          template_id: template.id,
          body: body,
          variables: {
            name: 'Preview User',
            email: 'preview@example.com',
          },
        });
        setMergedHtml(response.data.htmlBody);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to generate preview');
        console.error('Preview generation failed:', err);
      } finally {
        setLoading(false);
      }
    };

    generatePreview();
  }, [template, body]);

  const canvasWidth = previewMode === 'mobile' ? 360 : 720;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="max-h-[90vh] w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Campaign Preview</h2>
            <p className="text-sm text-slate-500">Subject: {subject}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 hover:bg-slate-50"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Preview Mode Toggle */}
        <div className="flex items-center gap-4 border-b border-slate-200 px-6 py-4 bg-slate-50">
          <button
            onClick={() => setPreviewMode('desktop')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              previewMode === 'desktop'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Monitor className="h-4 w-4" /> Desktop
          </button>
          <button
            onClick={() => setPreviewMode('mobile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              previewMode === 'mobile'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            <Smartphone className="h-4 w-4" /> Mobile
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 font-medium transition-colors"
          >
            <Download className="h-4 w-4" /> Export HTML
          </button>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-slate-100 p-6 flex justify-center items-start">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-slate-600">Generating preview...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="text-red-600 text-sm font-medium">{error}</div>
                <button
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && mergedHtml && (
            <div
              className="rounded-xl bg-white shadow-lg overflow-hidden border border-slate-200"
              style={{ width: `${canvasWidth}px` }}
            >
              <iframe
                title="Campaign Preview"
                srcDoc={mergedHtml}
                className="w-full h-full min-h-[600px] border-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border border-slate-200 text-slate-700 font-medium hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
