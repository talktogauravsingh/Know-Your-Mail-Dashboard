import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Activity, Loader2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Button } from './ui/Button';
import api from '../lib/api';
import { cn } from '../lib/utils';
import FeatureGateLock from './ui/FeatureGateLock';

export function AiAnalysisModal({ isOpen, onClose, subject, content }) {
  const [activeTab, setActiveTab] = useState('spam'); // 'spam' or 'quality'
  
  const [isLoading, setIsLoading] = useState(false);
  const [spamData, setSpamData] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      runAnalysis();
    }
  }, [isOpen]);

  const runAnalysis = async () => {
    if (!subject && !content) {
      setError('Please provide a subject or content to analyze.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSpamData(null);
    setScoreData(null);
    
    try {
      const [spamResponse, scoreResponse] = await Promise.all([
        api.post('/v1/spam/check', { subject, content }),
        api.post('/v1/email/score', { subject, content })
      ]);
      
      setSpamData(spamResponse.data);
      setScoreData(scoreResponse.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to analyze copy.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const renderSpamStatus = () => {
    if (!spamData) return null;
    
    const isSpam = spamData.is_spam;
    const score = (spamData.spam_score * 100).toFixed(0);
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className={cn(
          "p-6 rounded-xl border flex flex-col items-center justify-center text-center space-y-3",
          isSpam 
            ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900/30 text-red-650"
            : "bg-emerald-50 border-emerald-250 dark:bg-emerald-950/20 dark:border-emerald-900/30 text-emerald-650"
        )}>
          <div className={cn(
            "p-3 rounded-full",
            isSpam ? "bg-red-100 text-red-600 dark:bg-red-900/40" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40"
          )}>
            {isSpam ? <AlertTriangle className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
          </div>
          <div>
            <h3 className="text-lg font-bold">
              {isSpam ? 'Spam Alert!' : 'Deliverability looks great!'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Spam score: {score}%
            </p>
          </div>
        </div>

        {spamData.reasons && spamData.reasons.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Potential Issues</h4>
            <div className="space-y-2">
              {spamData.reasons.map((r, i) => (
                <div key={i} className="flex gap-2.5 items-start p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-slate-650 dark:text-slate-400">{r}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderQualityScore = () => {
    if (!scoreData) return null;
    
    const score = scoreData.score || 0;
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50">Quality Score</h3>
            <p className="text-sm text-slate-500 mt-1">Based on copy clarity and engagement triggers.</p>
          </div>
          <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 w-16 h-16 rounded-full flex items-center justify-center border border-indigo-100 dark:border-indigo-900/30">
            {score}
          </div>
        </div>

        {scoreData.suggestions && scoreData.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Engagement Tips</h4>
            <div className="space-y-2">
              {scoreData.suggestions.map((s, i) => (
                <div key={i} className="flex gap-2.5 items-start p-3 bg-indigo-50/20 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/30 dark:border-indigo-900/20">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-xs font-medium text-indigo-950 dark:text-slate-400">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Analysis</h2>
              <p className="text-sm text-slate-500">Spam detection and quality scoring.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <FeatureGateLock feature="ai_generation" showRemaining={true}>
            <div className="flex border-b border-slate-100 dark:border-slate-800 px-5 pt-2">
              <button
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'spam' 
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" 
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
                onClick={() => setActiveTab('spam')}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> Spam Checker
                </div>
              </button>
              <button
                className={cn(
                  "px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  activeTab === 'quality' 
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400" 
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                )}
                onClick={() => setActiveTab('quality')}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Quality Score
                </div>
              </button>
            </div>

            <div className="p-6 min-h-[300px]">
              {error && (
                <div className="p-3 mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30">
                  {error}
                </div>
              )}

              {isLoading ? (
                <div className="h-full flex flex-col items-center justify-center space-y-4 pt-10">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Analyzing your content...</p>
                </div>
              ) : (
                <>
                  {activeTab === 'spam' && renderSpamStatus()}
                  {activeTab === 'quality' && renderQualityScore()}
                </>
              )}
            </div>
          </FeatureGateLock>
        </div>
        
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close Analysis</Button>
        </div>
      </div>
    </div>
  );
}
