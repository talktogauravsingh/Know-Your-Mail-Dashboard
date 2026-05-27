import React, { useState } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Label } from './ui/Input';
import { Select } from './ui/Select';
import api from '../lib/api';
import { cn } from '../lib/utils';

const TONES = ['Professional', 'Casual', 'Persuasive', 'Urgent', 'Friendly', 'Enthusiastic', 'Other'];
const GOALS = ['Newsletter', 'Product Launch', 'Fundraising', 'Sales Outreach', 'Event Invitation', 'Welcome Series', 'Other'];

export function AiGenerationModal({ isOpen, onClose, onApply }) {
  const [goalType, setGoalType] = useState('Newsletter');
  const [customGoal, setCustomGoal] = useState('');
  
  const [toneType, setToneType] = useState('Professional');
  const [customTone, setCustomTone] = useState('');

  const [audience, setAudience] = useState('');
  const [context, setContext] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const activeGoal = goalType === 'Other' ? customGoal : goalType;
  const activeTone = toneType === 'Other' ? customTone : toneType;

  const handleGenerate = async () => {
    if (!context) {
      setError('Context is required to generate email copy.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    try {
      const response = await api.post('/v1/email/generate', {
        goal: activeGoal,
        tone: activeTone,
        audience,
        context,
        variants: 2
      });
      setVariants(response.data.data || response.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Failed to generate copy.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">AI Copywriter</h2>
              <p className="text-sm text-slate-500">Generate high-converting subject lines and email content.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Goal</Label>
                <Select value={goalType} onChange={(e) => setGoalType(e.target.value)} className="bg-white dark:bg-slate-950">
                  {GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                </Select>
                {goalType === 'Other' && (
                  <Input 
                    placeholder="Describe your goal..." 
                    value={customGoal} 
                    onChange={e => setCustomGoal(e.target.value)} 
                    className="mt-2 bg-white dark:bg-slate-950" 
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Tone of Voice</Label>
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

              <div className="space-y-2">
                <Label>Target Audience (Optional)</Label>
                <Input 
                  placeholder="e.g., Existing customers, Marketing managers..." 
                  value={audience} 
                  onChange={e => setAudience(e.target.value)} 
                  className="bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-2">
                <Label>Context / Prompt <span className="text-red-500">*</span></Label>
                <textarea 
                  className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white dark:bg-slate-950 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 dark:border-slate-800"
                  placeholder="What is this email about? Describe your product, offer, or news..."
                  value={context}
                  onChange={e => setContext(e.target.value)}
                ></textarea>
              </div>

              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2" 
                onClick={handleGenerate}
                disabled={isGenerating || !context.trim()}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 overflow-y-auto">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50 mb-4">Generated Variants</h3>
              
              {!variants.length && !isGenerating && (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-3">
                  <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full">
                    <Sparkles className="w-8 h-8 text-slate-300" />
                  </div>
                  <p className="text-sm max-w-[200px]">Fill out the details on the left and hit generate.</p>
                </div>
              )}

              {isGenerating && (
                <div className="h-full flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Crafting perfect copy...</p>
                </div>
              )}

              {variants.length > 0 && !isGenerating && (
                <div className="space-y-6">
                  {variants.map((v, i) => {
                    const variantData = v.subject !== undefined ? v : (v.variants ? v.variants[0] : v); // Handle different response wrappers if any
                    const subject = variantData.subject || '';
                    const content = variantData.content || '';

                    return (
                      <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Option {i + 1}</span>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="text-xs h-7 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border-0"
                            onClick={() => onApply({ subject, content })}
                          >
                            Use Both
                          </Button>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-medium">Subject</span>
                            <button onClick={() => onApply({ subject })} className="text-[10px] text-indigo-600 hover:underline">Use Subject</button>
                          </div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-50">{subject}</p>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between items-end">
                            <span className="text-xs text-slate-500 font-medium">Body</span>
                            <button onClick={() => onApply({ content })} className="text-[10px] text-indigo-600 hover:underline">Use Body</button>
                          </div>
                          <div className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950 rounded border border-slate-100 dark:border-slate-800">
                            {content}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
