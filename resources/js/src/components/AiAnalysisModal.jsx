import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Activity, Loader2, CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { Button } from './ui/Button';
import api from '../lib/api';
import { cn } from '../lib/utils';

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
            ? "bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-900/30" 
            : "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-900/30"
        )}>
          {isSpam ? (
            <AlertTriangle className="w-12 h-12 text-red-500" />
          ) : (
            <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          )}
          <div>
            <h3 className={cn("text-xl font-bold", isSpam ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
              {isSpam ? 'High Spam Risk' : 'Looks Good!'}
            </h3>
            <p className={cn("text-sm", isSpam ? "text-red-600/80 dark:text-red-400/80" : "text-emerald-600/80 dark:text-emerald-400/80")}>
              Spam Score: {score}/100
            </p>
          </div>
        </div>

        {spamData.reasons && spamData.reasons.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Detected Issues</h4>
            <ul className="space-y-2">
              {spamData.reasons.map((reason, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderQualityScore = () => {
    if (!scoreData) return null;
    
    return (
      <div className="space-y-6 animate-in fade-in">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">Overall Quality</span>
            <span className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">{scoreData.score}/100</span>
          </div>
          <div className="p-5 bg-sky-50 dark:bg-sky-900/10 border border-sky-100 dark:border-sky-900/30 rounded-xl flex flex-col items-center justify-center text-center">
            <span className="text-xs font-semibold text-sky-600 dark:text-sky-400 uppercase tracking-wider mb-1">Readability</span>
            <span className="text-lg font-bold text-sky-700 dark:text-sky-300">{scoreData.readability?.grade_level || 'N/A'}</span>
            <span className="text-xs text-sky-600/70 dark:text-sky-400/70 mt-1">Score: {scoreData.readability?.score || 0}</span>
          </div>
        </div>

        {scoreData.suggestions && scoreData.suggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Improvement Suggestions</h4>
            <ul className="space-y-2">
              {scoreData.suggestions.map((sug, idx) => (
                <li key={idx} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                  <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <span>{sug}</span>
                </li>
              ))}
            </ul>
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

        <div className="p-6 overflow-y-auto min-h-[300px]">
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
        
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close Analysis</Button>
        </div>
      </div>
    </div>
  );
}
