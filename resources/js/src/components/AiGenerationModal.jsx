import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, Check } from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Label } from './ui/Input';
import { Select } from './ui/Select';
import api from '../lib/api';
import { cn } from '../lib/utils';
import FeatureGateLock from './ui/FeatureGateLock';
import { useStore } from '../store/useStore';

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
  const [thread, setThread] = useState([]);
  const [error, setError] = useState('');

  const [activeMode, setActiveMode] = useState('guided'); // 'guided' or 'custom'
  const [customPrompt, setCustomPrompt] = useState('');
  const [charLimit, setCharLimit] = useState('');
  const [improvementPrompt, setImprovementPrompt] = useState('');

  const typingIntervalRef = useRef(null);
  const targetTextRef = useRef({ subject: '', content: '' });
  const streamFinishedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const activeGoal = goalType === 'Other' ? customGoal : goalType;
  const activeTone = toneType === 'Other' ? customTone : toneType;

  const handleGenerate = async (overridePrompt, keepThread = false, isRegenerate = false) => {
    const promptText = (overridePrompt && typeof overridePrompt === 'string') 
      ? overridePrompt 
      : (activeMode === 'custom' ? customPrompt : context);
    if (!promptText) {
      setError(activeMode === 'custom' ? 'Prompt is required to generate email copy.' : 'Context is required to generate email copy.');
      return;
    }
    
    setIsGenerating(true);
    setError('');
    
    if (keepThread) {
      if (isRegenerate) {
        setThread(prev => {
          const copy = [...prev];
          if (copy.length > 0 && copy[copy.length - 1].role === 'assistant') {
            copy[copy.length - 1] = { role: 'assistant', subject: '', content: '' };
          }
          return copy;
        });
      } else {
        const cleanUserPrompt = overridePrompt.includes('\n\n[Improvement Request:') 
          ? overridePrompt.split('\n\n[Improvement Request:')[1].replace(']', '') 
          : overridePrompt;
        setThread(prev => [
          ...prev,
          { role: 'user', content: cleanUserPrompt },
          { role: 'assistant', subject: '', content: '' }
        ]);
      }
    } else {
      setThread([
        { role: 'user', content: promptText },
        { role: 'assistant', subject: '', content: '' }
      ]);
    }

    streamFinishedRef.current = false;
    targetTextRef.current = { subject: '', content: '' };
    
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    
    try {
      const token = useStore.getState().token;
      const response = await fetch('/api/v1/email/generate-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          goal: activeMode === 'custom' ? 'Custom' : activeGoal,
          tone: activeMode === 'custom' ? 'Custom' : activeTone,
          audience: activeMode === 'custom' ? 'Custom' : audience,
          context: promptText,
          variants: 1,
          char_limit: charLimit ? parseInt(charLimit, 10) : null
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to generate copy.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      
      setIsGenerating(false);

      // Start the word-by-word typewriter loop
      typingIntervalRef.current = setInterval(() => {
        const target = targetTextRef.current;
        const isFinished = streamFinishedRef.current;
        
        setThread(prev => {
          if (prev.length === 0) return prev;
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          const item = { ...copy[lastIdx] };
          if (item.role !== 'assistant') return prev;
          
          let updated = false;
          
          // Type subject character-by-character
          if (item.subject.length < target.subject.length) {
            item.subject += target.subject[item.subject.length];
            updated = true;
          } 
          // Once subject is fully typed, type content word-by-word
          else if (item.content.length < target.content.length) {
            const currentLen = item.content.length;
            const remaining = target.content.slice(currentLen);
            const spaceIdx = remaining.indexOf(' ');
            
            if (spaceIdx === -1) {
              if (isFinished) {
                item.content = target.content;
                updated = true;
              }
            } else {
              item.content += remaining.slice(0, spaceIdx + 1);
              updated = true;
            }
          }
          
          if (updated) {
            copy[lastIdx] = item;
            return copy;
          }
          
          if (isFinished && item.subject.length >= target.subject.length && item.content.length >= target.content.length) {
            clearInterval(typingIntervalRef.current);
          }
          
          return prev;
        });
      }, 70);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        buffer = lines.pop();
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          
          try {
            const message = JSON.parse(trimmed);
            if (message.type === 'meta') {
              // meta parsed
            } else if (message.type === 'variant_start') {
              targetTextRef.current.subject = message.subject;
            } else if (message.type === 'content') {
              targetTextRef.current.content += message.delta;
            } else if (message.type === 'variant_end') {
              // Flush complete content into thread immediately so handleImprove can read it
              const fullSubject = targetTextRef.current.subject;
              const fullContent = targetTextRef.current.content;
              setThread(prev => {
                if (prev.length === 0) return prev;
                const copy = [...prev];
                const lastIdx = copy.length - 1;
                if (copy[lastIdx].role === 'assistant') {
                  copy[lastIdx] = { ...copy[lastIdx], subject: fullSubject, content: fullContent };
                }
                return copy;
              });
            }
          } catch (e) {
            console.error('Error parsing stream line:', e, trimmed);
          }
        }
      }
      
      streamFinishedRef.current = true;
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to generate copy.');
      setIsGenerating(false);
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
      }
    }
  };

  const handleImprove = async (instruction) => {
    if (!instruction) return;
    const basePrompt = activeMode === 'custom' ? customPrompt : context;

    // Find the last generated email so the AI can improve it specifically
    const lastAssistant = [...thread].reverse().find(m => m.role === 'assistant');
    const prevSubject = lastAssistant?.subject || targetTextRef.current?.subject || '';
    const prevContent = lastAssistant?.content || targetTextRef.current?.content || '';

    // Build combined prompt: original brief + previous email + improvement instruction
    let combinedPrompt;
    if (prevSubject || prevContent) {
      combinedPrompt = `${basePrompt}\n\n[Previous Email - Subject: ${prevSubject}]\n${prevContent}\n\n[Improvement Request: ${instruction}]`;
    } else {
      combinedPrompt = `${basePrompt}\n\n[Improvement Request: ${instruction}]`;
    }

    if (activeMode === 'custom') {
      setCustomPrompt(combinedPrompt);
    } else {
      setContext(combinedPrompt);
    }
    await handleGenerate(combinedPrompt, true, false);
    setImprovementPrompt('');
  };

  const handleRegenerate = async () => {
    const currentPrompt = activeMode === 'custom' ? customPrompt : context;
    await handleGenerate(currentPrompt, true, true);
  };

  const hasResults = thread.length > 0 || isGenerating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={cn(
        "bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full flex flex-col border border-slate-200 dark:border-slate-800 transition-all duration-500 ease-out",
        hasResults ? "max-w-5xl" : "max-w-3xl"
      )}>
        
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

        <div className="p-6 overflow-y-auto flex-1">
          <FeatureGateLock feature="ai_generation" showRemaining={true}>
            <div className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-900/30">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  {/* Mode Segment Selector */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                    <button 
                      type="button"
                      onClick={() => setActiveMode('guided')}
                      className={cn(
                        "flex-1 text-xs py-1.5 font-bold rounded-md transition-all",
                        activeMode === 'guided' 
                          ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      )}
                    >
                      Guided Form
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveMode('custom')}
                      className={cn(
                        "flex-1 text-xs py-1.5 font-bold rounded-md transition-all",
                        activeMode === 'custom' 
                          ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-white shadow-sm" 
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                      )}
                    >
                      ChatGPT Mode
                    </button>
                  </div>

                  {activeMode === 'guided' ? (
                    <>
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
                        <Label>What is your campaign about?</Label>
                        <textarea 
                          placeholder="e.g., An invitation to our annual product launch event on June 15th, offering a 20% early bird discount..." 
                          value={context} 
                          onChange={e => setContext(e.target.value)} 
                          className="w-full h-32 text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <Label>Describe what you want to write</Label>
                      <textarea 
                        placeholder="e.g., Write a funky email to genz kids regarding sales of shoes..." 
                        value={customPrompt} 
                        onChange={e => setCustomPrompt(e.target.value)} 
                        className="w-full h-72 text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400 resize-none"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Character Limit (Optional)</Label>
                    <Input 
                      type="number" 
                      placeholder="e.g. 100, 300" 
                      value={charLimit} 
                      onChange={e => setCharLimit(e.target.value)} 
                      min="50"
                      max="5000"
                      className="bg-white dark:bg-slate-950" 
                    />
                  </div>

                  <Button 
                    onClick={handleGenerate} 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white animate-all duration-300"
                    isLoading={isGenerating}
                  >
                    <Sparkles className="w-4 h-4 mr-2" /> Generate Copy
                  </Button>
                </div>

                <div className="border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/30 p-4 min-h-[300px] flex flex-col transition-all duration-350 overflow-hidden">
                  {thread.length === 0 && !isGenerating && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 space-y-3 flex-1">
                      <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full">
                        <Sparkles className="w-8 h-8 text-slate-300" />
                      </div>
                      <p className="text-sm max-w-[200px]">Fill out the details on the left and hit generate.</p>
                    </div>
                  )}

                  {isGenerating && thread.length === 0 && (
                    <div className="h-full flex flex-col justify-start space-y-6 flex-1 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-24"></div>
                        <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded-lg w-20"></div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-12"></div>
                        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
                      </div>

                      <div className="space-y-2">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-8"></div>
                        <div className="h-40 bg-slate-200 dark:bg-slate-700 rounded-lg w-full"></div>
                      </div>
                    </div>
                  )}

                  {thread.length > 0 && (
                    <div className="space-y-6 overflow-y-auto max-h-[60vh] pr-2 flex-1 flex flex-col pb-4">
                      {thread.map((msg, i) => {
                        if (msg.role === 'user') {
                          return (
                            <div key={i} className="flex justify-end animate-in slide-in-from-bottom duration-300 my-2">
                              <div className="bg-indigo-600 text-white rounded-2xl px-4 py-2 text-sm max-w-[85%] shadow-sm font-medium">
                                {msg.content}
                              </div>
                            </div>
                          );
                        }

                        const subject = msg.subject || '';
                        const content = msg.content || '';
                        const isLastAssistant = i === thread.length - 1;

                        if (isGenerating && isLastAssistant && !subject && !content) {
                          return (
                            <div key={i} className="h-48 flex items-center justify-center animate-pulse">
                              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mr-2" />
                              <span className="text-sm text-slate-400">AI is thinking...</span>
                            </div>
                          );
                        }

                        return (
                          <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 animate-in slide-in-from-bottom duration-300">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Copywriter</span>
                              <div className="flex gap-2">
                                {isLastAssistant && (
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="text-xs h-7 px-3 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-750 border-0"
                                    onClick={handleRegenerate}
                                  >
                                    Regenerate
                                  </Button>
                                )}
                                <Button 
                                  variant="secondary" 
                                  size="sm" 
                                  className="text-xs h-7 px-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 border-0"
                                  onClick={() => onApply({ subject, content })}
                                >
                                  Use Both
                                </Button>
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <div className="flex justify-between items-end">
                                <span className="text-xs text-slate-500 font-medium">Subject</span>
                                <button onClick={() => onApply({ subject })} className="text-[10px] text-indigo-600 hover:underline">Use Subject</button>
                              </div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{subject}</p>
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

                            {isLastAssistant && (
                              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
                                <Input 
                                  placeholder="Ask AI to improve this copy (e.g. 'slightly casual and use slangs')..." 
                                  value={improvementPrompt} 
                                  onChange={e => setImprovementPrompt(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleImprove(improvementPrompt);
                                    }
                                  }}
                                  className="text-xs h-8 bg-slate-50 dark:bg-slate-950 flex-1 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500"
                                />
                                <Button 
                                  size="sm" 
                                  onClick={() => handleImprove(improvementPrompt)}
                                  className="text-xs h-8 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                  Improve
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </FeatureGateLock>
        </div>
      </div>
    </div>
  );
}
