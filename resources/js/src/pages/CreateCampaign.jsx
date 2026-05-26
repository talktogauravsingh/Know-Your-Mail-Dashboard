import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { ArrowLeft, Save, Send, SplitSquareVertical, FlaskConical, Layers, CheckCircle2, AlertCircle, Upload, Calendar, Clock } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CsvPreviewPanel } from '../components/CsvPreview';
import { SegmentationEngine } from '../components/SegmentationEngine';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function CreateCampaign() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isABTest, setIsABTest] = useState(false);
  const [abTestType, setAbTestType] = useState('subject'); // 'subject' or 'content'

  // Scheduling State
  const [scheduleType, setScheduleType] = useState('immediate');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleDays, setScheduleDays] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [submitAction, setSubmitAction] = useState('draft');
  
  // 'idle' | 'loading' | 'success' | 'error'
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [csvResult, setCsvResult] = useState(null);
  const [segmentationMode, setSegmentationMode] = useState('single');
  const [segments, setSegments] = useState([{ id: 'default', name: 'Default', isDefault: true, filters: [] }]);
  const [insights, setInsights] = useState([]);
  const [campaignId, setCampaignId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [recipientSource, setRecipientSource] = useState('campaign'); // 'campaign' or 'org'
  const [variants, setVariants] = useState({}); // { [segmentId]: { subject, body, cta_url } }
  const [selectedTemplateData, setSelectedTemplateData] = useState(null);
  const fileInputRef = useRef(null);

  // CRITICAL: Reset campaignId on every fresh mount so stale IDs don't leak across sessions
  useEffect(() => {
    setCampaignId(null);
    return () => setCampaignId(null); // also reset on unmount
  }, []);

  // Load selected template data into form fields
  useEffect(() => {
    if (selectedTemplateData) {
      // Populate default segment variant
      setVariants(prev => ({
        ...prev,
        default: {
          ...prev.default,
          subject: selectedTemplateData.subject || '',
          body: selectedTemplateData.plain_text_content || selectedTemplateData.html_content || '',
        },
      }));
    }
  }, [selectedTemplateData]);

  const fetchInsights = async (id) => {
    try {
      const response = await api.get(`/campaigns/${id}/insights`);
      setInsights(response.data.insights);
    } catch (error) {
      console.error('Failed to fetch insights', error);
    }
  };

  const smtpConfigurations = useStore((state) => state.smtpConfigurations);
  const templates = useStore((state) => state.templates);
  const user = useStore((state) => state.user);
  const selectedTemplate = templates.find(t => t.id === templateId);

  const createCampaign = useStore((state) => state.createCampaign);
  const updateCampaign = useStore((state) => state.updateCampaign);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    let currentCampaignId = campaignId;

    // If no campaignId, create a quick draft first so we can link the CSV and insights
    if (!currentCampaignId) {
      try {
        const campaignResponse = await api.post('/campaigns', {
          name: `Draft: ${file.name.split('.')[0]}`,
          subject: 'Campaign Subject',
          body: 'Email content goes here...',
          sender_config_id: smtpConfigurations[0]?.id || 1,
        });
        currentCampaignId = campaignResponse.data.id;
        setCampaignId(currentCampaignId);
      } catch (err) {
        console.error('Failed to create draft campaign', err);
        return;
      }
    }

    const formData = new FormData();
    formData.append('file', file);
    if (currentCampaignId) {
      formData.append('campaign_id', currentCampaignId);
      formData.append('module_type', 2); // Campaign level
      formData.append('module_id', currentCampaignId);
    }

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
      
      if (currentCampaignId) {
        // Poll for insights every 2 seconds, up to 10 times
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          try {
            const insightsResponse = await api.get(`/campaigns/${currentCampaignId}/insights`);
            if (insightsResponse.data.insights?.length > 0 || attempts > 10) {
              setInsights(insightsResponse.data.insights);
              clearInterval(interval);
            }
          } catch (e) {
            if (attempts > 10) clearInterval(interval);
          }
        }, 2000);
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData);
      
      // Include additional state data
      data.segments = segments;
      data.is_ab_test = isABTest;
      data.ab_test_type = abTestType;
      data.segmentation_mode = segmentationMode;
      data.variants = variants;

      // Always use the 'default' variant's content as the main campaign content fallback
      // This is because we removed the global subject/body fields
      const defaultVar = variants['default'] || {};
      data.subject = defaultVar.subject || '';
      data.body = defaultVar.body || '';
      data.cta_link = defaultVar.cta_link || data.cta_link || '';

      // Append scheduling
      data.schedule_type = scheduleType;
      data.status = submitAction === 'draft' ? 'draft' : 'scheduled';
      if (scheduleType === 'once') {
        data.scheduled_at = scheduledAt;
      } else if (scheduleType === 'recurring') {
        data.schedule_frequency = scheduleFrequency;
        data.schedule_days = scheduleDays;
        data.schedule_time = scheduleTime;
      }
      
      // If we have an existing draft campaignId, update it. Otherwise create.
      if (campaignId) {
        await updateCampaign(campaignId, data);
      } else {
        await createCampaign(data);
      }
      
      navigate('/campaigns');
    } catch (error) {
      console.error('Campaign submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select
            value={selectedTemplateData ? selectedTemplateData.id : ''}
            onChange={e => {
              const tmpl = templates.find(t => t.id === e.target.value);
              setSelectedTemplateData(tmpl);
              // Update URL param without reload
              const params = new URLSearchParams(window.location.search);
              if (tmpl) {
                params.set('template', tmpl.id);
              } else {
                params.delete('template');
              }
              window.history.replaceState(null, '', `?${params.toString()}`);
            }}
            className="bg-white dark:bg-slate-950"
          >
            <option value="">Select Template</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
          <Link to="/templates/builder">
            <Button variant="secondary">Create New Template</Button>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/campaigns">
            <Button type="button" variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">New Campaign</h2>
              <p className="text-slate-500 dark:text-slate-400">
                {selectedTemplateData ? `Starting from layout: ${selectedTemplateData.name}` : 'Configure your email campaign details.'}
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

        {/* Segmentation Strategy Selection */}
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setSegmentationMode('single')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              segmentationMode === 'single'
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
            )}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-lg", segmentationMode === 'single' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                <Send className="h-5 w-5" />
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-50">Single Message</span>
            </div>
            <p className="text-xs text-slate-500">Send one message to your entire list.</p>
          </button>

          <button
            type="button"
            onClick={() => setSegmentationMode('segmented')}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              segmentationMode === 'segmented'
                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", segmentationMode === 'segmented' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Layers className="h-5 w-5" />
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-50">Multi-Segment</span>
              </div>
              <div className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase tracking-wider">Up to 3</div>
            </div>
            <p className="text-xs text-slate-500">Personalize content for different user groups.</p>
          </button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Basic information about this broadcast.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input id="name" name="name" defaultValue={selectedTemplate ? `${selectedTemplate.name} Campaign` : ''} placeholder="e.g. Summer Sale 2026" required />
            </div>

            {/* Removed Global Subject Line - now handled per segment in Content card */}

            {/* <div className="space-y-2">
              <Label htmlFor="senderConfig">Sender Configuration</Label>
              <Select id="senderConfig" name="sender_config_id" required className="bg-white dark:bg-slate-950">
                <option value="">Select a sender configuration...</option>
                <option value="1">EmailTracker Shared IPs (via emailtracker.io)</option>
                {smtpConfigurations.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.provider} - {config.fromName} ({config.fromAddress})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-slate-500 mt-1">Select the verified domain or custom SMTP to send this campaign from.</p>
            </div> */}
          </CardContent>
        </Card>

        {/* Audience Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Audience</CardTitle>
              <CardDescription>Select who will receive this campaign. CSV upload is optional if using existing segments.</CardDescription>
            </div>
            <Link to="/audience">
              <Button type="button" variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-950">
                Manage All Segments
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recipient Source Selector */}
            <div className="grid gap-6 md:grid-cols-2 p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="space-y-1">
                <Label className="text-indigo-900 dark:text-indigo-200">Recipient Source</Label>
                <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70">Choose where to pull audience data from</p>
              </div>
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
                <button
                  type="button"
                  onClick={() => {
                    setRecipientSource('campaign');
                    setInsights([]); // Clear to force reload for new source
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    recipientSource === 'campaign' 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                >
                  Campaign Specific
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecipientSource('org');
                    setInsights([]); // Clear to force reload for new source
                  }}
                  className={cn(
                    "flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                    recipientSource === 'org' 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  )}
                >
                  Organization Wide
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              {recipientSource === 'campaign' && (
                <div className="space-y-2">
                  <Label>Campaign Audience (CSV)</Label>
                  <div 
                    className={`relative border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all ${uploadStatus === 'idle' ? 'hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer' : ''}`}
                    onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
                  >
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploadStatus === 'loading'} />
                    
                    <div className="mb-3 p-3 bg-indigo-50 dark:bg-slate-900 rounded-full text-indigo-600">
                      <Upload className="h-6 w-6" />
                    </div>

                    {uploadStatus === 'idle' && (
                      <>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">Upload Recipient CSV</p>
                        <p className="text-xs text-slate-500 mt-1">Select the file for this campaign</p>
                      </>
                    )}

                    {uploadStatus === 'loading' && (
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600" />
                        <p className="text-sm font-semibold">Processing...</p>
                      </div>
                    )}

                    {uploadStatus === 'success' && (
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-emerald-600">
                          <CheckCircle2 className="h-5 w-5" />
                          <p className="text-sm font-semibold">{csvResult?.totalRows} Recipients Loaded</p>
                        </div>
                        <button type="button" className="text-xs text-indigo-600 hover:underline" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>Change file</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {(insights.length > 0 || (recipientSource === 'org' && !campaignId)) && (
              <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                <div className="flex flex-col gap-1">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {segmentationMode === 'segmented' ? 'Multi-Segment Rules' : 'Targeting Filters (Optional)'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    {segmentationMode === 'segmented' 
                      ? 'Define rules for each of your 3 segments.' 
                      : 'Apply filters to target specific recipients from your list.'}
                  </p>
                </div>
                <SegmentationEngine 
                  campaignId={campaignId} 
                  insights={insights}
                  onSegmentsChange={(segs) => setSegments(segs)}
                  moduleType={recipientSource === 'org' ? 1 : 2}
                  moduleId={recipientSource === 'org' ? (user?.organization_id || 1) : campaignId}
                  maxSegments={3}
                  isSingleMode={segmentationMode === 'single'}
                />
              </div>
            )}

            {/* ── CSV Preview Panel (only if we have a result) ── */}
            {(csvResult || uploadStatus === 'loading' || uploadStatus === 'error') && recipientSource === 'campaign' && (
              <CsvPreviewPanel
                status={uploadStatus}
                fileName={selectedFile?.name}
                result={csvResult}
                error={uploadMessage}
                onRetry={handleRetry}
              />
            )}
          </CardContent>
        </Card>

        {/* Scheduling Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Scheduling & Delivery
            </CardTitle>
            <CardDescription>Control exactly when your audience receives this campaign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => setScheduleType('immediate')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col items-start gap-2",
                  scheduleType === 'immediate'
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                )}
              >
                <div className={cn("p-2 rounded-lg", scheduleType === 'immediate' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Send className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-slate-900 dark:text-slate-50">Send Now</span>
                  <p className="text-xs text-slate-500">Dispatch immediately.</p>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setScheduleType('once')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col items-start gap-2",
                  scheduleType === 'once'
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                )}
              >
                <div className={cn("p-2 rounded-lg", scheduleType === 'once' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-slate-900 dark:text-slate-50">Schedule for Later</span>
                  <p className="text-xs text-slate-500">Pick a specific date & time.</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScheduleType('recurring')}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all flex flex-col items-start gap-2",
                  scheduleType === 'recurring'
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                )}
              >
                <div className={cn("p-2 rounded-lg", scheduleType === 'recurring' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-sm block text-slate-900 dark:text-slate-50">Recurring</span>
                  <p className="text-xs text-slate-500">Daily, weekly, or monthly.</p>
                </div>
              </button>
            </div>

            {/* Sub-options for Schedule Once */}
            {scheduleType === 'once' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="bg-white dark:bg-slate-950 w-full md:w-1/2" 
                  />
                  <p className="text-xs text-slate-500">Campaign will be sent at this exact time in your local timezone.</p>
                </div>
              </div>
            )}

            {/* Sub-options for Recurring */}
            {scheduleType === 'recurring' && (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)} className="bg-white dark:bg-slate-950">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Time of Day</Label>
                    <Input 
                      type="time" 
                      value={scheduleTime} 
                      onChange={(e) => setScheduleTime(e.target.value)}
                      required
                      className="bg-white dark:bg-slate-950" 
                    />
                  </div>
                </div>

                {scheduleFrequency === 'weekly' && (
                  <div className="space-y-3">
                    <Label>Days of the week</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                        const isSelected = scheduleDays.includes(idx);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              if (isSelected) setScheduleDays(scheduleDays.filter(d => d !== idx));
                              else setScheduleDays([...scheduleDays, idx]);
                            }}
                            className={cn(
                              "px-4 py-2 rounded-full text-sm font-semibold transition-colors",
                              isSelected 
                                ? "bg-indigo-600 text-white" 
                                : "bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                            )}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>
              {segmentationMode === 'segmented' 
                ? 'Personalize your message for each segment.' 
                : 'Draft the email body and Call-To-Action.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-8">
              {segments.map((segment) => (
                <div key={segment.id} className={cn(
                  "p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5",
                  segment.isDefault ? "bg-white dark:bg-slate-950" : "bg-slate-50/30 dark:bg-slate-900/20"
                )}>
                  {segmentationMode === 'segmented' && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider", segment.isDefault ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white")}>
                          {segment.isDefault ? 'Default' : `Segment ${segment.priority}`}
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{segment.name}</span>
                      </div>
                      {segment.isDefault && <p className="text-[10px] text-slate-400 italic">Fallback for everyone else</p>}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Subject Line</Label>
                      <Input 
                        placeholder="What will they see in their inbox?"
                        value={variants[segment.id]?.subject || ''}
                        onChange={(e) => setVariants({
                          ...variants,
                          [segment.id]: { ...variants[segment.id], subject: e.target.value }
                        })}
                        required
                        className="bg-white dark:bg-slate-950"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Email Content</Label>
                      <textarea 
                        className="flex min-h-[200px] w-full rounded-md border border-slate-200 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800"
                        placeholder="Your message goes here..."
                        value={variants[segment.id]?.body || ''}
                        onChange={(e) => setVariants({
                          ...variants,
                          [segment.id]: { ...variants[segment.id], body: e.target.value }
                        })}
                        required
                      ></textarea>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">CTA Link</Label>
                      <Input 
                        placeholder="https://example.com/target"
                        value={variants[segment.id]?.cta_link || ''}
                        onChange={(e) => setVariants({
                          ...variants,
                          [segment.id]: { ...variants[segment.id], cta_link: e.target.value }
                        })}
                        required
                        className="bg-white dark:bg-slate-950"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/campaigns')}>
            Cancel
          </Button>
          <Button type="submit" onClick={() => setSubmitAction('draft')} variant="secondary" className="gap-2 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-800">
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button type="submit" onClick={() => setSubmitAction('schedule')} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" isLoading={isSubmitting && submitAction === 'schedule'}>
            <Send className="h-4 w-4" /> {scheduleType === 'immediate' ? 'Send Now' : 'Schedule Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}
