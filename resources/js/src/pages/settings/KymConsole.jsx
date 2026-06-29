import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  RotateCcw, 
  Pause, 
  Play, 
  Sparkles, 
  Save, 
  Check, 
  AlertTriangle,
  Database,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Eye,
  ArrowRightLeft
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import api from '../../lib/api';

export default function KymConsole() {
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState([]);
  const [plans, setPlans] = useState([]);
  const [features, setFeatures] = useState([]);
  
  // Stepper state
  const [step, setStep] = useState(1);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  
  // Proposed configurations
  const [proposedPlanKey, setProposedPlanKey] = useState('');
  const [proposedStatus, setProposedStatus] = useState(''); // 'active' or 'paused'
  const [proposedCredits, setProposedCredits] = useState({}); // { featureKey: creditsBalance }

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchConsoleData();
  }, []);

  const fetchConsoleData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/kym/organizations');
      setOrganizations(response.data.organizations || []);
      setPlans(response.data.plans || []);
      setFeatures(response.data.features || []);
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load root console metadata.');
    } finally {
      setLoading(false);
    }
  };

  const selectedOrg = organizations.find(o => String(o.id) === String(selectedOrgId));

  // Initialize draft settings when selectedOrg is picked
  useEffect(() => {
    if (selectedOrg) {
      setProposedPlanKey(selectedOrg.plan_key || 'free');
      setProposedStatus(selectedOrg.subscription_status || 'active');
      
      const creditsMap = {};
      features.forEach(f => {
        const cred = (selectedOrg.credits || []).find(c => c.feature_key === f.key);
        creditsMap[f.key] = cred ? String(cred.credits_balance) : '0';
      });
      setProposedCredits(creditsMap);
    }
  }, [selectedOrgId, features]);

  const handleSubmit = async () => {
    if (!selectedOrgId) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const formattedCredits = Object.keys(proposedCredits).map(key => ({
      feature_key: key,
      credits_balance: parseInt(proposedCredits[key] || '0', 10)
    }));

    try {
      const response = await api.post(`/admin/kym/organizations/${selectedOrgId}/update`, {
        plan_key: proposedPlanKey,
        status: proposedStatus,
        credits: formattedCredits
      });
      setSuccessMsg(response.data.message);
      await fetchConsoleData();
      setStep(1);
      setSelectedOrgId('');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update organization configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrgs = organizations.filter(org => org.id);

  if (loading && organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <RotateCcw className="w-8 h-8 text-indigo-500 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading root console details...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-xl mx-auto">
      {/* Root Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 p-6 rounded-2xl flex items-center justify-between gap-4 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-550/20 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight">TEAM KYM Admin Console</h2>
            <p className="text-xs text-indigo-200/85 mt-1">Directly adjust plan tiers, subscription statuses, and feature credit balances.</p>
          </div>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-200">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400 rounded-xl flex items-center gap-3 text-sm animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Stepper indicators */}
      <div className="flex items-center justify-between px-4">
        {[
          { num: 1, label: 'Select Org', icon: Building2 },
          { num: 2, label: 'Plan & Status', icon: Sliders },
          { num: 3, label: 'Credits', icon: Database },
          { num: 4, label: 'Preview', icon: Eye }
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center space-y-1.5 z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                step === s.num 
                  ? 'bg-indigo-650 border-indigo-650 text-white shadow-lg ring-4 ring-indigo-500/10'
                  : step > s.num 
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400'
              }`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-bold tracking-tight uppercase ${
                step === s.num ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-450 dark:text-slate-500'
              }`}>{s.label}</span>
            </div>
            {idx < 3 && (
              <div className={`flex-1 h-0.5 mx-1 transition-all duration-300 ${
                step > s.num ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Stepper Card */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden bg-white dark:bg-slate-900">
        <CardContent className="p-6">

          {/* STEP 1: Select Organization */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Target Workspace</label>
                <p className="text-xs text-slate-500">Choose the organization profile to modify.</p>
              </div>

              <select
                value={selectedOrgId}
                onChange={e => setSelectedOrgId(e.target.value)}
                className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-250 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose an Organization --</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} (Plan: {org.plan_key.toUpperCase()}, Status: {org.subscription_status.toUpperCase()})
                  </option>
                ))}
              </select>

              {selectedOrg && (
                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-slate-700 dark:text-slate-350">Workspace Status Overview:</div>
                  <div className="grid grid-cols-2 gap-2 text-slate-650 dark:text-slate-400">
                    <div>Plan: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrg.plan_key.toUpperCase()}</span></div>
                    <div>Status: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedOrg.subscription_status.toUpperCase()}</span></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Plan & Status Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Plan Tier</label>
                  <p className="text-xs text-slate-500">Select the plan category for this organization.</p>
                </div>
                <select
                  value={proposedPlanKey}
                  onChange={e => setProposedPlanKey(e.target.value)}
                  className="w-full rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 p-3 text-sm text-slate-800 dark:text-slate-250 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="free">Free</option>
                  {plans.map(p => (
                    <option key={p.key} value={p.key}>{p.name}</option>
                  ))}
                </select>
              </div>

              {proposedPlanKey !== 'free' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Subscription Status</label>
                    <p className="text-xs text-slate-500">Set active or paused execution state.</p>
                  </div>
                  <div className="flex gap-4">
                    {['active', 'paused'].map(status => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setProposedStatus(status)}
                        className={`flex-1 py-3 px-4 rounded-xl border text-sm font-semibold capitalize transition-all duration-200 ${
                          proposedStatus === status 
                            ? 'border-indigo-600 bg-indigo-550/10 text-indigo-700 dark:text-indigo-300' 
                            : 'border-slate-200 hover:bg-slate-50 dark:border-slate-800'
                        }`}
                      >
                        {status === 'paused' ? 'Paused' : 'Active'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Modify Credits */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Modify Feature Credits</label>
                <p className="text-xs text-slate-500">Overwrite specific numeric quotas assigned to the workspace.</p>
              </div>

              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {features.map(feat => (
                  <div key={feat.key} className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate">{feat.name}</div>
                      <div className="text-[10px] text-slate-450 uppercase font-mono">{feat.key}</div>
                    </div>
                    <Input
                      type="number"
                      min="0"
                      value={proposedCredits[feat.key] ?? '0'}
                      onChange={e => setProposedCredits(prev => ({
                        ...prev,
                        [feat.key]: e.target.value
                      }))}
                      className="text-xs py-1 h-8 px-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded w-24 text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4: Preview Changes */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-350">Confirm Configurations</label>
                <p className="text-xs text-slate-500">Review the changes to apply for <span className="font-bold text-indigo-500">{selectedOrg?.name}</span>.</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 space-y-4">
                
                {/* Plan change */}
                {selectedOrg?.plan_key !== proposedPlanKey && (
                  <div className="flex items-center justify-between text-xs border-b border-slate-200/50 dark:border-slate-800 pb-3">
                    <span className="font-bold text-slate-550 dark:text-slate-400">Subscription Plan:</span>
                    <div className="flex items-center gap-2 font-mono">
                      <Badge variant="outline">{selectedOrg?.plan_key.toUpperCase()}</Badge>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      <Badge variant="default" className="bg-indigo-600">{proposedPlanKey.toUpperCase()}</Badge>
                    </div>
                  </div>
                )}

                {/* Status change */}
                {selectedOrg?.subscription_status !== proposedStatus && proposedPlanKey !== 'free' && (
                  <div className="flex items-center justify-between text-xs border-b border-slate-200/50 dark:border-slate-800 pb-3">
                    <span className="font-bold text-slate-550 dark:text-slate-400">Subscription Status:</span>
                    <div className="flex items-center gap-2 font-mono">
                      <Badge variant="outline">{selectedOrg?.subscription_status.toUpperCase()}</Badge>
                      <ArrowRightLeft className="w-3.5 h-3.5 text-slate-400" />
                      <Badge variant="default" className="bg-amber-600">{proposedStatus.toUpperCase()}</Badge>
                    </div>
                  </div>
                )}

                {/* Credits change */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-550 dark:text-slate-400 block">Credit Ledger Diffs:</span>
                  <div className="space-y-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                    {features.map(f => {
                      const oldBalance = (selectedOrg?.credits || []).find(c => c.feature_key === f.key)?.credits_balance ?? 0;
                      const newBalance = parseInt(proposedCredits[f.key] || '0', 10);
                      
                      if (oldBalance !== newBalance) {
                        return (
                          <div key={f.key} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500 font-medium">{f.name}:</span>
                            <span className="font-mono text-slate-800 dark:text-slate-200">
                              {oldBalance} ➔ <span className="font-bold text-indigo-600 dark:text-indigo-400">{newBalance}</span>
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {Object.keys(proposedCredits).every(key => {
                      const old = (selectedOrg?.credits || []).find(c => c.feature_key === key)?.credits_balance ?? 0;
                      return old === parseInt(proposedCredits[key] || '0', 10);
                    }) && (
                      <span className="text-xs text-slate-400 italic">No credit balance changes.</span>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

        </CardContent>

        <CardFooter className="bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-100 dark:border-slate-800/80 px-6 py-4 flex justify-between">
          <Button
            variant="outline"
            disabled={step === 1 || submitting}
            onClick={() => setStep(prev => prev - 1)}
            className="gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>

          {step < 4 ? (
            <Button
              disabled={step === 1 && !selectedOrgId}
              onClick={() => setStep(prev => prev + 1)}
              className="gap-1.5 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              disabled={submitting}
              onClick={handleSubmit}
              className="gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-750 text-white"
            >
              {submitting ? 'Applying...' : 'Confirm & Save Changes'} <Save className="w-3.5 h-3.5" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
