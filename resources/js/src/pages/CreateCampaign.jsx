import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, Label } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { ArrowLeft, Save, Send, Layers, CheckCircle2, AlertCircle, Upload, Calendar, Clock, Sparkles, Wand2, Activity, Filter, Users, Loader2, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { CsvPreviewPanel } from '../components/CsvPreview';
import { SegmentationEngine } from '../components/SegmentationEngine';
import { AiGenerationModal } from '../components/AiGenerationModal';
import { AiRewriteModal } from '../components/AiRewriteModal';
import { AiAnalysisModal } from '../components/AiAnalysisModal';
import { CampaignPreview } from '../components/CampaignPreview';
import { VariableMappingSidebar } from '../components/VariableMappingSidebar';
import { VariableAutocomplete } from '../components/VariableAutocomplete';
import { autoMapVariables } from '../lib/variableUtils';
import api from '../lib/api';
import { cn } from '../lib/utils';

export default function CreateCampaign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('template');

  // useStore selectors
  const smtpConfigurations = useStore((state) => state.smtpConfigurations);
  const templates = useStore((state) => state.templates);
  const fetchTemplates = useStore((state) => state.fetchTemplates);
  const fetchSmtpConfigurations = useStore((state) => state.fetchSmtpConfigurations);
  const user = useStore((state) => state.user);
  const createCampaign = useStore((state) => state.createCampaign);
  const updateCampaign = useStore((state) => state.updateCampaign);
  const selectedTemplate = templates.find(t => String(t.id) === String(templateId));
  const domains = useStore((state) => state.domains);
  const fetchDomains = useStore((state) => state.fetchDomains);
  const addToast = useStore((state) => state.addToast);
  
  const [campaignName, setCampaignName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderConfigId, setSenderConfigId] = useState('1');
  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    fetchDomains().finally(() => setHasChecked(true));
  }, [fetchDomains]);

  useEffect(() => {
    if (hasChecked && (!domains || domains.length === 0 || !domains.some(d => d.status === 'verified'))) {
      addToast('Please register and verify a sender domain before proceeding.', 'error');
      navigate('/settings?tab=domains');
    }
  }, [hasChecked, domains, navigate, addToast]);


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
  const subjectInputRef = useRef(null);
  const bodyTextareaRef = useRef(null);

  // Wizard and Variable Mapping states
  const [currentStep, setCurrentStep] = useState(1);
  const [variableMappings, setVariableMappings] = useState({});
  const [detectedVariables, setDetectedVariables] = useState([]);
  const [activeStep3SegmentId, setActiveStep3SegmentId] = useState(null);

  // Extract variables from template + body content + subject
  const extractAllCampaignVariables = async (templateOverride = undefined) => {
    try {
      const bodyContent = Object.values(variants).map(v => v.body || '').join('\n');
      const subjectContent = Object.values(variants).map(v => v.subject || '').join('\n');

      const templateToUse = templateOverride !== undefined ? templateOverride : selectedTemplateData;

      const response = await api.post('/campaigns/extract-variables', {
        template_id: templateToUse?.id,
        body: bodyContent,
        subject: subjectContent,
      });

      const vars = response.data.variables || [];
      setDetectedVariables(vars);

      // Run smart auto-mapping with uploaded CSV headers
      const headers = csvResult?.headers || [];
      const autoMappings = autoMapVariables(vars, headers);
      
      setVariableMappings(prev => ({
        ...autoMappings,
        ...prev
      }));
    } catch (err) {
      console.error('Failed to extract campaign variables:', err);
    }
  };

  // Debounced blur-based extraction: re-extract variables when user leaves subject/body fields
  const blurTimerRef = useRef(null);
  const handleFieldBlur = useCallback(() => {
    // Quick check: skip API call entirely if no {{ patterns exist
    const allContent = Object.values(variants).map(v => (v.body || '') + (v.subject || '')).join('');
    const templateHtml = selectedTemplateData?.html_content || '';
    if (!allContent.includes('{{') && !templateHtml.includes('{{')) return;

    // Debounce: if user is tabbing between subject and body, wait before firing
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => {
      extractAllCampaignVariables();
    }, 400); // 400ms debounce
  }, [variants, selectedTemplateData, csvResult]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    };
  }, []);

  // AI Modals state
  const [aiGenOpen, setAiGenOpen] = useState(false);
  const [aiRewriteOpen, setAiRewriteOpen] = useState(false);
  const [aiAnalysisOpen, setAiAnalysisOpen] = useState(false);
  const [activeAiSegment, setActiveAiSegment] = useState(null);
  const [templateHasContentBlock, setTemplateHasContentBlock] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // CRITICAL: Reset/set campaignId on every fresh mount so stale IDs don't leak across sessions
  useEffect(() => {
    if (id) {
      setCampaignId(id);
    } else {
      setCampaignId(null);
    }
    return () => setCampaignId(null); // also reset on unmount
  }, [id]);

  const updateStateFromCampaignData = React.useCallback((campaign) => {
    if (!campaign) return;
    setCampaignName(campaign.name || '');
    setSenderConfigId(campaign.sender_config_id ? String(campaign.sender_config_id) : '1');
    setSegmentationMode(campaign.segmentation_mode || 'single');
    setRecipientSource(campaign.recipient_source || 'campaign');
    setVariableMappings(campaign.variable_mappings || {});
    setScheduleType(campaign.schedule_type || 'immediate');
    setScheduledAt(campaign.scheduled_at ? campaign.scheduled_at.substring(0, 16) : '');
    setScheduleFrequency(campaign.schedule_frequency || 'daily');
    setScheduleDays(campaign.schedule_days || []);
    setScheduleTime(campaign.schedule_time || '');

    // Reconstruct template
    if (campaign.template) {
      setSelectedTemplateData(campaign.template);
    } else if (campaign.template_id && templates.length > 0) {
      const tmpl = templates.find(t => String(t.id) === String(campaign.template_id));
      if (tmpl) setSelectedTemplateData(tmpl);
    }

    // Reconstruct segments and variants
    const loadedSegments = [];
    const loadedVariants = {};

    if (campaign.variants && campaign.variants.length > 0) {
      const sortedVariants = [...campaign.variants].sort((a, b) => (a.priority || 0) - (b.priority || 0));
      sortedVariants.forEach(v => {
        const isDefault = v.is_default || v.name === 'Default';
        const segmentId = isDefault ? 'default' : String(v.id);
        
        // Reconstruct filters
        const filters = [];
        if (v.filter_groups && v.filter_groups.length > 0) {
          v.filter_groups[0].filters.forEach(f => {
            filters.push({
              field: f.field_name,
              operator: f.operator,
              value: f.field_value
            });
          });
        }
        
        loadedSegments.push({
          id: segmentId,
          name: v.name,
          isDefault: isDefault,
          filters: filters,
          priority: v.priority
        });
        
        loadedVariants[segmentId] = {
          subject: v.subject || '',
          body: v.body || '',
          cta_url: v.cta_url || '',
          template_id: v.template_id || null
        };
      });
    }

    if (loadedSegments.length === 0) {
      loadedSegments.push({ id: 'default', name: 'Default Segment', isDefault: true, filters: [] });
      loadedVariants['default'] = {
        subject: campaign.subject || '',
        body: campaign.body || '',
        cta_url: campaign.cta_url || '',
        template_id: null
      };
    }

    setSegments(loadedSegments);
    setVariants(loadedVariants);

    // Pre-fill recipient/CSV preview data if present
    if (campaign.recipient_preview) {
      const preview = campaign.recipient_preview;
      setCsvResult({
        fileName: campaign.recipient_source === 'campaign' ? 'Uploaded Recipients' : 'Organization Directory',
        totalRows: preview.total_rows,
        validRows: preview.valid_rows,
        invalidRows: preview.invalid_rows,
        headers: preview.headers,
        rows: preview.preview_rows,
        errors: [],
      });
      setUploadStatus('success');
    }
  }, [templates]);

  // Edit mode loader
  useEffect(() => {
    if (!id) return;

    const loadCampaign = async () => {
      setIsLoadingCampaign(true);
      try {
        const response = await api.get(`/campaigns/${id}`);
        const campaign = response.data;

        // Redirect if not editable
        if (['sent', 'completed', 'running'].includes(campaign.status?.toLowerCase())) {
          navigate(`/campaigns/${campaign.id}`);
          return;
        }

        updateStateFromCampaignData(campaign);
        setCurrentStep(campaign.wizard_step || 1);

        // Fetch insights (loads segmentation metadata)
        try {
          const insightsResponse = await api.get(`/campaigns/${campaign.id}/insights`);
          setInsights(insightsResponse.data.insights || []);
        } catch (e) {
          console.error('Failed to load campaign insights:', e);
        }
      } catch (err) {
        console.error('Failed to load campaign data:', err);
      } finally {
        setIsLoadingCampaign(false);
      }
    };

    loadCampaign();
  }, [id, navigate, updateStateFromCampaignData]);

  // Helper function to check if template has {{content}} block
  const checkTemplateHasContentBlock = (template) => {
    if (!template) return false;
    const html = template.html_content || '';
    return html.includes('{{content}}');
  };

  // Load selected template data into form fields
  useEffect(() => {
    if (selectedTemplateData) {
      const hasContent = checkTemplateHasContentBlock(selectedTemplateData);
      setTemplateHasContentBlock(hasContent);
      
      // Update campaign name if not custom edited
      if (!campaignName) {
        setCampaignName(`${selectedTemplateData.template_name || selectedTemplateData.name || 'Template'} Campaign`);
      }
      
      // Populate default segment variant
      setVariants(prev => ({
        ...prev,
        default: {
          ...prev.default,
          subject: selectedTemplateData.subject || '',
          body: hasContent 
            ? "Thank you for supporting our mission!\n\nYour contribution helps us bring positive change to communities in need."
            : "",
        },
      }));
    } else {
      setTemplateHasContentBlock(false);
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

  const fetchOrgData = async () => {
    setUploadStatus('loading');
    try {
      const previewRes = await api.get('/campaigns/org-recipients');
      if (previewRes.data.success) {
        setCsvResult({
          fileName: 'Organization Directory',
          totalRows: previewRes.data.total_rows,
          validRows: previewRes.data.valid_rows,
          invalidRows: previewRes.data.invalid_rows,
          headers: previewRes.data.headers,
          rows: previewRes.data.preview_rows,
          errors: [],
        });
        setUploadStatus('success');
      }

      const insightsRes = await api.get('/insights/org');
      if (insightsRes.data.success) {
        setInsights(insightsRes.data.insights || []);
      }
    } catch (err) {
      console.error('Failed to fetch organization recipient data:', err);
      setUploadStatus('error');
      setUploadMessage(err.response?.data?.message || 'Failed to load organization directory');
    }
  };

  useEffect(() => {
    if (recipientSource === 'org') {
      fetchOrgData();
    }
  }, [recipientSource]);


  useEffect(() => {
    fetchTemplates().catch(() => {});
    fetchSmtpConfigurations().catch(() => {});
  }, [fetchTemplates, fetchSmtpConfigurations]);

  useEffect(() => {
    if (templateId && selectedTemplate) {
      setSelectedTemplateData(selectedTemplate);
    }
  }, [templateId, selectedTemplate]);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show loader IMMEDIATELY
    setSelectedFile(file);
    setCsvResult(null);
    setUploadStatus('loading');
    setUploadMessage('');

    let currentCampaignId = campaignId;

    // If no campaignId, create a quick draft first so we can link the CSV and insights
    if (!currentCampaignId) {
      try {
        const draftName = campaignName.trim() || `Draft: ${file.name.split('.')[0]}`;
        const campaignResponse = await api.post('/campaigns', {
          name: draftName,
          subject: 'Campaign Subject',
          body: 'Email content goes here...',
          sender_config_id: senderConfigId || smtpConfigurations[0]?.id || 1,
        });
        currentCampaignId = campaignResponse.data.id;
        setCampaignId(currentCampaignId);
        updateStateFromCampaignData(campaignResponse.data);
        if (!campaignName.trim()) {
          setCampaignName(draftName);
        }
      } catch (err) {
        console.error('Failed to create draft campaign', err);
        setUploadStatus('error');
        setUploadMessage('Failed to create campaign draft. Please try again.');
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

  const handleSubmit = async (e, actionOverride = null) => {
    if (e && e.preventDefault) e.preventDefault();
    setIsSubmitting(true);
    try {
      const formElement = document.getElementById('campaignForm');
      const formData = formElement ? new FormData(formElement) : new FormData();
      const data = Object.fromEntries(formData);
      
      // Include additional state data
      data.name = campaignName;
      data.segments = segments;
      data.is_ab_test = false;
      data.ab_test_type = null;
      data.segmentation_mode = segmentationMode;
      data.variants = variants;
      data.variable_mappings = variableMappings; // Persistent mapping
      
      if (selectedTemplateData) {
        data.template_id = selectedTemplateData.id;
      }

      // Always use the 'default' variant's content as the main campaign content fallback
      const defaultSegment = segments.find(s => s.isDefault) || segments[0];
      const defaultVar = (defaultSegment ? variants[defaultSegment.id] : null) || variants['default'] || {};
      data.subject = defaultVar.subject || '';
      data.body = defaultVar.body || '';
      data.cta_link = '';

      // Append scheduling
      data.schedule_type = scheduleType;
      
      const currentAction = actionOverride || submitAction;
      data.status = currentAction === 'draft' ? 'draft' : 'scheduled';
      
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
        const response = await api.post('/campaigns', data);
        if (response?.data?.id) {
          setCampaignId(response.data.id);
        }
      }
      
      navigate('/campaigns');
    } catch (error) {
      console.error('Campaign submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stepper Header helper
  const renderHeader = (breadcrumb, title, subtitle, step) => (
    <div className="space-y-1 pb-6">
      <div className="text-[10px] tracking-wider font-extrabold text-blue-600 dark:text-blue-400 uppercase font-sans">
        {breadcrumb}
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-sans">{title}</h2>
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <p className="text-slate-500 dark:text-slate-400 text-sm font-sans">{subtitle}</p>
        
        {/* Dash Progress Stepper */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "h-1 w-6 transition-colors duration-300",
                  idx + 1 <= step
                    ? "bg-[#0b3a8c] dark:bg-blue-500"
                    : "bg-slate-200 dark:bg-slate-800"
                )}
              />
            ))}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
            {step} of 5
          </span>
        </div>
      </div>
    </div>
  );

  const selectTemplateAndContinue = async (template) => {
    setSelectedTemplateData(template);
    const params = new URLSearchParams(window.location.search);
    if (template) {
      params.set('template', template.id);
    } else {
      params.delete('template');
    }
    window.history.replaceState(null, '', `?${params.toString()}`);
    
    setIsSubmitting(true);
    try {
      if (campaignId) {
        const updated = await updateCampaign(campaignId, {
          template_id: template ? template.id : null,
          wizard_step: 4,
        });
        if (updated) {
          updateStateFromCampaignData(updated);
        }
      }
      await extractAllCampaignVariables(template);
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionStep3ToStep4 = async () => {
    setIsSubmitting(true);
    try {
      if (campaignId) {
        const updated = await updateCampaign(campaignId, {
          template_id: selectedTemplateData ? selectedTemplateData.id : null,
          wizard_step: 4,
        });
        if (updated) {
          updateStateFromCampaignData(updated);
        }
      }
      await extractAllCampaignVariables();
      setCurrentStep(4);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionStep4ToStep5 = async () => {
    const form = document.getElementById('campaignFormContent');
    if (form && !form.checkValidity()) {
      form.reportValidity();
      return;
    }
    setIsSubmitting(true);
    try {
      const data = {
        name: campaignName,
        segments,
        is_ab_test: false,
        ab_test_type: null,
        segmentation_mode: segmentationMode,
        variants,
        variable_mappings: variableMappings,
        recipient_source: recipientSource,
        status: 'draft',
        wizard_step: 5,
      };
      const defaultSegment = segments.find(s => s.isDefault) || segments[0];
      const defaultVar = (defaultSegment ? variants[defaultSegment.id] : null) || variants['default'] || {};
      data.subject = defaultVar.subject || '';
      data.body = defaultVar.body || '';
      data.cta_link = '';
      
      if (selectedTemplateData) {
        data.template_id = selectedTemplateData.id;
      }
      
      const updated = await updateCampaign(campaignId, data);
      if (updated) {
        updateStateFromCampaignData(updated);
      }
      setCurrentStep(5);
    } catch (err) {
      console.error('Failed to transition from step 4 to step 5:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalSubmit = async (statusOverride = null) => {
    setIsSubmitting(true);
    try {
      const data = {
        name: campaignName,
        segments,
        is_ab_test: false,
        ab_test_type: null,
        segmentation_mode: segmentationMode,
        variants,
        variable_mappings: variableMappings,
        recipient_source: recipientSource,
        status: statusOverride || 'scheduled',
        schedule_type: scheduleType,
      };
      const defaultSegment = segments.find(s => s.isDefault) || segments[0];
      const defaultVar = (defaultSegment ? variants[defaultSegment.id] : null) || variants['default'] || {};
      data.subject = defaultVar.subject || '';
      data.body = defaultVar.body || '';
      data.cta_link = '';
      
      if (selectedTemplateData) {
        data.template_id = selectedTemplateData.id;
      }

      if (scheduleType === 'once') {
        data.scheduled_at = scheduledAt;
      } else if (scheduleType === 'recurring') {
        data.schedule_frequency = scheduleFrequency;
        data.schedule_days = scheduleDays;
        data.schedule_time = scheduleTime;
      }

      // If we have an existing campaign, update it. Otherwise create a new one.
      if (campaignId) {
        await updateCampaign(campaignId, data);
      } else {
        await api.post('/campaigns', data);
      }
      navigate('/campaigns');
    } catch (err) {
      console.error('Failed to submit campaign:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingCampaign || !hasChecked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-2">
        <Loader2 className="h-10 w-10 animate-spin text-[#0052CC]" />
        <p className="text-slate-500 text-sm font-medium">Verifying domain settings...</p>
      </div>
    );
  }

  if (currentStep === 5) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
        {renderHeader("CREATE CAMPAIGN > STEP 5: SCHEDULE DELIVERY", "Schedule Delivery", "Choose when your audience receives this campaign.", 5)}
        
        <form id="campaignFormScheduling" onSubmit={(e) => e.preventDefault()} className="space-y-8 pt-4">
          {/* Scheduling Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-650 dark:text-indigo-400" />
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
                    "p-4 rounded-none border-2 text-left transition-all flex flex-col items-start gap-2",
                    scheduleType === 'immediate'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                  )}
                >
                  <div className={cn("p-2 rounded-none", scheduleType === 'immediate' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
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
                    "p-4 rounded-none border-2 text-left transition-all flex flex-col items-start gap-2",
                    scheduleType === 'once'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                  )}
                >
                  <div className={cn("p-2 rounded-none", scheduleType === 'once' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
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
                    "p-4 rounded-none border-2 text-left transition-all flex flex-col items-start gap-2",
                    scheduleType === 'recurring'
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300"
                  )}
                >
                  <div className={cn("p-2 rounded-none", scheduleType === 'recurring' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500")}>
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
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-none border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
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
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-none border border-slate-200 dark:border-slate-800 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
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
                                "px-4 py-2 rounded-none text-sm font-semibold transition-colors",
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

          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 bg-slate-50/50 dark:bg-slate-950/20 px-1">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>
              ← Back to Compose Messages
            </Button>
            <div className="flex items-center gap-3">
              <Button 
                type="button" 
                onClick={() => handleFinalSubmit('draft')} 
                variant="secondary" 
                className="gap-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:hover:bg-slate-850"
                isLoading={isSubmitting}
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              <Button 
                type="button" 
                onClick={() => handleFinalSubmit()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2" 
                isLoading={isSubmitting}
              >
                <Send className="h-4 w-4" /> {scheduleType === 'immediate' ? 'Send Now' : 'Schedule Campaign'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  if (currentStep === 4) {
    const csvHeaders = csvResult?.headers || [];
    const csvFirstRow = csvResult?.rows?.[0] || {};
    const defaultSegment = segments.find(s => s.isDefault) || segments[0];
    const defaultVariant = (defaultSegment ? variants[defaultSegment.id] : null) || variants['default'] || {};

    const getSegmentTemplateData = (segmentId) => {
      if (segmentationMode === 'single') return selectedTemplateData;
      const segmentTemplateId = variants[segmentId]?.template_id;
      if (!segmentTemplateId) return null;
      return templates.find(t => String(t.id) === String(segmentTemplateId)) || null;
    };

    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
        {renderHeader("CREATE CAMPAIGN > STEP 4: COMPOSE CONTENT", "Compose Messages", "Write your email content, map variables, and preview the final result.", 4)}

        <form id="campaignFormContent" onSubmit={(e) => e.preventDefault()} className="space-y-8 pt-4">
          {/* Content Card */}
          <Card>
            <CardHeader>
              <CardTitle>Content</CardTitle>
              <CardDescription>
                {segmentationMode === 'segmented' 
                  ? 'Personalize your message for each segment.' 
                  : 'Draft the email body. Type {{ to insert dynamic variables from your recipient data.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedTemplateData && !templateHasContentBlock && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-none border border-amber-200 dark:border-amber-800 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">No Content Zone in Template</p>
                    <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">This template doesn't have a {'{{content}}'} block. <Link to={`/templates/designer?id=${selectedTemplateData.id}`} className="underline font-medium">Edit the template</Link> to add a Content Zone first.</p>
                  </div>
                </div>
              )}

              {selectedTemplateData && templateHasContentBlock && (
                <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-none border border-indigo-200 dark:border-indigo-800 flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Template with Content Zone</p>
                    <p className="text-sm text-indigo-700 dark:text-indigo-200 mt-1">Your content will be injected into the template's content zone during sending.</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-8">
                {segments.map((segment) => {
                  const activeTemplate = getSegmentTemplateData(segment.id);
                  const activeHasContentBlock = !activeTemplate || checkTemplateHasContentBlock(activeTemplate);
                  const isPreviewOpen = variants[segment.id]?.[`show_preview_${segment.id}`];

                  return (
                    <div key={segment.id} className={cn(
                      "p-5 rounded-none border border-slate-200 dark:border-slate-800 space-y-5",
                      segment.isDefault ? "bg-white dark:bg-slate-950" : "bg-slate-50/30 dark:bg-slate-900/20"
                    )}>
                      {segmentationMode === 'segmented' && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={cn("px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider", segment.isDefault ? "bg-slate-200 text-slate-700" : "bg-indigo-600 text-white")}>
                              {segment.isDefault ? 'Default' : `Segment ${segment.priority}`}
                            </div>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-50">{segment.name}</span>
                          </div>
                          {segment.isDefault && <p className="text-[10px] text-slate-400 italic">Fallback for everyone else</p>}
                        </div>
                      )}

                      <div className="space-y-4">
                        {/* Segment Specific Template Selection (for Multi-Segment Mode) */}
                        {segmentationMode === 'segmented' && (
                          <div className="space-y-2">
                            <Label className="text-sm font-semibold">Email Template</Label>
                            <div className="flex items-center gap-3">
                              <Select 
                                value={variants[segment.id]?.template_id || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setVariants(prev => ({
                                    ...prev,
                                    [segment.id]: {
                                      ...prev[segment.id],
                                      template_id: val ? Number(val) : null
                                    }
                                  }));
                                }}
                                className="bg-white dark:bg-slate-950 flex-1 h-10 border-slate-200 dark:border-slate-800"
                              >
                                <option value="">Plain Text / Start from Scratch (No Template)</option>
                                {templates.map(tmpl => (
                                  <option key={tmpl.id} value={tmpl.id}>
                                    {tmpl.name} ({tmpl.category})
                                  </option>
                                ))}
                              </Select>
                              {variants[segment.id]?.template_id && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => {
                                    setVariants(prev => ({
                                      ...prev,
                                      [segment.id]: {
                                        ...prev[segment.id],
                                        template_id: null
                                      }
                                    }));
                                  }}
                                  className="text-xs text-red-500 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-950/20 px-2.5 h-10 shrink-0 gap-1 border border-slate-200 dark:border-slate-850"
                                >
                                  <X className="w-3.5 h-3.5" /> Unselect
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Subject Line with Autocomplete */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Subject Line</Label>
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">Type {'{{' } to insert variables</span>
                              
                              {segmentationMode === 'segmented' && !segment.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const mainSubject = variants['default']?.subject || '';
                                    setVariants(prev => ({
                                      ...prev,
                                      [segment.id]: {
                                        ...prev[segment.id],
                                        subject: mainSubject
                                      }
                                    }));
                                  }}
                                  className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-semibold"
                                >
                                  Copy from Main Subject
                                </button>
                              )}

                              <button 
                                type="button" 
                                onClick={() => { setActiveAiSegment(segment.id); setAiGenOpen(true); }}
                                className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium"
                              >
                                <Sparkles className="w-3 h-3" /> AI Generate
                              </button>
                            </div>
                          </div>
                          <div className="relative">
                            <Input 
                              id={`subject-${segment.id}`}
                              placeholder="What will they see in their inbox? Type {{ for variables"
                              value={variants[segment.id]?.subject || ''}
                              onChange={(e) => setVariants({
                                ...variants,
                                [segment.id]: { ...variants[segment.id], subject: e.target.value }
                              })}
                              onBlur={handleFieldBlur}
                              required
                              className="bg-white dark:bg-slate-950"
                            />
                            <VariableAutocomplete
                              inputId={`subject-${segment.id}`}
                              value={variants[segment.id]?.subject || ''}
                              csvHeaders={csvHeaders}
                              onChange={(newVal) => setVariants({
                                ...variants,
                                [segment.id]: { ...variants[segment.id], subject: newVal }
                              })}
                              fieldType="input"
                            />
                          </div>
                        </div>

                        {/* Email Content with Autocomplete */}
                        {(!activeTemplate || activeHasContentBlock) && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">Email Content</Label>
                              <div className="flex items-center gap-3">
                                <button 
                                  type="button" 
                                  onClick={() => { setActiveAiSegment(segment.id); setAiRewriteOpen(true); }}
                                  className="text-xs flex items-center gap-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium"
                                >
                                  <Wand2 className="w-3 h-3" /> Rewrite
                                </button>
                                <button 
                                  type="button" 
                                  onClick={() => { setActiveAiSegment(segment.id); setAiAnalysisOpen(true); }}
                                  className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                >
                                  <Activity className="w-3 h-3" /> Analyze
                                </button>
                              </div>
                            </div>
                            <div className="relative">
                              <textarea 
                                id={`body-${segment.id}`}
                                className="flex min-h-[200px] w-full rounded-none border border-slate-200 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                placeholder={activeTemplate && activeHasContentBlock ? "Your message will be injected into the template's content zone... Type {{ for variables" : activeTemplate ? "Content field disabled. Edit the template first to add a Content Zone block." : "Your message goes here... Type {{ to insert dynamic variables"}
                                value={variants[segment.id]?.body || ''}
                                onChange={(e) => setVariants({
                                  ...variants,
                                  [segment.id]: { ...variants[segment.id], body: e.target.value }
                                })}
                                onBlur={handleFieldBlur}
                                disabled={activeTemplate && !activeHasContentBlock}
                                required={!activeTemplate || activeHasContentBlock}
                              ></textarea>
                              <VariableAutocomplete
                                inputId={`body-${segment.id}`}
                                value={variants[segment.id]?.body || ''}
                                csvHeaders={csvHeaders}
                                onChange={(newVal) => setVariants({
                                  ...variants,
                                  [segment.id]: { ...variants[segment.id], body: newVal }
                                })}
                                fieldType="textarea"
                              />
                            </div>
                            {activeTemplate && !activeHasContentBlock && (
                              <div className="mt-2 flex items-center gap-2">
                                <Link to={`/templates/designer?id=${activeTemplate.id}`}>
                                  <Button type="button" variant="outline" size="sm">
                                    Edit Template in Designer
                                  </Button>
                                </Link>
                              </div>
                            )}
                            
                            {activeTemplate && (
                              <button 
                                type="button"
                                onClick={() => {
                                  const toggleKey = `show_preview_${segment.id}`;
                                  setVariants(prev => ({
                                    ...prev,
                                    [segment.id]: {
                                      ...prev[segment.id],
                                      [toggleKey]: !prev[segment.id]?.[toggleKey]
                                    }
                                  }));
                                }}
                                className="text-xs flex items-center gap-1 text-indigo-650 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 font-semibold mt-1"
                              >
                                👁️ {isPreviewOpen ? 'Hide Preview & Style' : 'Preview & Style'}
                              </button>
                            )}

                            {activeTemplate && isPreviewOpen && (
                              <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4 h-[450px]">
                                <CampaignPreview 
                                  template={activeTemplate}
                                  body={variants[segment.id]?.body || ''}
                                  subject={variants[segment.id]?.subject || ''}
                                  inline={true}
                                  variableMappings={variableMappings}
                                  csvFirstRow={csvFirstRow}
                                  detectedVariables={detectedVariables}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Variable Mapping — Full Width */}
          <VariableMappingSidebar 
            variables={detectedVariables}
            csvHeaders={csvHeaders}
            csvFirstRow={csvFirstRow}
            mappings={variableMappings}
            onMappingChange={(varName, headerName) => {
              setVariableMappings(prev => ({
                ...prev,
                [varName]: headerName
              }));
            }}
            recipientSource={recipientSource}
          />

          {/* Live Preview (Only in Single Mode or if a campaign-level template is selected) */}
          {segmentationMode === 'single' && selectedTemplateData && (
            <CampaignPreview 
              template={selectedTemplateData}
              body={defaultVariant.body || ''}
              subject={defaultVariant.subject || ''}
              inline={true}
              variableMappings={variableMappings}
              csvFirstRow={csvFirstRow}
              detectedVariables={detectedVariables}
            />
          )}

          {/* Bottom Actions Bar */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6 bg-slate-50/50 dark:bg-slate-950/20 px-1">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setCurrentStep(3)}
              className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-855 dark:text-slate-150"
            >
              ← Back to Template Selection
            </Button>
            
            <Button 
              type="button" 
              onClick={handleTransitionStep4ToStep5}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              isLoading={isSubmitting}
            >
              Continue to Scheduling & Delivery →
            </Button>
          </div>
        </form>

        <AiGenerationModal 
          isOpen={aiGenOpen}
          onClose={() => setAiGenOpen(false)}
          onApply={(data) => {
            if (activeAiSegment) {
              setVariants(prev => ({
                ...prev,
                [activeAiSegment]: {
                  ...prev[activeAiSegment],
                  ...(data.subject ? { subject: data.subject } : {}),
                  ...(data.content ? { body: data.content } : {})
                }
              }));
            }
            setAiGenOpen(false);
          }}
        />
        <AiRewriteModal
          isOpen={aiRewriteOpen}
          onClose={() => setAiRewriteOpen(false)}
          initialContent={activeAiSegment ? variants[activeAiSegment]?.body : ''}
          onApply={(content) => {
            if (activeAiSegment) {
              setVariants(prev => ({
                ...prev,
                [activeAiSegment]: {
                  ...prev[activeAiSegment],
                  body: content
                }
              }));
            }
            setAiRewriteOpen(false);
          }}
        />
        <AiAnalysisModal
          isOpen={aiAnalysisOpen}
          onClose={() => setAiAnalysisOpen(false)}
          subject={activeAiSegment ? variants[activeAiSegment]?.subject : ''}
          content={activeAiSegment ? variants[activeAiSegment]?.body : ''}
        />
        
        {/* Campaign Preview Modal */}
        {showPreview && selectedTemplateData && activeAiSegment && variants[activeAiSegment] && (
          <CampaignPreview 
            template={selectedTemplateData}
            body={variants[activeAiSegment].body}
            subject={variants[activeAiSegment].subject}
            onClose={() => setShowPreview(false)}
          />
        )}
      </div>
    );
  }

  if (currentStep === 3) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
        {renderHeader("CREATE CAMPAIGN > STEP 3: CHOOSE TEMPLATE", "Choose Email Template", "Select a starting layout or skip to compose your own content.", 3)}
        
        {/* ─── Top Action Bar ─── */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
          <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to Audience
          </Button>
          <div className="flex items-center gap-3">
            <Link to="/templates/designer">
              <Button type="button" variant="outline" className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 dark:border-indigo-900 dark:text-indigo-300 dark:bg-indigo-950/30 dark:hover:bg-indigo-950/50">
                <Sparkles className="h-4 w-4" /> Create New Template
              </Button>
            </Link>
            <Button 
              type="button" 
              onClick={handleTransitionStep3ToStep4}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              isLoading={isSubmitting}
            >
              {(segmentationMode === 'single' ? selectedTemplateData : true) ? 'Continue to Compose →' : 'Skip — Compose Without Template →'}
            </Button>
          </div>
        </div>

        {segmentationMode === 'segmented' && (
          <div className="space-y-3 pb-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Assign templates to your segments</h3>
            <div className="flex flex-wrap gap-2">
              {segments.map((segment, idx) => {
                const isActive = activeStep3SegmentId === segment.id || (!activeStep3SegmentId && idx === 0);
                const hasTemplate = variants[segment.id]?.template_id;
                return (
                  <button
                    key={segment.id}
                    type="button"
                    onClick={() => setActiveStep3SegmentId(segment.id)}
                    className={cn(
                      "px-4 py-2 rounded-none text-sm font-semibold transition-all flex items-center gap-2",
                      isActive 
                        ? "bg-indigo-600 text-white shadow-md border border-indigo-600" 
                        : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-indigo-300"
                    )}
                  >
                    {segment.name}
                    {hasTemplate && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">Select a segment above, then click a template below to assign it.</p>
          </div>
        )}

        {/* ─── Template Grid ─── */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Blank Template option */}
          <div 
            onClick={() => {
              if (segmentationMode === 'segmented') {
                const targetId = activeStep3SegmentId || segments[0]?.id;
                if (targetId) {
                  setVariants(prev => ({
                    ...prev,
                    [targetId]: { ...prev[targetId], template_id: null }
                  }));
                }
              } else {
                selectTemplateAndContinue(null);
              }
            }}
            className={cn(
              "border hover:border-indigo-600 bg-white dark:bg-slate-950 p-6 flex flex-col justify-between h-48 cursor-pointer transition-all duration-200 group hover:shadow-sm",
              (segmentationMode === 'segmented' ? (variants[activeStep3SegmentId || segments[0]?.id]?.template_id == null) : selectedTemplateData === null) ? "border-2 border-indigo-600" : "border-slate-200 dark:border-slate-800"
            )}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-none bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  Plain Text
                </span>
                {segmentationMode === 'segmented' && (
                  <span className="px-2 py-0.5 rounded-none bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] font-bold">
                    ✓ Supports Personalization
                  </span>
                )}
              </div>
              <h4 className="font-bold text-lg text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 transition-colors font-sans">Start from Scratch</h4>
              <p className="text-xs text-slate-500 line-clamp-2">Create a clean plain-text/HTML email template without a pre-designed layout.</p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              Select Blank →
            </span>
          </div>

          {/* Loaded templates */}
          {templates.map((tmpl) => {
            const hasContentBlock = tmpl.html_content?.includes('{{content}}') || tmpl.htmlContent?.includes('{{content}}');
            
            let isSelected = false;
            if (segmentationMode === 'segmented') {
              const targetId = activeStep3SegmentId || segments[0]?.id;
              isSelected = String(variants[targetId]?.template_id) === String(tmpl.id);
            } else {
              isSelected = selectedTemplateData && String(selectedTemplateData.id) === String(tmpl.id);
            }
            
            return (
              <div 
                key={tmpl.id}
                onClick={() => {
                  if (segmentationMode === 'segmented') {
                    const targetId = activeStep3SegmentId || segments[0]?.id;
                    if (targetId) {
                      setVariants(prev => ({
                        ...prev,
                        [targetId]: { ...prev[targetId], template_id: tmpl.id }
                      }));
                    }
                  } else {
                    selectTemplateAndContinue(tmpl);
                  }
                }}
                className={cn(
                  "border hover:border-indigo-600 bg-white dark:bg-slate-950 p-6 flex flex-col justify-between h-48 cursor-pointer transition-all duration-200 group hover:shadow-sm",
                  isSelected ? "border-2 border-indigo-600" : "border-slate-200 dark:border-slate-800"
                )}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={cn("px-2 py-0.5 rounded-none text-[10px] font-bold uppercase tracking-wider", tmpl.color || "bg-slate-100 text-slate-600")}>
                      {tmpl.category}
                    </span>
                    {segmentationMode === 'segmented' ? (
                      hasContentBlock ? (
                        <span className="px-2 py-0.5 rounded-none bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 text-[9px] font-bold">
                          ✓ Supports Personalization
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-none bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300 text-[9px] font-bold">
                          ⚠ No Content Zone (Static)
                        </span>
                      )
                    ) : null}
                  </div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-50 group-hover:text-indigo-600 transition-colors line-clamp-1 font-sans">{tmpl.name || tmpl.template_name}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{tmpl.description}</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  {isSelected 
                    ? "Selected (Click to change) →" 
                    : (segmentationMode === 'segmented' ? "Assign to Segment →" : "Use Layout →")}
                </span>
              </div>
            );
          })}
        </div>

        {/* ─── Bottom hint ─── */}
        <div className="text-center pt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Click any template above to select it and continue, or use the top bar to skip this step.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 2) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
        {renderHeader("CREATE CAMPAIGN > STEP 2: AUDIENCE & STRATEGY", "Audience & Segmentation", "Choose your recipients and target segments.", 2)}
        <form id="campaignFormAudience" onSubmit={(e) => e.preventDefault()} className="space-y-8 pt-4">

          {/* ─── Segmentation Strategy: Single vs Multi ─── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSegmentationMode('single')}
              className={cn(
                "p-5 border-2 text-left transition-all duration-200 group",
                segmentationMode === 'single'
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={cn(
                  "p-2.5 transition-colors",
                  segmentationMode === 'single' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}>
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-slate-50 block">Single Message</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">One template, one audience</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Send a single email with one subject line and one template to your entire recipient list.</p>
            </button>

            <button
              type="button"
              onClick={() => setSegmentationMode('segmented')}
              className={cn(
                "p-5 border-2 text-left transition-all duration-200 group",
                segmentationMode === 'segmented'
                  ? "border-indigo-600 bg-indigo-50/60 dark:bg-indigo-900/20 shadow-sm"
                  : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2.5 transition-colors",
                    segmentationMode === 'segmented' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  )}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-50 block">Multi-Segment</span>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Multiple templates & subjects</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">Up to 3</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">A/B Test Ready</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">Add multiple email templates and subject lines for different user groups. Ideal for A/B testing or personalized campaigns.</p>
            </button>
          </div>

          {/* ─── Recipient Source: Org-wide vs Campaign-specific ─── */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Recipient Source
              </CardTitle>
              <CardDescription>Choose where your audience data comes from. This determines how recipients are loaded and filtered.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-0">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Organization-wide Card */}
                <button
                  type="button"
                  onClick={() => {
                    if (recipientSource !== 'org') {
                      setRecipientSource('org');
                      setInsights([]);
                      setCsvResult(null);
                      setUploadStatus('idle');
                    }
                  }}
                  className={cn(
                    "p-5 border-2 text-left transition-all duration-200 flex flex-col gap-3",
                    recipientSource === 'org'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/15 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2",
                      recipientSource === 'org' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-50">Organization Wide</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Use existing users from your organization. Apply segmentation filters like "previous campaign mail open users" to target specific groups.</p>
                  {recipientSource === 'org' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Selected</span>
                    </div>
                  )}
                </button>

                {/* Campaign-specific Card */}
                <button
                  type="button"
                  onClick={() => {
                    if (recipientSource !== 'campaign') {
                      setRecipientSource('campaign');
                      setInsights([]);
                      setCsvResult(null);
                      setUploadStatus('idle');
                    }
                  }}
                  className={cn(
                    "p-5 border-2 text-left transition-all duration-200 flex flex-col gap-3",
                    recipientSource === 'campaign'
                      ? "border-indigo-600 bg-indigo-50/40 dark:bg-indigo-900/15 shadow-sm"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2",
                      recipientSource === 'campaign' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"
                    )}>
                      <Upload className="h-4 w-4" />
                    </div>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-50">Campaign Specific (CSV)</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">Upload a CSV file with recipient data specifically for this campaign. Best for one-time sends to external lists.</p>
                  {recipientSource === 'campaign' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Selected</span>
                    </div>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ─── Conditional Content Based on Recipient Source ─── */}

          {/* PATH A: Campaign-specific → CSV Upload */}
          {recipientSource === 'campaign' && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Upload Campaign Audience
                </CardTitle>
                <CardDescription>Upload a CSV file containing recipient email addresses and any personalization data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div 
                  className={cn(
                    "relative border-2 border-dashed p-10 flex flex-col items-center justify-center text-center transition-all",
                    uploadStatus === 'idle' 
                      ? "border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 cursor-pointer hover:border-indigo-300" 
                      : "border-slate-200 dark:border-slate-800"
                  )}
                  onClick={() => uploadStatus === 'idle' && fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} disabled={uploadStatus === 'loading'} />
                  
                  <div className="mb-4 p-3 bg-indigo-50 dark:bg-slate-900 text-indigo-600">
                    <Upload className="h-7 w-7" />
                  </div>

                  {uploadStatus === 'idle' && (
                    <>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-50">Drop your CSV file here or click to browse</p>
                      <p className="text-xs text-slate-500 mt-1.5">Supports .csv files with email, name, and custom columns</p>
                    </>
                  )}

                  {uploadStatus === 'loading' && (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-5 w-5 border-b-2 border-indigo-600" />
                      <p className="text-sm font-semibold">Processing your file...</p>
                    </div>
                  )}

                  {uploadStatus === 'success' && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <p className="text-sm font-bold">{csvResult?.totalRows} Recipients Loaded</p>
                      </div>
                      <p className="text-xs text-slate-500">{csvResult?.validRows} valid · {csvResult?.invalidRows} invalid</p>
                      <button type="button" className="text-xs text-indigo-600 hover:underline font-semibold mt-1" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>Change file</button>
                    </div>
                  )}

                  {uploadStatus === 'error' && (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-5 w-5" />
                        <p className="text-sm font-semibold">Upload Failed</p>
                      </div>
                      <p className="text-xs text-red-500">{uploadMessage}</p>
                      <button type="button" className="text-xs text-indigo-600 hover:underline font-semibold mt-1" onClick={(e) => { e.stopPropagation(); handleRetry(); }}>Try Again</button>
                    </div>
                  )}
                </div>

                {/* CSV Preview */}
                {csvResult && (
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
          )}

          {/* PATH B: Organization-wide → Segmentation Filters */}
          {recipientSource === 'org' && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  Organization Directory Sample
                </CardTitle>
                <CardDescription>
                  Below is a sample of unique recipients loaded from your organization's directory.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {csvResult && (
                  <CsvPreviewPanel
                    status={uploadStatus}
                    fileName="Organization Directory"
                    result={csvResult}
                    error={uploadMessage}
                    onRetry={null}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {recipientSource === 'org' && csvResult && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  {segmentationMode === 'segmented' ? 'Multi-Segment Targeting Rules' : 'Audience Targeting Filters'}
                </CardTitle>
                <CardDescription>
                  {segmentationMode === 'segmented' 
                    ? 'Define rules for each segment. Add multiple filters to narrow down recipient groups (e.g., previous campaign mail open users, specific domains, etc.).'
                    : 'Apply filters to target specific users from your organization (e.g., users who opened a previous campaign, specific departments, etc.). Multiple filters can be stacked.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SegmentationEngine 
                  campaignId={campaignId} 
                  insights={insights}
                  onSegmentsChange={(segs) => setSegments(segs)}
                  moduleType={1}
                  moduleId={user?.organization_id || 1}
                  maxSegments={3}
                  isSingleMode={segmentationMode === 'single'}
                  canAddSegments={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Campaign-specific with CSV loaded → Optional Filters */}
          {recipientSource === 'campaign' && csvResult && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  {segmentationMode === 'segmented' ? 'Multi-Segment Rules (Optional)' : 'Targeting Filters (Optional)'}
                </CardTitle>
                <CardDescription>
                  {segmentationMode === 'segmented'
                    ? 'Optionally define segment rules using your uploaded CSV columns to split recipients into groups.'
                    : 'Optionally apply filters on the uploaded CSV data to narrow your recipient list.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SegmentationEngine 
                  campaignId={campaignId} 
                  insights={insights}
                  onSegmentsChange={(segs) => setSegments(segs)}
                  moduleType={2}
                  moduleId={campaignId}
                  maxSegments={3}
                  isSingleMode={segmentationMode === 'single'}
                  canAddSegments={true}
                />
              </CardContent>
            </Card>
          )}

          {/* ─── Multi-Segment Info Banner ─── */}
          {segmentationMode === 'segmented' && (
            <div className="p-4 bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
              <Layers className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-900 dark:text-amber-100">Multi-Segment Mode Active</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                  In the next steps, you'll be able to assign different email templates and subject lines to each segment.
                  This is ideal for A/B testing different messaging or personalizing content per audience group.
                </p>
              </div>
            </div>
          )}

          {/* ─── Navigation ─── */}
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
              ← Back to Basics
            </Button>
            <div className="flex items-center gap-3">
              <Link to="/audience">
                <Button type="button" variant="outline" size="sm" className="gap-2 bg-white dark:bg-slate-950 text-xs">
                  Manage Segments
                </Button>
              </Link>
              <Button 
                type="button"
                onClick={async () => {
                  const form = document.getElementById('campaignFormAudience');
                  if (form && !form.checkValidity()) {
                    form.reportValidity();
                    return;
                  }
                  setIsSubmitting(true);
                  try {
                    const data = {
                      name: campaignName,
                      segments,
                      is_ab_test: false,
                      ab_test_type: null,
                      segmentation_mode: segmentationMode,
                      sender_config_id: senderConfigId,
                      status: 'draft',
                      wizard_step: 3,
                      recipient_source: recipientSource,
                    };
                    const defaultSegment = segments.find(s => s.isDefault) || segments[0];
                    const defaultVar = (defaultSegment ? variants[defaultSegment.id] : null) || variants['default'] || {};
                    data.subject = defaultVar.subject || 'Campaign Subject';
                    data.body = defaultVar.body || 'Email content goes here...';
                    data.cta_link = '';

                    let updatedCampaign;
                    if (campaignId) {
                      updatedCampaign = await updateCampaign(campaignId, data);
                    } else {
                      const response = await api.post('/campaigns', data);
                      updatedCampaign = response?.data;
                      if (updatedCampaign?.id) {
                        setCampaignId(updatedCampaign.id);
                      }
                    }
                    if (updatedCampaign) {
                      updateStateFromCampaignData(updatedCampaign);
                    }
                    setCurrentStep(3);
                  } catch (err) {
                    console.error('Failed to save audience draft:', err);
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                isLoading={isSubmitting}
              >
                Continue to Templates →
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // Step 1: Campaign Basics (Default render)
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10 animate-in fade-in duration-300">
      {renderHeader("CREATE CAMPAIGN > STEP 1: CAMPAIGN BASICS", "Campaign Basics", "Provide a name and choose the sending account for your campaign.", 1)}
      <form id="campaignFormBasics" onSubmit={(e) => e.preventDefault()} className="space-y-8 pt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-900 dark:text-slate-50 text-base font-bold uppercase tracking-wider font-sans">Campaign Basics</CardTitle>
            <CardDescription className="text-xs">Provide a name and choose the sending account for your campaign.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">Campaign Name</Label>
              <Input 
                id="name" 
                name="name" 
                value={campaignName} 
                onChange={(e) => setCampaignName(e.target.value)} 
                placeholder="e.g. Summer Sale 2026" 
                required 
                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderConfig" className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-sans">Sending Account</Label>
              <Select 
                id="senderConfig" 
                name="sender_config_id" 
                value={senderConfigId} 
                onChange={(e) => setSenderConfigId(e.target.value)} 
                required 
                className="h-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              >
                <option value="">Select a sending account...</option>
                <option value="1">campaign@promptbook.co.in</option>
                {smtpConfigurations.map(config => (
                  <option key={config.id} value={config.id}>
                    {config.fromAddress} ({config.provider})
                  </option>
                ))}
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4 border-t border-slate-200 dark:border-slate-800 pt-6">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/campaigns')}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={async () => {
              const form = document.getElementById('campaignFormBasics');
              if (form && !form.checkValidity()) {
                form.reportValidity();
                return;
              }
              setIsSubmitting(true);
              try {
                const data = {
                  name: campaignName,
                  sender_config_id: senderConfigId,
                  wizard_step: 2,
                  status: 'draft',
                };
                let updatedCampaign;
                if (campaignId) {
                  updatedCampaign = await updateCampaign(campaignId, data);
                } else {
                  const response = await api.post('/campaigns', data);
                  updatedCampaign = response?.data;
                  if (updatedCampaign?.id) {
                    setCampaignId(updatedCampaign.id);
                  }
                }
                if (updatedCampaign) {
                  updateStateFromCampaignData(updatedCampaign);
                }
                setCurrentStep(2);
              } catch (err) {
                console.error('Failed to save basics draft:', err);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-sans font-semibold"
            isLoading={isSubmitting}
          >
            Continue to Audience & Strategy →
          </Button>
        </div>
      </form>

      <AiGenerationModal 
        isOpen={aiGenOpen}
        onClose={() => setAiGenOpen(false)}
        onApply={(data) => {
          if (activeAiSegment) {
            setVariants(prev => ({
              ...prev,
              [activeAiSegment]: {
                ...prev[activeAiSegment],
                ...(data.subject ? { subject: data.subject } : {}),
                ...(data.content ? { body: data.content } : {})
              }
            }));
          }
          setAiGenOpen(false);
        }}
      />
      <AiRewriteModal
        isOpen={aiRewriteOpen}
        onClose={() => setAiRewriteOpen(false)}
        initialContent={activeAiSegment ? variants[activeAiSegment]?.body : ''}
        onApply={(content) => {
          if (activeAiSegment) {
            setVariants(prev => ({
              ...prev,
              [activeAiSegment]: {
                ...prev[activeAiSegment],
                body: content
              }
            }));
          }
          setAiRewriteOpen(false);
        }}
      />
      <AiAnalysisModal
        isOpen={aiAnalysisOpen}
        onClose={() => setAiAnalysisOpen(false)}
        subject={activeAiSegment ? variants[activeAiSegment]?.subject : ''}
        content={activeAiSegment ? variants[activeAiSegment]?.body : ''}
      />
      
      {/* Campaign Preview Modal */}
      {showPreview && selectedTemplateData && activeAiSegment && variants[activeAiSegment] && (
        <CampaignPreview 
          template={selectedTemplateData}
          body={variants[activeAiSegment].body}
          subject={variants[activeAiSegment].subject}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
