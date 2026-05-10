import React, { useState, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AlertCircle, CheckCircle2, FileText, Upload, Database, Info } from 'lucide-react';
import { CsvPreviewPanel } from '../components/CsvPreview';
import api from '../lib/api';
import { useStore } from '../store/useStore';

export default function BulkImport() {
  const { user } = useStore();
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [csvResult, setCsvResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('module_type', 1); // Org level
    formData.append('module_id', user?.organization_id || 1);

    setSelectedFile(file);
    setCsvResult(null);
    setUploadStatus('loading');
    setUploadMessage('');

    try {
      const response = await api.post('/recipients/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = response.data;
      setCsvResult({
        fileName:    file.name,
        totalRows:   data.total_rows   ?? data.totalRows   ?? '—',
        validRows:   data.valid_rows   ?? data.validRows   ?? '—',
        invalidRows: data.invalid_rows ?? data.invalidRows ?? '—',
        headers:     data.headers      ?? [],
        rows:        data.preview_rows ?? data.rows        ?? [],
        errors:      data.errors       ?? [],
      });
      setUploadStatus('success');
      setUploadMessage(data.message || 'File processed successfully!');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(
        error.response?.data?.message || error.message || 'Upload failed'
      );
    }
  };

  const handleRetry = () => {
    setUploadStatus('idle');
    setCsvResult(null);
    setSelectedFile(null);
    setUploadMessage('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Global Audience Import</h2>
        <p className="text-slate-500 dark:text-slate-400">
          Upload a master CSV to populate your organization's recipient database. These contacts and their attributes will be available for all future campaigns.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-500" />
              Import Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4 text-slate-600 dark:text-slate-400">
            <p>Your CSV should ideally contain columns for:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong className="text-slate-900 dark:text-slate-200">email</strong> (required)</li>
              <li><strong>name</strong> (optional)</li>
              <li><strong>phone</strong> (optional)</li>
            </ul>
            <p>Any other columns (like <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">city</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">tier</code>, or <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">gender</code>) will be stored as attributes for advanced segmentation.</p>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
              <p className="flex items-center gap-2 font-semibold mb-1 text-xs uppercase tracking-wider">
                <Database className="h-3 w-3" /> Note on Upserts
              </p>
              <p className="text-xs">If an email already exists in your organization, it will be updated with the new attributes from your CSV.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Upload Master CSV</CardTitle>
            <CardDescription>Select the file you want to import into your organization.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div 
              className={`relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-10 flex flex-col items-center justify-center text-center transition-all ${uploadStatus === 'idle' ? 'hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer' : ''}`}
              onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploadStatus === 'loading'}
              />
              
              <div className={`mb-4 p-4 rounded-full ${uploadStatus === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'} dark:bg-slate-900`}>
                {uploadStatus === 'loading' ? (
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
                ) : uploadStatus === 'success' ? (
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="h-8 w-8" />
                ) : (
                  <Upload className="h-8 w-8" />
                )}
              </div>

              {uploadStatus === 'idle' && (
                <>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Click to upload or drag and drop</p>
                  <p className="text-sm text-slate-500 mt-1">CSV files only (up to 10MB)</p>
                </>
              )}

              {uploadStatus === 'loading' && (
                <>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-50">Processing your audience...</p>
                  <p className="text-sm text-slate-500 mt-1">We're indexing attributes and validating emails.</p>
                </>
              )}

              {uploadStatus === 'success' && (
                <>
                  <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-500">Import Complete!</p>
                  <p className="text-sm text-slate-500 mt-1">{csvResult?.totalRows} rows were sent for processing.</p>
                  <Button variant="outline" className="mt-4" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>
                    Upload Another File
                  </Button>
                </>
              )}

              {uploadStatus === 'error' && (
                <>
                  <p className="text-lg font-semibold text-red-600">Upload Failed</p>
                  <p className="text-sm text-slate-500 mt-1">{uploadMessage}</p>
                  <Button variant="outline" className="mt-4" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>
                    Try Again
                  </Button>
                </>
              )}
            </div>

            {(csvResult || uploadStatus === 'loading' || uploadStatus === 'error') && (
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <CsvPreviewPanel
                  status={uploadStatus}
                  fileName={selectedFile?.name}
                  result={csvResult}
                  error={uploadMessage}
                  onRetry={handleRetry}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
