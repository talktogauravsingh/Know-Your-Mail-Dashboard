import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Users, Filter, Plus, Save, Trash2 } from 'lucide-react';

export default function Audience() {
  const [conditions, setConditions] = useState([
    { id: 1, property: 'Last Clicked', operator: 'within', value: '30 days' }
  ]);

  const addCondition = () => {
    setConditions([...conditions, { id: Date.now(), property: 'Location', operator: 'is', value: 'US' }]);
  };

  const removeCondition = (id) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Audience Segments</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Build complex visual queries to target specific user subsets.</p>
        </div>
        <Button className="bg-[#234e44] hover:bg-emerald-700 text-white gap-2 shadow-sm">
          <Save className="h-4 w-4" />
          Save Segment
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Builder Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/20">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-emerald-500" />
                Query Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-50 mb-2">Include users who match <span className="text-emerald-600 dark:text-emerald-400 font-bold">ALL</span> of the following:</div>

              <div className="space-y-4 relative">
                {conditions.map((condition, idx) => (
                  <div key={condition.id} className="group flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50 transition-colors hover:border-emerald-300 dark:hover:border-emerald-700/50 relative">
                    {idx > 0 && (
                      <div className="absolute -top-4 left-6 w-px h-4 bg-slate-300 dark:bg-slate-700"></div>
                    )}
                    <Select className="w-full sm:w-[180px] bg-white dark:bg-slate-950" defaultValue={condition.property}>
                      <option value="Last Clicked">Last Clicked</option>
                      <option value="Location">Location</option>
                      <option value="LTV">Lifetime Value</option>
                      <option value="Device">Device Type</option>
                      <option value="Signup Date">Signup Date</option>
                    </Select>
                    <Select className="w-full sm:w-[140px] bg-white dark:bg-slate-950" defaultValue={condition.operator}>
                      <option value="within">is within</option>
                      <option value="is">is exactly</option>
                      <option value="greater">is greater than</option>
                      <option value="contains">contains</option>
                    </Select>
                    <Input className="w-full sm:w-[180px] bg-white dark:bg-slate-950" defaultValue={condition.value} />

                    <button onClick={() => removeCondition(condition.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-md sm:ml-auto">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Button type="button" variant="outline" onClick={addCondition} className="gap-2 border-dashed border-2 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-500 bg-white dark:bg-slate-950">
                  <Plus className="h-4 w-4" /> Add Condition
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Audience Preview Area */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/30 dark:bg-emerald-900/10">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Matched Audience</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="h-10 w-10 text-emerald-500 p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg" />
                <h3 className="text-4xl font-bold text-slate-900 dark:text-slate-50">14,290</h3>
              </div>
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mt-4">~22% of total subscribers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-900 dark:text-slate-50">Recent Saved Segments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-50">Active Users (30d)</span>
                  <Badge variant="secondary">14.2k</Badge>
                </div>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-50">High Value Customers</span>
                  <Badge variant="secondary">2.8k</Badge>
                </div>
              </div>
              <div className="p-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-900 dark:text-slate-50">Churn Risk (&gt;60d)</span>
                  <Badge variant="secondary">8.4k</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
