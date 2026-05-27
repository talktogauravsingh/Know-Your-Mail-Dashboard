import React, { useState, useEffect } from 'react';
import { X, Wand2, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Label } from './ui/Input';
import { Select } from './ui/Select';
import api from '../lib/api';

const TONES = ['Professional', 'Casual', 'Persuasive', 'Urgent', 'Friendly', 'Enthusiastic', 'Other'];

export function AiRewriteModal({ isOpen, onClose, onApply, initialContent }) {
  const [toneType, setToneType] = useState('Professional');
  const [customTone, setCustomTone] = useState('');
  const [correctGrammar, setCorrectGrammar] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  // Reset when opening with new content
  useEffect(() => {
    if (isOpen) {
      setResult('');
      setError('');
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  const activeTone = toneType === 'Other' ? customTone : toneType;

  const handleRewrite = async () => {
    if (!initialContent) {
      setError('No content provided to rewrite.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await api.post('/v1/email/rewrite', {
        content: initialContent,
        tone: activeTone,
        correct_grammar: correctGrammar
      });
      setResult(response.data.rewritten_content || response.data.content || '');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to rewrite copy.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg text-purple-600 dark:text-purple-400">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Rewrite</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Tone</Label>
              <Select value={toneType} onChange={(e) => setToneType(e.target.value)} className="bg-white dark:bg-slate-950">
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </Select>
              {toneType === 'Other' && (
                <Input 
                  placeholder="e.g., Professional yet witty..." 
                  value={customTone} 
                  onChange={e => setCustomTone(e.target.value)} 
                  className="mt-2 bg-white dark:bg-slate-950" 
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="correctGrammar" 
                checked={correctGrammar}
                onChange={e => setCorrectGrammar(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-600 dark:border-slate-700 dark:bg-slate-900 dark:checked:bg-purple-600"
              />
              <Label htmlFor="correctGrammar" className="text-sm cursor-pointer">Auto-correct grammar & spelling</Label>
            </div>
          </div>

          <Button 
            className="w-full bg-purple-600 hover:bg-purple-700 text-white gap-2" 
            onClick={handleRewrite}
            disabled={isGenerating || !initialContent?.trim()}
          >
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {isGenerating ? 'Rewriting...' : 'Rewrite Content'}
          </Button>

          {result && (
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Rewritten Result</Label>
                <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap max-h-48 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800">
                  {result}
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setResult('')}>Cancel</Button>
                <Button className="bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900" onClick={() => onApply(result)}>
                  Replace Content
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
