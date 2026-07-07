import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import api from '../lib/api';
import { cn } from '../lib/utils';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { 
  Plus, 
  Search, 
  ChevronDown, 
  RotateCcw, 
  Pencil, 
  BarChart2, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  Zap, 
  Loader2, 
  X, 
  Calendar,
  Filter,
  ShieldAlert
} from 'lucide-react';

export default function Campaigns() {
  const { 
    campaigns, 
    campaignsMetadata, 
    campaignsLoading, 
    fetchCampaigns, 
    addToast,
    domains,
    fetchDomains
  } = useStore();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [showQuickMailModal, setShowQuickMailModal] = useState(false);
  const [sendingQuickMail, setSendingQuickMail] = useState(false);
  
  // Quick Mail Form State
  const [quickMailEmail, setQuickMailEmail] = useState('');
  const [quickMailSubject, setQuickMailSubject] = useState('');
  const [quickMailBody, setQuickMailBody] = useState('');
  const [showDomainRequiredModal, setShowDomainRequiredModal] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const menuRef = useRef(null);

  // Ensure End Date cannot be earlier than Start Date
  useEffect(() => {
    if (customStartDate && customEndDate && customEndDate < customStartDate) {
      setCustomEndDate(customStartDate);
    }
  }, [customStartDate, customEndDate]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchCampaigns(currentPage, {
      search: searchTerm,
      status: statusFilter,
      date_filter: dateFilter,
      start_date: customStartDate,
      end_date: customEndDate
    });
  }, [fetchCampaigns, currentPage, searchTerm, statusFilter, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    fetchDomains().catch(() => {});
  }, [fetchDomains]);

  const hasVerifiedDomain = domains && domains.length > 0 && domains.some(d => d.status === 'verified');

  // Handle clicking outside action menu to close it
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Logic - server filtered, so campaigns is already filtered
  const filteredCampaigns = campaigns;

  // Sort campaigns in descending order of creation/modification date client-side
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    const dateA = new Date(a.created_at || a.updated_at || 0);
    const dateB = new Date(b.created_at || b.updated_at || 0);
    return dateB - dateA;
  });

  // Date Formatter helper (Today, Yesterday, Oct 12, 2023)
  const formatLastModified = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Check if today
    if (date.toDateString() === now.toDateString()) {
      return `Today, ${timeStr}`;
    }
    
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${timeStr}`;
    }
    
    // Otherwise format as short date
    return date.toLocaleDateString([], { month: 'short', day: '2-digit', year: 'numeric' });
  };

  const getDuplicateName = (originalName, existingNames) => {
    let newName = '';
    const copyRegex = /\s\(Copy\)$/;
    const copyNumRegex = /\s\(Copy\s(\d+)\)$/;

    if (copyNumRegex.test(originalName)) {
      const match = originalName.match(copyNumRegex);
      const num = parseInt(match[1], 10);
      const base = originalName.replace(copyNumRegex, '');
      newName = `${base} (Copy ${num + 1})`;
    } else if (copyRegex.test(originalName)) {
      const base = originalName.replace(copyRegex, '');
      newName = `${base} (Copy 1)`;
    } else {
      newName = `${originalName} (Copy)`;
    }

    let finalName = newName;
    let attempt = 1;
    while (existingNames.includes(finalName.toLowerCase())) {
      if (copyNumRegex.test(finalName)) {
        const match = finalName.match(copyNumRegex);
        const num = parseInt(match[1], 10);
        const base = finalName.replace(copyNumRegex, '');
        finalName = `${base} (Copy ${num + 1})`;
      } else if (copyRegex.test(finalName)) {
        const base = finalName.replace(copyRegex, '');
        finalName = `${base} (Copy 1)`;
      } else {
        finalName = `${finalName} (Copy ${attempt})`;
        attempt++;
      }
    }
    return finalName;
  };

  const handleDuplicate = async (campaign) => {
    setActiveMenuId(null);
    try {
      const existingNames = campaigns.map(c => (c.name || '').toLowerCase());
      const newName = getDuplicateName(campaign.name || 'Untitled', existingNames);

      const response = await api.get(`/campaigns/${campaign.id}`);
      const fullCampaign = response.data;

      const formattedSegments = [];
      const formattedVariants = {};

      if (fullCampaign.variants && fullCampaign.variants.length > 0) {
        fullCampaign.variants.forEach((v) => {
          const isDefault = v.is_default || v.name === 'Default';
          const segmentId = isDefault ? 'default' : `temp_${v.id}`;
          
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

          formattedSegments.push({
            id: segmentId,
            name: v.name,
            isDefault: isDefault,
            filters: filters,
            priority: v.priority
          });

          formattedVariants[segmentId] = {
            subject: v.subject || '',
            body: v.body || '',
            cta_link: v.cta_url || ''
          };
        });
      }

      const duplicatePayload = {
        name: newName,
        subject: fullCampaign.subject || '',
        body: fullCampaign.body || '',
        template_id: fullCampaign.template_id,
        cta_link: fullCampaign.cta_url,
        sender_config_id: fullCampaign.sender_config_id,
        segmentation_mode: fullCampaign.segmentation_mode || 'single',
        segments: formattedSegments,
        variants: formattedVariants,
        status: 'draft',
        schedule_type: fullCampaign.schedule_type || 'immediate',
        scheduled_at: fullCampaign.scheduled_at,
        schedule_frequency: fullCampaign.schedule_frequency,
        schedule_days: fullCampaign.schedule_days,
        schedule_time: fullCampaign.schedule_time,
        variable_mappings: fullCampaign.variable_mappings,
        wizard_step: fullCampaign.wizard_step || 1,
        recipient_source: fullCampaign.recipient_source || 'campaign',
      };

      await api.post('/campaigns', duplicatePayload);
      await fetchCampaigns(currentPage);
      addToast(`Campaign "${campaign.name}" duplicated as "${newName}" (Draft)!`, 'success');
    } catch (error) {
      console.error('Duplication failed:', error);
      addToast('Failed to duplicate campaign', 'error');
    }
  };

  const [refreshingId, setRefreshingId] = useState(null);

  const handleRefreshCampaign = async (campaignId) => {
    setRefreshingId(campaignId);
    try {
      await fetchCampaigns(currentPage);
      addToast('Metrics refreshed successfully!', 'success');
    } catch (err) {
      console.error('Refresh failed:', err);
      addToast('Failed to refresh metrics', 'error');
    } finally {
      setRefreshingId(null);
    }
  };

  const handleRescheduleCampaign = async (campaign) => {
    setActiveMenuId(null);
    try {
      await api.patch(`/campaigns/${campaign.id}`, {
        status: 'draft',
        wizard_step: 5,
      });
      addToast(`Campaign "${campaign.name}" reset to draft. Redirecting...`, 'success');
      navigate(`/campaigns/${campaign.id}/edit`);
    } catch (err) {
      console.error(err);
      addToast('Failed to reschedule campaign', 'error');
    }
  };

  // Delete Action (Mocked locally in state)
  const handleDelete = (id, name) => {
    const updated = campaigns.filter(c => c.id !== id);
    useStore.setState({ campaigns: updated });
    addToast(`Campaign "${name}" deleted successfully!`, 'success');
    setActiveMenuId(null);
  };

  // Quick Mail Submit
  const handleSendQuickMail = (e) => {
    e.preventDefault();
    if (!quickMailEmail || !quickMailSubject || !quickMailBody) {
      addToast('Please fill out all fields.', 'error');
      return;
    }

    setSendingQuickMail(true);
    // Simulate sending delay
    setTimeout(() => {
      setSendingQuickMail(false);
      setShowQuickMailModal(false);
      addToast(`Quick email sent successfully to ${quickMailEmail}!`, 'success');
      // Reset form
      setQuickMailEmail('');
      setQuickMailSubject('');
      setQuickMailBody('');
    }, 1200);
  };

  // Pagination Values
  const totalVal = campaignsMetadata?.total ?? 0;
  const fromVal = campaignsMetadata?.from ?? 0;
  const toVal = campaignsMetadata?.to ?? 0;
  const lastPage = campaignsMetadata?.last_page ?? 1;

  if (campaignsLoading && campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-slate-500 text-sm font-medium">Loading campaigns...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Header Overview Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#172B4D] dark:text-slate-50">Campaigns Overview</h2>
          <p className="text-sm text-[#626F86] dark:text-slate-400 mt-1">Manage and monitor your active email campaigns.</p>
        </div>
        
        {/* Header Actions */}
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => {
              if (!hasVerifiedDomain) {
                setShowDomainRequiredModal(true);
              } else {
                setShowQuickMailModal(true);
              }
            }}
            className="border-[#626F86] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#626F86] dark:text-slate-350 gap-2 hover:bg-[#F4F5F7] dark:hover:bg-slate-850 rounded-none font-bold cursor-pointer transition-colors"
          >
            <Zap className="h-4 w-4 text-[#626F86]" />
            Send Quick Mail
          </Button>

          <Button 
            onClick={() => {
              if (!hasVerifiedDomain) {
                setShowDomainRequiredModal(true);
              } else {
                navigate('/campaigns/new');
              }
            }}
            className="bg-[#0052CC] hover:bg-[#0043a4] text-white gap-2 font-bold rounded-none shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create New Campaign
          </Button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Search */}
        <div className="relative w-full sm:flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#626F86]" />
          <Input 
            placeholder="Search campaigns..." 
            className="pl-9 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-[#172B4D] focus:border-[#0052CC] focus:ring-[#0052CC]/20 h-10 rounded-none w-full" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Dropdown */}
        <div className="relative w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none pl-4 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 text-[#172B4D] dark:text-slate-300 appearance-none cursor-pointer h-10"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <ChevronDown className="absolute right-3 top-3.5 h-3 w-3 text-[#626F86] pointer-events-none" />
        </div>

        {/* Date Selector */}
        <div className="relative w-full sm:w-44">
          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-[#626F86]" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 text-[#172B4D] dark:text-slate-300 appearance-none cursor-pointer h-10"
          >
            <option value="all">All Dates</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <ChevronDown className="absolute right-3 top-3.5 h-3 w-3 text-[#626F86] pointer-events-none" />
        </div>

        {/* Custom Date Inputs */}
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2 w-full sm:w-auto animate-in fade-in duration-200">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              max={customEndDate || todayStr}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 text-[#172B4D] dark:text-slate-200 h-10 w-full sm:w-36 cursor-pointer"
              placeholder="Start Date"
            />
            <span className="text-[#626F86] text-xs font-semibold">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch (err) {}
              }}
              min={customStartDate}
              max={todayStr}
              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 text-[#172B4D] dark:text-slate-200 h-10 w-full sm:w-36 cursor-pointer"
              placeholder="End Date"
            />
          </div>
        )}
      </div>

      {/* Campaigns Listing Table */}
      <div className="rounded-none border border-slate-200 bg-white dark:border-slate-850 dark:bg-slate-950 overflow-x-auto shadow-sm">
        <Table className="min-w-full">
          <TableHeader className="bg-[#0052CC] dark:bg-slate-900 border-b border-[#0043a4]">
            <TableRow className="border-none hover:bg-transparent">
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 pl-6 border-r border-[#0043a4]/40 last:border-r-0">Campaign Name</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 border-r border-[#0043a4]/40 last:border-r-0">Status</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 text-center border-r border-[#0043a4]/40 last:border-r-0">Delivered Rate | Sent</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 text-center border-r border-[#0043a4]/40 last:border-r-0">Open Rate | Opens</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 text-center border-r border-[#0043a4]/40 last:border-r-0">Click Rate | Clicks</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 border-r border-[#0043a4]/40 last:border-r-0">Last Modified</TableHead>
              <TableHead className="font-extrabold text-white uppercase text-[11px] tracking-wider py-1 text-center pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCampaigns.map((c) => {
              const status = c.status?.toLowerCase();
              const isDraft = status === 'draft';
              const isCompleted = status === 'completed';
              const isActive = ['running', 'sent', 'scheduled', 'pending'].includes(status);
              
              // Map display status text
              const displayStatus = isDraft ? 'Draft' : isCompleted ? 'Completed' : 'Active';

              return (
                <TableRow key={c.id} className="border-slate-100 dark:border-slate-900 hover:bg-[#F4F5F7] dark:hover:bg-slate-900/20 transition-colors">
                  {/* Campaign Name */}
                  <TableCell className="font-bold text-xs py-1 pl-6 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    <Link 
                      to={`/campaigns/${c.id}`} 
                      className="text-[#172B4D] dark:text-slate-100 hover:text-[#0052CC] dark:hover:text-blue-400 transition-colors font-semibold"
                    >
                      {c.name}
                    </Link>
                  </TableCell>

                  {/* Status Indicators (No badge, colored text and dot) */}
                  <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      isCompleted ? 'text-[#626F86] dark:text-slate-400' :
                      isDraft ? 'text-amber-600 dark:text-amber-500' :
                      'text-emerald-600 dark:text-emerald-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        isCompleted ? 'bg-[#626F86]' :
                        isDraft ? 'bg-amber-500' : 'bg-emerald-500'
                      }`} />
                      {displayStatus}
                    </span>
                  </TableCell>

                  {/* Delivered Column (non-wrapping formatting) */}
                  <TableCell className="text-center font-medium text-xs text-[#172B4D] dark:text-slate-100 py-1 whitespace-nowrap border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {isDraft ? '--' : `${(c.sent_count || 0) > 0 ? '100.0' : '0.0'}% | ${(c.sent_count || 0).toLocaleString()}`}
                  </TableCell>

                  {/* Open Rate */}
                  <TableCell className="text-center text-xs text-[#172B4D] dark:text-slate-300 font-medium py-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {c.sent_count > 0 && !isDraft ? `${((c.opened_count / c.sent_count) * 100).toFixed(1)}% | ${(c.opened_count || 0).toLocaleString()}` : '--'}
                  </TableCell>

                  {/* Click Rate */}
                  <TableCell className="text-center text-xs text-[#172B4D] dark:text-slate-300 font-medium py-1 border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {c.sent_count > 0 && !isDraft ? `${((Number(c.total_clicks) / c.sent_count) * 100).toFixed(1)}% | ${(Number(c.total_clicks || 0)).toLocaleString()}` : '--'}
                  </TableCell>

                  {/* Last Modified Date */}
                  <TableCell className="text-[#626F86] dark:text-slate-400 text-xs py-1 whitespace-nowrap border-r border-slate-200 dark:border-slate-800 last:border-r-0">
                    {formatLastModified(c.updated_at || c.created_at)}
                  </TableCell>

                  {/* Actions Grid */}
                  <TableCell className="text-center py-1 pr-6 relative">
                    <div className="flex items-center justify-center gap-2">
                      {/* Refresh Metrics quick action */}
                      <button 
                        onClick={() => handleRefreshCampaign(c.id)} 
                        title="Refresh Metrics"
                        className="p-1 rounded text-[#626F86] hover:text-[#0052CC] dark:hover:text-[#0052CC] hover:bg-[#F4F5F7] dark:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <RotateCcw className={`h-4 w-4 ${refreshingId === c.id ? 'animate-spin text-[#0052CC]' : ''}`} />
                      </button>

                      {/* Edit or Analytics Icon depending on status */}
                      {status === 'draft' || status === 'scheduled' || status === 'pending' ? (
                        <Link 
                          to={`/campaigns/${c.id}/edit`} 
                          title="Edit Campaign"
                          className="p-1 rounded text-[#626F86] hover:text-[#0052CC] dark:hover:text-[#0052CC] hover:bg-[#F4F5F7] dark:hover:bg-slate-900 transition-colors cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                      ) : (
                        <Link 
                          to={`/campaigns/${c.id}`} 
                          title="View Analytics"
                          className="p-1 rounded text-[#626F86] hover:text-[#0052CC] dark:hover:text-[#0052CC] hover:bg-[#F4F5F7] dark:hover:bg-slate-900 transition-colors cursor-pointer"
                        >
                          <BarChart2 className="h-4 w-4" />
                        </Link>
                      )}

                      {/* Dropdown Toggle */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === c.id ? null : c.id);
                        }}
                        className="p-1 rounded text-[#626F86] hover:text-[#172B4D] dark:hover:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-slate-900 transition-colors cursor-pointer"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Popover Action Menu */}
                    {activeMenuId === c.id && (
                      <div 
                        ref={menuRef} 
                        className="absolute right-6 mt-1 w-44 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-1 duration-150 text-left"
                      >
                        <Link 
                          to={`/campaigns/${c.id}`}
                          onClick={() => setActiveMenuId(null)}
                          className="block px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium"
                        >
                          View Details
                        </Link>
                        <button 
                          onClick={() => handleDuplicate(c)}
                          className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium"
                        >
                          Duplicate Copy
                        </button>
                        {status === 'completed' && (
                          <button 
                            onClick={() => handleRescheduleCampaign(c)}
                            className="w-full text-left px-4 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 font-medium"
                          >
                            Reschedule Campaign
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(c.id, c.name)}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 font-medium border-t border-slate-100 dark:border-slate-800 mt-1"
                        >
                          Delete Campaign
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sortedCampaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-slate-400 dark:text-slate-500 text-sm">
                  No campaigns found.{' '}
                  <button 
                    onClick={() => {
                      if (!hasVerifiedDomain) {
                        setShowDomainRequiredModal(true);
                      } else {
                        navigate('/campaigns/new');
                      }
                    }} 
                    className="text-[#0052CC] dark:text-blue-400 font-bold hover:underline cursor-pointer bg-transparent border-none p-0 inline align-baseline"
                  >
                    Create one
                  </button>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Footer section showing pagination details */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-[#F4F5F7] dark:bg-slate-900/10">
          <div className="text-xs text-[#626F86] dark:text-slate-400">
            Showing <span className="font-semibold text-[#172B4D] dark:text-slate-200">{fromVal}</span> to{' '}
            <span className="font-semibold text-[#172B4D] dark:text-slate-200">{toVal}</span> of{' '}
            <span className="font-semibold text-[#172B4D] dark:text-slate-200">{totalVal}</span> entries
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center rounded-l-md text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(lastPage, prev + 1))}
              disabled={currentPage === lastPage}
              className="h-8 w-8 border-y border-r border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center rounded-r-md text-slate-700 dark:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-slate-700 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Send Quick Mail Dialog Modal */}
      {showQuickMailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-900 bg-[#F4F5F7] dark:bg-slate-900/20">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-[#626F86]" />
                <h3 className="font-bold text-[#172B4D] dark:text-slate-50">Send Quick Mail</h3>
              </div>
              <button 
                onClick={() => setShowQuickMailModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 hover:bg-[#F4F5F7] dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSendQuickMail} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#626F86] dark:text-slate-400">Recipient Email</label>
                <Input 
                  type="email" 
                  placeholder="recipient@example.com" 
                  required
                  value={quickMailEmail}
                  onChange={(e) => setQuickMailEmail(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#172B4D] focus:border-[#0052CC] focus:ring-[#0052CC]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#626F86] dark:text-slate-400">Subject</label>
                <Input 
                  type="text" 
                  placeholder="Hello from KYM Tracker!" 
                  required
                  value={quickMailSubject}
                  onChange={(e) => setQuickMailSubject(e.target.value)}
                  className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#172B4D] focus:border-[#0052CC] focus:ring-[#0052CC]/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#626F86] dark:text-slate-400">Body</label>
                <textarea
                  rows={4}
                  placeholder="Write your email body message here..."
                  required
                  value={quickMailBody}
                  onChange={(e) => setQuickMailBody(e.target.value)}
                  className="w-full text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-[#0052CC]/30 text-[#172B4D] dark:text-slate-100"
                />
              </div>

              {/* Modal Footer Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowQuickMailModal(false)}
                  className="border-[#626F86] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#626F86] dark:text-slate-350 rounded-none hover:bg-[#F4F5F7]"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={sendingQuickMail}
                  className="bg-[#0052CC] hover:bg-[#0043a4] text-white min-w-[100px] flex justify-center items-center gap-1.5 rounded-none font-bold shadow-sm"
                >
                  {sendingQuickMail ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Zap className="h-3.5 w-3.5 text-white" />
                      Send Mail
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Verify Domain Required Modal */}
      {showDomainRequiredModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/20">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                <ShieldAlert className="h-5 w-5" />
                <h3 className="font-bold text-[#172B4D] dark:text-slate-50">Verified Domain Required</h3>
              </div>
              <button 
                onClick={() => setShowDomainRequiredModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                You must configure and verify at least one sender domain in your organization before creating campaigns or sending quick emails.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-lg p-3 text-xs text-amber-700 dark:text-amber-400">
                Verifying a domain proves ownership and authorizes Know Your Mail to send relay emails securely.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-900 bg-slate-50 dark:bg-slate-900/20 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowDomainRequiredModal(false)}
                className="border-slate-350 dark:border-slate-800 text-slate-700 dark:text-slate-350"
              >
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  setShowDomainRequiredModal(false);
                  navigate('/settings?tab=domains');
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Configure Domain
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
