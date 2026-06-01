import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import DOMPurify from 'dompurify';

import {
  Sparkles,
  ArrowLeft,
  Settings,
  Mail,
  Eye,
  MousePointerClick,
  Database,
  Save,
  Check,
  Clock,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';

// Custom Nodes styling & definitions
function CampaignNode({ data }) {
  return (
    <div className="w-72 rounded-2xl border border-blue-200/90 bg-white/95 dark:border-blue-900/40 dark:bg-slate-900 p-5 shadow-xl select-none backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ring-4 ring-blue-500/5">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-blue-500 text-white flex items-center justify-center shadow-md">
          <Database className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="text-[10px] text-blue-500 dark:text-blue-400 font-extrabold uppercase tracking-wider block">Root Node</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Source Campaign</span>
        </div>
      </div>
      
      {data?.name ? (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
            {data.name}
          </p>
          <div className="flex flex-wrap gap-1">
            {data.variants?.length === 0 ? (
              <span className="text-[9px] font-extrabold bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 px-2 py-0.5 rounded-full">
                All Segments
              </span>
            ) : (
              data.variants?.map((vName, idx) => (
                <span key={`${vName}-${idx}`} className="text-[9px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-full max-w-[80px] truncate">
                  {vName}
                </span>
              ))
            )}
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Select source campaign...</p>
      )}
      
      <Handle type="source" position={Position.Right} id="campaign-out" style={{ background: '#3b82f6', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
}

function TriggerNode({ data }) {
  const isClick = data?.event === 'click';
  return (
    <div className="w-56 rounded-2xl border border-amber-200/90 bg-white/95 dark:border-amber-900/40 dark:bg-slate-900 p-5 shadow-xl select-none backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ring-4 ring-amber-500/5">
      <Handle type="target" position={Position.Left} id="trigger-in" style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid white' }} />
      
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-md">
          {isClick ? (
            <MousePointerClick className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </div>
        <div>
          <span className="text-[10px] text-amber-500 dark:text-amber-400 font-extrabold uppercase tracking-wider block">Trigger Hook</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Event Criteria</span>
        </div>
      </div>
      
      <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2.5">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 capitalize">
          On Email {isClick ? 'Link Clicked' : 'Opened'}
        </p>
        {isClick && data?.clickUrl && (
          <p className="text-[10px] text-slate-405 dark:text-slate-500 truncate max-w-[170px]" title={data.clickUrl}>
            URL: {data.clickUrl}
          </p>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="trigger-out" style={{ background: '#f59e0b', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
}

function ActionNode({ data }) {
  const hasDelay = (data?.delayHours ?? 0) > 0 || (data?.delayMinutes ?? 0) > 0;
  return (
    <div className="w-72 rounded-2xl border border-purple-200/90 bg-white/95 dark:border-purple-900/40 dark:bg-slate-900 p-5 shadow-xl select-none backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ring-4 ring-purple-500/5">
      <Handle type="target" position={Position.Left} id="action-in" style={{ background: '#a855f7', width: 10, height: 10, border: '2px solid white' }} />
      
      <div className="flex items-center gap-2.5 mb-3">
        <div className="h-8 w-8 rounded-lg bg-purple-500 text-white flex items-center justify-center shadow-md">
          <Mail className="h-4.5 w-4.5" />
        </div>
        <div>
          <span className="text-[10px] text-purple-500 dark:text-purple-400 font-extrabold uppercase tracking-wider block">Action Leaf</span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">Send Email</span>
        </div>
      </div>
      
      {data?.templateName ? (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-2.5">
          <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
            Template: {data.templateName}
          </p>
          <p className="text-[10px] font-semibold text-slate-405 dark:text-slate-500 truncate block">
            Subj: {data.subject}
          </p>
          
          <div className="flex flex-wrap gap-1.5 pt-1">
            <div className="flex items-center gap-1 text-[9px] font-extrabold text-purple-600 bg-purple-50 dark:bg-purple-500/10 dark:text-purple-400 px-2 py-0.5 rounded-full w-fit">
              <Check className="h-3 w-3" />
              {data.mappedCount || 0} mapped
            </div>
            <div className={`flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full w-fit ${
              hasDelay 
                ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
            }`}>
              <Clock className="h-3 w-3" />
              {hasDelay 
                ? `${data.delayHours || 0}h ${data.delayMinutes || 0}m`
                : 'Instantly'
              }
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">Configure mail actions...</p>
      )}
    </div>
  );}

function SegmentNode({ data }) {
  return (
    <div className="w-56 rounded-2xl border border-emerald-250 bg-white/95 dark:border-emerald-900/40 dark:bg-slate-900 p-4 shadow-xl select-none backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ring-4 ring-emerald-500/5">
      <Handle type="target" position={Position.Left} id="segment-in" style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }} />
      
      <div className="flex items-center gap-2.5 mb-2.5">
        <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-extrabold uppercase tracking-wider block">Segment Node</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Target Segment</span>
        </div>
      </div>
      
      <div className="space-y-1 border-t border-slate-100 dark:border-slate-800 pt-2">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">
          {data?.name || 'Untitled Segment'}
        </p>
      </div>

      <Handle type="source" position={Position.Right} id="segment-out" style={{ background: '#10b981', width: 10, height: 10, border: '2px solid white' }} />
    </div>
  );
}

const nodeTypes = {
  campaign: CampaignNode,
  segment: SegmentNode,
  trigger: TriggerNode,
  action: ActionNode
};

const initialNodes = [
  {
    id: 'campaign',
    type: 'campaign',
    position: { x: 50, y: 150 },
    data: { name: '', variants: [] }
  },
  {
    id: 'trigger',
    type: 'trigger',
    position: { x: 420, y: 150 },
    data: { event: 'open', clickUrl: '' }
  },
  {
    id: 'action',
    type: 'action',
    position: { x: 740, y: 150 },
    data: { templateName: '', subject: '', mappedCount: 0, delayHours: 0, delayMinutes: 0 }
  }
];

const initialEdges = [
  {
    id: 'e-campaign-trigger',
    source: 'campaign',
    sourceHandle: 'campaign-out',
    target: 'trigger',
    targetHandle: 'trigger-in',
    animated: true,
    label: 'On Email Open',
    labelStyle: { fill: '#d97706', fontWeight: 800, fontSize: 9 },
    labelBgStyle: { fill: '#fffbeb', stroke: '#fde68a', strokeWidth: 1, rx: 8 },
    labelBgPadding: [8, 4],
    style: { stroke: '#3b82f6', strokeWidth: 3.5 }
  },
  {
    id: 'e-trigger-action',
    source: 'trigger',
    sourceHandle: 'trigger-out',
    target: 'action',
    targetHandle: 'action-in',
    animated: true,
    label: 'Send Instantly',
    labelStyle: { fill: '#7c3aed', fontWeight: 800, fontSize: 9 },
    labelBgStyle: { fill: '#f5f3ff', stroke: '#ddd6fe', strokeWidth: 1, rx: 8 },
    labelBgPadding: [8, 4],
    style: { stroke: '#a855f7', strokeWidth: 3.5 }
  }
];

export default function AutomationBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const {
    campaigns,
    fetchCampaigns,
    templates,
    fetchTemplates,
    createAutomation,
    updateAutomation,
    fetchAutomationDetail
  } = useStore();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('New Trigger Automation');
  
  // Canvas State Nodes
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedVariants, setSelectedVariants] = useState([]); // Empty = All segments
  const [triggerEvent, setTriggerEvent] = useState('open'); // open, click
  const [triggerClickUrl, setTriggerClickUrl] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [actionSubject, setActionSubject] = useState('Immediate Follow-up');
  const [variableMappings, setVariableMappings] = useState({});
  const [delayHours, setDelayHours] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState(0);

  // Branched overrides state
  const [activeVariantId, setActiveVariantId] = useState(null);
  const [segmentConfigs, setSegmentConfigs] = useState({}); // { [vId]: { triggerEvent, selectedTemplateId, ... } }

  const getVal = (key, defaultVal = '') => {
    if (activeVariantId && segmentConfigs[activeVariantId] && segmentConfigs[activeVariantId][key] !== undefined) {
      return segmentConfigs[activeVariantId][key];
    }
    if (key === 'triggerEvent') return triggerEvent;
    if (key === 'triggerClickUrl') return triggerClickUrl;
    if (key === 'selectedTemplateId') return selectedTemplateId;
    if (key === 'actionSubject') return actionSubject;
    if (key === 'variableMappings') return variableMappings;
    if (key === 'delayHours') return delayHours;
    if (key === 'delayMinutes') return delayMinutes;
    return defaultVal;
  };

  const setVal = (key, value) => {
    if (activeVariantId) {
      setSegmentConfigs(prev => ({
        ...prev,
        [activeVariantId]: {
          ...prev[activeVariantId],
          triggerEvent: prev[activeVariantId]?.triggerEvent ?? triggerEvent,
          triggerClickUrl: prev[activeVariantId]?.triggerClickUrl ?? triggerClickUrl,
          selectedTemplateId: prev[activeVariantId]?.selectedTemplateId ?? selectedTemplateId,
          actionSubject: prev[activeVariantId]?.actionSubject ?? actionSubject,
          variableMappings: prev[activeVariantId]?.variableMappings ?? variableMappings,
          delayHours: prev[activeVariantId]?.delayHours ?? delayHours,
          delayMinutes: prev[activeVariantId]?.delayMinutes ?? delayMinutes,
          [key]: value
        }
      }));
    } else {
      if (key === 'triggerEvent') setTriggerEvent(value);
      if (key === 'triggerClickUrl') setTriggerClickUrl(value);
      if (key === 'selectedTemplateId') setSelectedTemplateId(value);
      if (key === 'actionSubject') setActionSubject(value);
      if (key === 'variableMappings') setVariableMappings(value);
      if (key === 'delayHours') setDelayHours(value);
      if (key === 'delayMinutes') setDelayMinutes(value);
    }
  };

  // UI Active drawer panels & Preview modals
  const [activePanel, setActivePanel] = useState('campaign'); // campaign, trigger, action
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // React Flow States
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Container dimension diagnostics
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight
      });
    }
    // Set up a resize listener to track dimensions in real-time
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchTemplates();
    
    if (id) {
      loadAutomation();
    }
  }, [id, fetchCampaigns, fetchTemplates]);

  const loadAutomation = async () => {
    setLoading(true);
    try {
      const data = await fetchAutomationDetail(id);
      if (data) {
        setName(data.name);
        setSelectedCampaignId(data.trigger_campaign_id || '');
        setSelectedVariants(data.trigger_variant_ids || []);
        setTriggerEvent(data.trigger_event || 'open');
        setTriggerClickUrl(data.trigger_click_url || '');
        setSelectedTemplateId(data.action_template_id || '');
        setActionSubject(data.action_subject || '');
        setVariableMappings(data.action_variable_mappings?.global_mappings || data.action_variable_mappings || {});
        setDelayHours(data.delay_hours || 0);
        setDelayMinutes(data.delay_minutes || 0);
        setSegmentConfigs(data.action_variable_mappings?.segment_configs || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Find currently selected campaign data to extract segments & CSV columns
  const selectedCampaign = campaigns.find(c => c.id === parseInt(selectedCampaignId));
  const availableVariants = selectedCampaign?.variants || [];
  
  const activeTemplateId = getVal('selectedTemplateId');
  const selectedTemplate = templates.find(t => t.id === parseInt(activeTemplateId));
  const templateVariables = selectedTemplate?.variables || [];

  // Real-Time Flow Validation
  const unmappedVars = templateVariables.filter(v => !getVal('variableMappings', {})[v]);
  const isFlowValid = selectedCampaignId && activeTemplateId && unmappedVars.length === 0;

  // Memoize custom nodeTypes to maintain reference stability across renders
  const nodeTypesMemo = useMemo(() => ({
    campaign: CampaignNode,
    segment: SegmentNode,
    trigger: TriggerNode,
    action: ActionNode
  }), []);

  // Sync Form States to React Flow Nodes & Edges
  useEffect(() => {
    const selectedVariantNames = selectedVariants.map(vId => {
      const v = availableVariants.find(x => x.id === vId);
      return v?.name || vId;
    });

    if (selectedVariants.length === 0) {
      setNodes([
        {
          id: 'campaign',
          type: 'campaign',
          position: { x: 50, y: 150 },
          data: {
            name: selectedCampaign?.name || '',
            variants: []
          }
        },
        {
          id: 'trigger',
          type: 'trigger',
          position: { x: 420, y: 150 },
          data: {
            event: triggerEvent,
            clickUrl: triggerClickUrl
          }
        },
        {
          id: 'action',
          type: 'action',
          position: { x: 740, y: 150 },
          data: {
            templateName: selectedTemplate?.template_name || '',
            subject: actionSubject,
            mappedCount: Object.keys(variableMappings).length,
            delayHours: delayHours,
            delayMinutes: delayMinutes
          }
        }
      ]);

      const delayText = (delayHours > 0 || delayMinutes > 0)
        ? `After ${delayHours}h ${delayMinutes}m`
        : 'Send Instantly';

      setEdges([
        {
          id: 'e-campaign-trigger',
          source: 'campaign',
          sourceHandle: 'campaign-out',
          target: 'trigger',
          targetHandle: 'trigger-in',
          animated: true,
          label: `On ${triggerEvent === 'click' ? 'Link Click' : 'Email Open'}`,
          labelStyle: { fill: '#d97706', fontWeight: 800, fontSize: 9 },
          labelBgStyle: { fill: '#fffbeb', stroke: '#fde68a', strokeWidth: 1, rx: 8 },
          labelBgPadding: [8, 4],
          style: { stroke: '#3b82f6', strokeWidth: 3.5 }
        },
        {
          id: 'e-trigger-action',
          source: 'trigger',
          sourceHandle: 'trigger-out',
          target: 'action',
          targetHandle: 'action-in',
          animated: true,
          label: delayText,
          labelStyle: { fill: '#7c3aed', fontWeight: 800, fontSize: 9 },
          labelBgStyle: { fill: '#f5f3ff', stroke: '#ddd6fe', strokeWidth: 1, rx: 8 },
          labelBgPadding: [8, 4],
          style: { stroke: '#a855f7', strokeWidth: 3.5 }
        }
      ]);
    } else {
      const N = selectedVariants.length;
      
      const campaignNode = {
        id: 'campaign',
        type: 'campaign',
        position: { x: 50, y: 50 + (N - 1) * 120 },
        data: {
          name: selectedCampaign?.name || '',
          variants: selectedVariantNames
        }
      };

      const newNodes = [campaignNode];
      const newEdges = [];

      selectedVariants.forEach((vId, idx) => {
        const variantObj = availableVariants.find(x => x.id === vId);
        const variantName = variantObj?.name || `Segment ${vId}`;
        const yPos = 50 + idx * 240;

        // Scoped configs or fallbacks
        const vConfig = segmentConfigs[vId] || {};
        const vTriggerEvent = vConfig.triggerEvent ?? triggerEvent;
        const vTriggerClickUrl = vConfig.triggerClickUrl ?? triggerClickUrl;
        const vSelectedTemplateId = vConfig.selectedTemplateId ?? selectedTemplateId;
        const vActionSubject = vConfig.actionSubject ?? actionSubject;
        const vVariableMappings = vConfig.variableMappings ?? variableMappings;
        const vDelayHours = vConfig.delayHours ?? delayHours;
        const vDelayMinutes = vConfig.delayMinutes ?? delayMinutes;

        const vTemplate = templates.find(t => t.id === parseInt(vSelectedTemplateId));

        // A. Segment Node
        newNodes.push({
          id: `segment-${vId}`,
          type: 'segment',
          position: { x: 380, y: yPos },
          data: { name: variantName }
        });

        // B. Trigger Node
        newNodes.push({
          id: `trigger-${vId}`,
          type: 'trigger',
          position: { x: 670, y: yPos },
          data: {
            event: vTriggerEvent,
            clickUrl: vTriggerClickUrl
          }
        });

        // C. Action Node
        newNodes.push({
          id: `action-${vId}`,
          type: 'action',
          position: { x: 960, y: yPos },
          data: {
            templateName: vTemplate?.template_name || '',
            subject: vActionSubject,
            mappedCount: Object.keys(vVariableMappings).length,
            delayHours: vDelayHours,
            delayMinutes: vDelayMinutes
          }
        });

        // Edges
        // Campaign -> Segment
        newEdges.push({
          id: `e-campaign-segment-${vId}`,
          source: 'campaign',
          sourceHandle: 'campaign-out',
          target: `segment-${vId}`,
          targetHandle: 'segment-in',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 3.5 }
        });

        // Segment -> Trigger
        newEdges.push({
          id: `e-segment-trigger-${vId}`,
          source: `segment-${vId}`,
          sourceHandle: 'segment-out',
          target: `trigger-${vId}`,
          targetHandle: 'trigger-in',
          animated: true,
          label: `On ${vTriggerEvent === 'click' ? 'Link Click' : 'Email Open'}`,
          labelStyle: { fill: '#d97706', fontWeight: 800, fontSize: 9 },
          labelBgStyle: { fill: '#fffbeb', stroke: '#fde68a', strokeWidth: 1, rx: 8 },
          labelBgPadding: [8, 4],
          style: { stroke: '#f59e0b', strokeWidth: 3.5 }
        });

        // Trigger -> Action
        const delayText = (vDelayHours > 0 || vDelayMinutes > 0)
          ? `After ${vDelayHours}h ${vDelayMinutes}m`
          : 'Send Instantly';

        newEdges.push({
          id: `e-trigger-action-${vId}`,
          source: `trigger-${vId}`,
          sourceHandle: 'trigger-out',
          target: `action-${vId}`,
          targetHandle: 'action-in',
          animated: true,
          label: delayText,
          labelStyle: { fill: '#7c3aed', fontWeight: 800, fontSize: 9 },
          labelBgStyle: { fill: '#f5f3ff', stroke: '#ddd6fe', strokeWidth: 1, rx: 8 },
          labelBgPadding: [8, 4],
          style: { stroke: '#a855f7', strokeWidth: 3.5 }
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [
    selectedCampaignId,
    selectedVariants,
    triggerEvent,
    triggerClickUrl,
    selectedTemplateId,
    actionSubject,
    variableMappings,
    delayHours,
    delayMinutes,
    segmentConfigs,
    campaigns,
    templates,
    setNodes,
    setEdges,
    availableVariants
  ]);

  const onNodeClick = useCallback((event, node) => {
    if (node.id.includes('-')) {
      const [type, vId] = node.id.split('-');
      setActivePanel(type);
      setActiveVariantId(parseInt(vId));
    } else {
      setActivePanel(node.id);
      setActiveVariantId(null);
    }
  }, []);
  
  // Get dynamic attributes (CSV header keys) from campaign variable mappings
  const availableCsvColumns = selectedCampaign?.variable_mappings 
    ? Object.values(selectedCampaign.variable_mappings) 
    : ['company_name', 'discount_code', 'first_name', 'coupon', 'job_title', 'city'];

  const handleToggleVariant = (variantId) => {
    setSelectedVariants(prev => 
      prev.includes(variantId) 
        ? prev.filter(v => v !== variantId) 
        : [...prev, variantId]
    );
  };

  const handleMapVariable = (varKey, val) => {
    const currentMappings = getVal('variableMappings', {});
    const updatedMappings = {
      ...currentMappings,
      [varKey]: val
    };
    setVal('variableMappings', updatedMappings);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Please enter an automation name.');
      return;
    }
    if (!selectedCampaignId) {
      alert('Please select a source Campaign.');
      return;
    }
    const hasGlobalTemplate = Boolean(selectedTemplateId);
    const hasAllSegmentTemplates = selectedVariants.length > 0 && selectedVariants.every(vId => 
      segmentConfigs[vId]?.selectedTemplateId
    );

    if (!hasGlobalTemplate && !hasAllSegmentTemplates) {
      alert('Please select a follow-up Email Template.');
      return;
    }
    if (unmappedVars.length > 0) {
      if (!window.confirm(`Warning: You have ${unmappedVars.length} unmapped template variables. Proceed anyway?`)) {
        return;
      }
    }

    const firstSegmentConfig = selectedVariants.length > 0 ? segmentConfigs[selectedVariants[0]] : null;

    const payload = {
      name,
      trigger_campaign_id: parseInt(selectedCampaignId),
      trigger_variant_ids: selectedVariants,
      trigger_event: triggerEvent,
      trigger_click_url: triggerEvent === 'click' ? triggerClickUrl : null,
      action_template_id: parseInt(selectedTemplateId || firstSegmentConfig?.selectedTemplateId),
      action_subject: actionSubject || firstSegmentConfig?.actionSubject || 'Immediate Follow-up',
      action_variable_mappings: selectedVariants.length > 0 ? {
        global_mappings: variableMappings,
        segment_configs: segmentConfigs
      } : variableMappings,
      delay_hours: delayHours ?? firstSegmentConfig?.delayHours ?? 0,
      delay_minutes: delayMinutes ?? firstSegmentConfig?.delayMinutes ?? 0
    };

    setLoading(true);
    try {
      if (id) {
        await updateAutomation(id, payload);
      } else {
        await createAutomation(payload);
      }
      navigate('/automations');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 min-h-[50vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        <span className="text-slate-400 mt-4 font-semibold text-sm">Loading visual canvas...</span>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col -m-4 lg:-m-6 bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      
      {/* Visual Canvas Sub-Header */}
      <div className="h-16 border-b border-slate-200/60 dark:border-slate-800/50 bg-white dark:bg-slate-900 px-6 flex items-center justify-between z-10 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <Link
            to="/automations"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-bold text-slate-800 dark:text-slate-100 bg-transparent border-0 focus:ring-0 focus:outline-none p-0 max-w-sm"
            placeholder="Automation Name"
          />
        </div>

        {/* Real-time Validation & Save buttons */}
        <div className="flex items-center gap-4">
          <div 
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold transition-all relative group cursor-help ${
              isFlowValid 
                ? 'bg-emerald-50/50 border-emerald-250 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                : 'bg-amber-50/50 border-amber-250 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${isFlowValid ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            {isFlowValid ? 'Flow Configured' : 'Setup Needed'}

            {/* Validation Hover Dropdown Tooltip */}
            <div className="absolute right-0 top-7 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3.5 hidden group-hover:block transition-all z-20">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">Health Checklist</span>
              <ul className="space-y-1.5 text-xs text-slate-650 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedCampaignId ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {selectedCampaignId ? '✓' : '×'}
                  </span>
                  Campaign selected
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${selectedTemplateId ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {selectedTemplateId ? '✓' : '×'}
                  </span>
                  Template selected
                </li>
                <li className="flex items-center gap-2">
                  <span className={`h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold ${unmappedVars.length === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    {unmappedVars.length === 0 ? '✓' : '!'}
                  </span>
                  Variables mapped ({templateVariables.length - unmappedVars.length}/{templateVariables.length})
                </li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 text-sm font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Automation'}
          </button>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* React Flow Visual Canvas Container */}
        <div ref={containerRef} className="flex-1 h-full relative z-0" style={{ minHeight: '500px' }}>
          {/* Diagnostics Panel */}
          <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 z-50 text-xs text-slate-800 dark:text-slate-200 shadow-lg space-y-2 pointer-events-none">
            <span className="font-extrabold text-[10px] uppercase text-blue-500 tracking-wider block">Diagnostics Panel</span>
            <div>Nodes Count: <strong className="text-blue-600 dark:text-blue-400">{nodes.length}</strong></div>
            <div>Edges Count: <strong className="text-amber-600 dark:text-amber-400">{edges.length}</strong></div>
            <div>Selected Campaign ID: <strong>{selectedCampaignId || 'None'}</strong></div>
            <div>Selected Template ID: <strong>{selectedTemplateId || 'None'}</strong></div>
            <div>Container Size: <strong className="text-purple-650 dark:text-purple-400">{dimensions.width}px x {dimensions.height}px</strong></div>
            <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5 mt-1">
              <span className="text-[10px] font-bold text-slate-400 block uppercase">Node Positions:</span>
              <ul className="space-y-1 text-[10px] font-mono text-slate-600 dark:text-slate-400 mt-1">
                {nodes.map(n => (
                  <li key={n.id} className="flex justify-between gap-4">
                    <span>{n.id}:</span>
                    <strong>({n.position?.x !== undefined ? Math.round(n.position.x) : 'N/A'}, {n.position?.y !== undefined ? Math.round(n.position.y) : 'N/A'})</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypesMemo}
            onNodeClick={onNodeClick}
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background color="#cbd5e1" gap={20} size={1.2} />
            <Controls className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
            <MiniMap 
              nodeColor={(n) => {
                if (n.type === 'campaign') return '#3b82f6';
                if (n.type === 'trigger') return '#f59e0b';
                if (n.type === 'action') return '#a855f7';
                return '#cbd5e1';
              }} 
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hidden sm:block" 
            />
          </ReactFlow>
        </div>

        {/* Panel Sidebar Config Drawer (Right Side) */}
        <div className="w-96 border-l border-slate-200/60 dark:border-slate-800/50 bg-white dark:bg-slate-900 flex flex-col shrink-0 z-10 shadow-lg">
          <div className="h-14 border-b border-slate-100 dark:border-slate-800 px-6 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
              {activePanel === 'campaign' && 'Campaign configuration'}
              {activePanel === 'trigger' && 'Trigger settings'}
              {activePanel === 'action' && 'Action properties'}
            </span>
            <Settings className="h-4.5 w-4.5 text-slate-400" />
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* PANEL: CAMPAIGN ROOT */}
            {activePanel === 'campaign' && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    Select Target Campaign
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => {
                      setSelectedCampaignId(e.target.value);
                      setSelectedVariants([]);
                    }}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Choose Campaign --</option>
                    {campaigns.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {selectedCampaignId && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Filter Target Segments (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        Empty = All segments
                      </span>
                    </div>
                    
                    {availableVariants.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No segment variants configured for this campaign.</p>
                    ) : (
                      <div className="space-y-2 rounded-xl border border-slate-100 dark:border-slate-800 p-3 max-h-48 overflow-y-auto">
                        {availableVariants.map(variant => {
                          const checked = selectedVariants.includes(variant.id);
                          return (
                            <label 
                              key={variant.id} 
                              className="flex items-center gap-3 text-xs font-semibold text-slate-750 dark:text-slate-300 py-1.5 cursor-pointer hover:text-slate-900"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleToggleVariant(variant.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />
                              {variant.name}
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PANEL: TRIGGER SETTINGS */}
            {activePanel === 'trigger' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    Trigger Event Hook
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setVal('triggerEvent', 'open')}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all ${
                        getVal('triggerEvent', 'open') === 'open'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <Eye className="h-5 w-5" />
                      <span className="text-xs font-bold">Email Open</span>
                    </button>
                    <button
                      onClick={() => setVal('triggerEvent', 'click')}
                      className={`flex flex-col items-center gap-2.5 rounded-xl border p-4 text-center transition-all ${
                        getVal('triggerEvent', 'open') === 'click'
                          ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                          : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-500'
                      }`}
                    >
                      <MousePointerClick className="h-5 w-5" />
                      <span className="text-xs font-bold">Link Click</span>
                    </button>
                  </div>
                </div>

                {getVal('triggerEvent', 'open') === 'click' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                      Target Link URL Filter (Optional)
                    </label>
                    <input
                      type="url"
                      value={getVal('triggerClickUrl')}
                      onChange={(e) => setVal('triggerClickUrl', e.target.value)}
                      placeholder="e.g. https://yourstore.com/checkout"
                      className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-[10px] text-slate-405 dark:text-slate-500 font-semibold block leading-normal mt-1">
                      If left empty, clicking any hyperlink in the campaign email triggers this follow-up.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PANEL: ACTION CONFIGURATION */}
            {activePanel === 'action' && (
              <div className="space-y-6">
                
                {/* Select Template & Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                      Choose Email Template
                    </label>
                    {getVal('selectedTemplateId') && (
                      <button
                        onClick={() => setIsPreviewOpen(true)}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Preview Template
                      </button>
                    )}
                  </div>
                  <select
                    value={getVal('selectedTemplateId')}
                    onChange={(e) => {
                      setVal('selectedTemplateId', e.target.value);
                      setVal('variableMappings', {});
                    }}
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Choose Template --</option>
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.template_name}</option>
                    ))}
                  </select>
                </div>

                {/* Subject text */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 block">
                    Customized Subject Line
                  </label>
                  <input
                    type="text"
                    value={getVal('actionSubject')}
                    onChange={(e) => setVal('actionSubject', e.target.value)}
                    placeholder="e.g. Here is your code, {{name}}!"
                    className="w-full rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-850 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* Delivery Delay Buffer */}
                <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-350">
                    <Clock className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                    <span className="text-xs font-extrabold uppercase tracking-wide">
                      Delivery Delay Buffer
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-405 dark:text-slate-500 leading-normal">
                    Avoid sounding like an instant bot response. Introduce a natural delay interval before dispatching the follow-up email.
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400">Hours</label>
                      <input
                        type="number"
                        min="0"
                        value={getVal('delayHours', 0)}
                        onChange={(e) => setVal('delayHours', Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-extrabold text-slate-400">Minutes</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={getVal('delayMinutes', 0)}
                        onChange={(e) => setVal('delayMinutes', Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                        className="w-full rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic variable mapping */}
                {getVal('selectedTemplateId') && (
                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                      <Sparkles className="h-4.5 w-4.5 text-purple-500" />
                      <span className="text-xs font-extrabold uppercase tracking-wide">
                        Dynamic Mappings ({templateVariables.length})
                      </span>
                    </div>

                    {templateVariables.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No variables found in this template.</p>
                    ) : (
                      <div className="space-y-4">
                        {templateVariables.map((varKey) => {
                          const currentVal = getVal('variableMappings', {})[varKey] || '';
                          return (
                            <div key={varKey} className="space-y-2 rounded-xl bg-slate-50 dark:bg-slate-850 p-3.5 border border-slate-100 dark:border-slate-800/80">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                                  {`{{${varKey}}}`}
                                </span>
                                <span className="text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30">
                                  Template placeholder
                                </span>
                              </div>

                              <div className="flex gap-2">
                                <select
                                  value={currentVal}
                                  onChange={(e) => handleMapVariable(varKey, e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                >
                                  <option value="">-- Map to attribute --</option>
                                  <option value="name">Recipient: Full Name</option>
                                  <option value="email">Recipient: Email</option>
                                  {availableCsvColumns.map(col => (
                                    <option key={col} value={col}>CSV Header: {col}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>
        </div>

      </div>

      {/* In-Canvas Live Email Template Preview Drawer Modal */}
      {isPreviewOpen && selectedTemplate && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Template Preview: {selectedTemplate.template_name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Showing original compiled HTML markup layout.
                </p>
              </div>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body iframe render */}
            <div className="flex-1 p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">
              <iframe
                srcDoc={DOMPurify.sanitize(selectedTemplate.html_content)}
                className="w-full h-[550px] border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm bg-white"
                title="Visual Template Preview"
                sandbox="allow-same-origin"
              />
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-slate-350 px-4 py-2 text-xs font-bold transition-all"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
