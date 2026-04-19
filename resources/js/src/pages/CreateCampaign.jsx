import React, { useState, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { ArrowLeft, Save, Send, SplitSquareVertical, FlaskConical } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isABTest, setIsABTest] = useState(false);
  const [abTestType, setAbTestType] = useState('subject'); // 'subject' or 'content'
  
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadStatus('uploading');
    setUploadMessage('Uploading...');

    try {
      const response = await window.axios.post('/api/recipients/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setUploadStatus('success');
      setUploadMessage(response.data.message || 'File queued successfully!');
    } catch (error) {
      setUploadStatus('error');
      setUploadMessage(error.response?.data?.message || error.message || 'Upload failed');
    }
  };

  const smtpConfigurations = useStore((state) => state.smtpConfigurations);
  const templates = useStore((state) => state.templates);
  const selectedTemplate = templates.find(t => t.id === templateId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      navigate('/campaigns');
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/campaigns">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">New Campaign</h2>
            <p className="text-slate-500 dark:text-slate-400">
              {selectedTemplate ? `Starting from layout: ${selectedTemplate.name}` : 'Configure your email campaign details.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white dark:bg-slate-950 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <FlaskConical className={`h-5 w-5 ${isABTest ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">A/B Testing</span>
            <span className="text-xs text-slate-500">Optimize performance</span>
          </div>
          <button 
            type="button"
            onClick={() => setIsABTest(!isABTest)}
            className={`ml-4 relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 ${isABTest ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
          >
            <span className="sr-only">Toggle A/B Testing</span>
            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isABTest ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {isABTest && (
          <Card className="border-indigo-200 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                <SplitSquareVertical className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                A/B Test Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>What do you want to test?</Label>
                  <Select value={abTestType} onChange={e => setAbTestType(e.target.value)} className="bg-white dark:bg-slate-950">
                    <option value="subject">Subject Line</option>
                    <option value="content">Email Content</option>
                    <option value="sender">Sender Name</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Test Audience Size</Label>
                  <div className="flex items-center gap-4">
                    <input type="range" min="10" max="50" defaultValue="20" className="w-full accent-indigo-600" />
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 min-w-[3rem]">20%</span>
                  </div>
                  <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">20% get test variants, winner gets 80%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Basic information about this broadcast.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input id="name" defaultValue={selectedTemplate ? `${selectedTemplate.name} Campaign` : ''} placeholder="e.g. Summer Sale 2026" required />
            </div>

            {isABTest && abTestType === 'subject' ? (
              <div className="grid gap-6 sm:grid-cols-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                <div className="space-y-2">
                  <Label htmlFor="subjectA" className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-bold dark:bg-indigo-900/50 dark:text-indigo-400">Variant A</span> Subject Line
                  </Label>
                  <Input id="subjectA" placeholder="Open for a surprise!" required className="border-indigo-200 focus-visible:ring-indigo-500 dark:border-indigo-900" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjectB" className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-xs font-bold dark:bg-purple-900/50 dark:text-purple-400">Variant B</span> Subject Line
                  </Label>
                  <Input id="subjectB" placeholder="You won't believe this deal..." required className="border-purple-200 focus-visible:ring-purple-500 dark:border-purple-900" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input id="subject" placeholder="Open for a surprise!" required />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="senderConfig">Sender Configuration</Label>
              <Select id="senderConfig" required className="bg-white dark:bg-slate-950">
                <option value="">Select a sender configuration...</option>
                <option value="managed_shared">EmailTracker Shared IPs (via emailtracker.io)</option>
                {smtpConfigurations.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.provider} - {config.fromName} ({config.fromAddress})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 mt-1">Select the verified domain or custom SMTP to send this campaign from.</p>
            </div>
          </CardContent>
        </Card>

        {/* Audience Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Audience</CardTitle>
              <CardDescription>Who are you sending this campaign to?</CardDescription>
            </div>
            <Link to="/audience">
              <Button type="button" variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-950">
                Browse Segments
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Select Segment or Upload CSV</Label>
              <Select className="mb-4">
                <option value="">Upload new CSV...</option>
                <option value="s1">Active Users (Last 30 Days)</option>
                <option value="s2">High Value Customers (LTV &gt; $500)</option>
                <option value="s3">Churn Risk (No login &gt; 60 days)</option>
              </Select>
              <div 
                className={`relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${uploadStatus === 'idle' ? 'hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer' : ''}`}
                onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={uploadStatus === 'uploading'}
                />
                
                {uploadStatus === 'idle' && (
                  <>
                    <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M21 15v4a2 2 0 0 1-2-2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">Upload a CSV file</p>
                    <p className="text-sm text-slate-500 mt-1">Click to select a file</p>
                  </>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{uploadMessage}</p>
                  </div>
                )}

                {uploadStatus === 'success' && (
                  <div className="flex flex-col items-center text-emerald-600 dark:text-emerald-400">
                    <div className="rounded-full bg-emerald-100 p-3 dark:bg-emerald-900/50 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{uploadMessage}</p>
                    <p className="text-sm mt-2 text-indigo-600 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setUploadStatus('idle'); }}>Upload another</p>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="flex flex-col items-center text-red-600 dark:text-red-400">
                    <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/50 mb-3">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p className="font-medium text-slate-900 dark:text-slate-50">{uploadMessage}</p>
                    <p className="text-sm mt-2 text-slate-500 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); setUploadStatus('idle'); }}>Try again</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Draft the email body and Call-To-Action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isABTest && abTestType === 'content' ? (
               <div className="grid gap-6 md:grid-cols-2 p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
                 <div className="space-y-2">
                  <Label htmlFor="bodyA" className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-xs font-bold dark:bg-indigo-900/50 dark:text-indigo-400">Variant A</span> Body
                  </Label>
                  <textarea 
                    id="bodyA" 
                    className="flex min-h-[200px] w-full rounded-md border border-indigo-200 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-indigo-900/50"
                    placeholder="Short and punchy variant..."
                    required
                  ></textarea>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodyB" className="flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-xs font-bold dark:bg-purple-900/50 dark:text-purple-400">Variant B</span> Body
                  </Label>
                  <textarea 
                    id="bodyB" 
                    className="flex min-h-[200px] w-full rounded-md border border-purple-200 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-purple-500 dark:border-purple-900/50"
                    placeholder="Long-form storytelling variant..."
                    required
                  ></textarea>
                </div>
               </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="body">Email Body (Simple HTML/Text)</Label>
                <textarea 
                  id="body" 
                  className="flex min-h-[200px] w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:placeholder:text-slate-400 dark:focus-visible:ring-slate-300"
                  placeholder="Hi {{first_name}},&#10;&#10;Welcome to..."
                  defaultValue={selectedTemplate ? `<!-- Using Template: ${selectedTemplate.name} -->\n\n` : ''}
                  required
                ></textarea>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="ctaLink">Primary CTA Link (for Click Tracking)</Label>
              <Input id="ctaLink" type="url" placeholder="https://example.com/promo" required />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
            Cancel
          </Button>
          <Button type="button" variant="secondary" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800">
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" isLoading={isSubmitting}>
            <Send className="h-4 w-4" /> Schedule Campaign
          </Button>
        </div>
      </form>
    </div>
  );
}
