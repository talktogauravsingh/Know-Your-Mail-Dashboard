import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { 
  Sparkles, 
  Plus, 
  Play, 
  Pause, 
  Trash2, 
  Edit3, 
  Mail, 
  MousePointerClick, 
  Eye, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Activity
} from 'lucide-react';

export default function Automations() {
  const { 
    automations, 
    automationsLoading, 
    fetchAutomations, 
    toggleAutomation, 
    deleteAutomation 
  } = useStore();

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm('Are you sure you want to delete this automation?')) {
      await deleteAutomation(id);
    }
  };

  const handleToggle = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    await toggleAutomation(id);
  };

  // Aggregate stats
  const totalRuns = automations.reduce((acc, curr) => acc + (curr.stats?.total || 0), 0);
  const activeCount = automations.filter(a => a.status === 'active').length;
  const draftCount = automations.filter(a => a.status === 'draft').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
            Trigger Automations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automate targeted follow-up messages based on recipient email interaction.
          </p>
        </div>
        <Link
          to="/automations/new"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Automation
        </Link>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-800/50 dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Total Rules</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{automations.length}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-800/50 dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Active Flows</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{activeCount}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-800/50 dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <HelpCircle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Drafts / Paused</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{draftCount + (automations.length - activeCount - draftCount)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 dark:border-slate-800/50 dark:bg-slate-900 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold block">Total Mails Triggered</span>
            <span className="text-2xl font-black text-slate-800 dark:text-slate-100">{totalRuns}</span>
          </div>
        </div>
      </div>

      {/* Main List Section */}
      {automationsLoading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/50">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-slate-400 mt-4 font-semibold text-sm">Loading automations...</span>
        </div>
      ) : automations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800/50 shadow-sm text-center">
          <div className="h-16 w-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6">
            <Sparkles className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50">No Automations Configured</h3>
          <p className="text-slate-400 dark:text-slate-500 mt-2 max-w-md text-sm">
            Setting up trigger rules allows you to send secondary follow-up templates immediately as prospects open or click links.
          </p>
          <Link
            to="/automations/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 text-sm font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            Build Your First Flow
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {automations.map((automation) => (
            <Link
              key={automation.id}
              to={`/automations/${automation.uuid || automation.id}`}
              className="group block rounded-2xl border border-slate-200/60 bg-white dark:border-slate-800/50 dark:bg-slate-900 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                {/* Header info */}
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 group-hover:text-blue-500 transition-colors">
                      {automation.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Target Campaign:</span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {automation.campaign?.name || 'Unknown Campaign'}
                      </span>
                    </div>
                  </div>

                  {/* Status toggle & switch */}
                  <button
                    onClick={(e) => handleToggle(automation.id, e)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                      automation.status === 'active' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : automation.status === 'paused'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {automation.status === 'active' ? (
                      <>
                        <Play className="h-3 w-3 fill-emerald-600 dark:fill-emerald-400 stroke-0" />
                        Active
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 fill-amber-600 dark:fill-amber-400 stroke-0" />
                        {automation.status === 'paused' ? 'Paused' : 'Draft'}
                      </>
                    )}
                  </button>
                </div>

                {/* Event type & Action description */}
                <div className="rounded-xl bg-slate-50 dark:bg-slate-850 p-3.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      {automation.trigger_event === 'click' ? (
                        <MousePointerClick className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">On Email Event</span>
                      <span className="font-semibold text-slate-850 dark:text-slate-200">
                        {automation.trigger_event === 'click' ? 'Link Clicked' : 'Email Opened'}
                      </span>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-slate-400" />

                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block uppercase tracking-wider">Then Send template</span>
                      <span className="font-semibold text-slate-850 dark:text-slate-200 max-w-[140px] truncate block">
                        {automation.template?.template_name || 'Generic follow-up'}
                      </span>
                    </div>
                    <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <Mail className="h-4 w-4" />
                    </div>
                  </div>
                </div>

                {/* Analytics log indicators */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 font-medium">Triggered: </span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{automation.stats?.total || 0}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Success: </span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{automation.stats?.success || 0}</span>
                    </div>
                    {automation.stats?.failed > 0 && (
                      <div>
                        <span className="text-slate-400 font-medium">Failed: </span>
                        <span className="font-bold text-red-500">{automation.stats?.failed}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/automations/${automation.uuid || automation.id}`}
                      className="p-2 text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                      title="Edit Flow"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={(e) => handleDelete(automation.id, e)}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
