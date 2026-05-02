import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/Card';
import { Button } from './ui/Button';
import { Input, Label } from './ui/Input';
import { Select } from './ui/Select';
import { Plus, Trash2, Users, AlertCircle, CheckCircle2, ChevronRight, Filter } from 'lucide-react';
import api from '../lib/api';
import { cn } from '../lib/utils';

export function SegmentationEngine({ campaignId, insights = [], onSegmentsChange, moduleType, moduleId, maxSegments = 3, isSingleMode = false }) {
  const [segments, setSegments] = useState([
    { id: 'default', name: 'Default Segment', isDefault: true, priority: 100, filters: [] }
  ]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState({});

  const addSegment = () => {
    if (segments.length >= maxSegments) return;
    
    const id = Math.random().toString(36).substr(2, 9);
    setSegments([...segments, { 
      id, 
      name: `Segment ${segments.length}`, 
      isDefault: false, 
      priority: segments.length, 
      filters: [{ field: '', operator: '=', value: '' }] 
    }]);
  };

  const removeSegment = (id) => {
    setSegments(segments.filter(s => s.id !== id));
  };

  const updateSegment = (id, updates) => {
    setSegments(segments.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const addFilter = (segmentId) => {
    setSegments(segments.map(s => s.id === segmentId ? { 
      ...s, 
      filters: [...s.filters, { field: '', operator: '=', value: '' }] 
    } : s));
  };

  const updateFilter = (segmentId, filterIndex, updates) => {
    setSegments(segments.map(s => {
      if (s.id === segmentId) {
        const newFilters = [...s.filters];
        newFilters[filterIndex] = { ...newFilters[filterIndex], ...updates };
        return { ...s, filters: newFilters };
      }
      return s;
    }));
  };

  const removeFilter = (segmentId, filterIndex) => {
    setSegments(segments.map(s => {
      if (s.id === segmentId) {
        const newFilters = s.filters.filter((_, i) => i !== filterIndex);
        return { ...s, filters: newFilters };
      }
      return s;
    }));
  };

  const fetchLiveCount = async (segment) => {
    if (segment.isDefault || segment.filters.length === 0 || !campaignId) return;
    
    // Only fetch if all filters have a field and value
    if (segment.filters.some(f => !f.field || !f.value)) return;

    setLoading(prev => ({ ...prev, [segment.id]: true }));
    try {
      const response = await api.post(`/campaigns/${campaignId}/segments/validate-count`, {
        module_type: moduleType,
        module_id: moduleId,
        groups: [{ filters: segment.filters.map(f => ({
          field_name: f.field,
          operator: f.operator,
          field_value: f.value
        })) }]
      });
      setCounts(prev => ({ ...prev, [segment.id]: response.data.count }));
    } catch (error) {
      console.error('Failed to fetch count', error);
    } finally {
      setLoading(prev => ({ ...prev, [segment.id]: false }));
    }
  };

  const [internalInsights, setInternalInsights] = useState([]);

  useEffect(() => {
    onSegmentsChange?.(segments);
  }, [segments]);

  // Fallback: fetch insights if not provided via props
  useEffect(() => {
    if (insights.length === 0) {
      const fetchInsights = async () => {
        try {
          let url = null;
          if (campaignId) {
            url = `/campaigns/${campaignId}/insights`;
          } else if (moduleType === 1) {
            url = `/insights/org`;
          }

          if (url) {
            const res = await api.get(url);
            if (res.data.insights) {
              setInternalInsights(res.data.insights);
            }
          }
        } catch (err) {
          console.error('Failed to fetch fallback insights', err);
        }
      };
      fetchInsights();
    }
  }, [campaignId, moduleType, insights.length]);

  const activeInsights = insights.length > 0 ? insights : internalInsights;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {!isSingleMode && (
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Multi-Variant Segmentation</h3>
            <p className="text-sm text-slate-500">Define rules to send different content to different groups.</p>
          </div>
          <Button 
            onClick={addSegment} 
            disabled={segments.length >= maxSegments}
            variant="outline" 
            className="gap-2 bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-400 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {segments.length >= maxSegments ? `Limit: ${maxSegments} Segments` : 'Add Segment'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {[...segments].sort((a, b) => a.priority - b.priority).map((segment, sIdx) => (
          <Card key={segment.id} className={cn(
            "overflow-hidden shadow-sm transition-all hover:shadow-md",
            isSingleMode ? "border-none shadow-none" : (segment.isDefault ? "border-l-4 border-l-slate-400" : "border-l-4 border-l-indigo-500")
          )}>
            {!isSingleMode && (
              <CardHeader className="py-4 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-md ${segment.isDefault ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-700'} dark:bg-indigo-900/30 dark:text-indigo-400`}>
                    <Users className="h-4 w-4" />
                  </div>
                  {segment.isDefault ? (
                    <CardTitle className="text-base">Fallback Segment (Remaining Users)</CardTitle>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={segment.name} 
                        onChange={(e) => updateSegment(segment.id, { name: e.target.value })}
                        className="h-8 w-48 font-semibold bg-transparent border-none focus-visible:ring-1 p-0 px-2"
                      />
                      <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Priority {segment.priority}</span>
                    </div>
                  )}
                </div>
                {!segment.isDefault && (
                  <Button variant="ghost" size="icon" onClick={() => removeSegment(segment.id)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            )}
            <CardContent className={isSingleMode ? "p-0" : "py-5"}>
              {segment.isDefault && !isSingleMode ? (
                <p className="text-sm text-slate-500 italic">This segment will receive the default variant if they don't match any other rules.</p>
              ) : (
                <div className="space-y-4">
                  {activeInsights.length === 0 ? (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <p className="text-sm text-amber-700 dark:text-amber-400">
                        Upload a CSV file first to see available filter fields (Gender, City, etc.)
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {segment.filters.map((filter, fIdx) => (
                      <div key={fIdx} className="flex items-center gap-2 animate-in fade-in zoom-in duration-200">
                        <Select 
                          value={filter.field} 
                          onChange={(e) => updateFilter(segment.id, fIdx, { field: e.target.value })}
                          onBlur={() => fetchLiveCount(segment)}
                          className="h-9 min-w-[140px]"
                        >
                          <option value="">Select Field</option>
                          {activeInsights.map(insight => (
                            <option key={insight.field_name} value={insight.field_name}>
                              {insight.field_name.charAt(0).toUpperCase() + insight.field_name.slice(1)}
                            </option>
                          ))}
                        </Select>
                        
                        <Select 
                          value={filter.operator} 
                          onChange={(e) => updateFilter(segment.id, fIdx, { operator: e.target.value })}
                          onBlur={() => fetchLiveCount(segment)}
                          className="h-9 w-32"
                        >
                          <option value="=">equals</option>
                          <option value="!=">not equals</option>
                          <option value="in">is one of</option>
                          <option value="contains">contains</option>
                          <option value="starts_with">starts with</option>
                        </Select>

                        {/* If it's a categorical field from insights, we could show a dropdown */}
                        <Input 
                          placeholder="Value..." 
                          value={filter.value}
                          onChange={(e) => updateFilter(segment.id, fIdx, { value: e.target.value })}
                          onBlur={() => fetchLiveCount(segment)}
                          className="h-9"
                        />

                        <Button variant="ghost" size="icon" onClick={() => removeFilter(segment.id, fIdx)} className="h-8 w-8 text-slate-400 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="ghost" size="sm" onClick={() => addFilter(segment.id)} className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1.5 h-8">
                        <Plus className="h-3.5 w-3.5" /> Add Condition
                      </Button>
                      
                      <div className="flex items-center gap-2">
                        {loading[segment.id] ? (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <div className="h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            Calculating...
                          </div>
                        ) : (
                          <div className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950/30 rounded text-xs font-semibold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            {counts[segment.id] ?? 0} Recipients
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
