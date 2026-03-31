import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { dashboardKPIs, openRateTrendData, clickPerformanceData, deviceDistributionData } from '../lib/mockData';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, Smartphone, MapPin } from 'lucide-react';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6'];

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard Overview</h2>
        <p className="text-slate-500 dark:text-slate-400">Here's what's happening with your campaigns today.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {dashboardKPIs.map((kpi) => (
          <Card key={kpi.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{kpi.value}</div>
              <p className="flex items-center text-xs mt-1">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={kpi.trend === 'up' ? (kpi.name.includes('Bounce') || kpi.name.includes('Unsubscribe') ? "text-red-500" : "text-emerald-500") : (kpi.name.includes('Bounce') || kpi.name.includes('Unsubscribe') ? "text-emerald-500" : "text-red-500")}>
                  {kpi.change}
                </span>
                <span className="ml-1 text-slate-500 dark:text-slate-400">from last month</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/40">
          <CardContent className="flex items-center p-6 gap-4">
            <div className="rounded-full bg-indigo-100 p-3 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
               <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Best Open Time</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">10:30 AM</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tuesdays peak</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/40">
          <CardContent className="flex items-center p-6 gap-4">
            <div className="rounded-full bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400">
               <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Top Device</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">Mobile</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">65% of opens</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/40">
          <CardContent className="flex items-center p-6 gap-4">
            <div className="rounded-full bg-pink-100 p-3 text-pink-600 dark:bg-pink-900/50 dark:text-pink-400">
               <MapPin className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-pink-600 dark:text-pink-400">Most Engaged</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-50">New York, US</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">42% open rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 border-slate-200">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Open Rate Trend</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={openRateTrendData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#0f172a' }}
                  />
                  <Line type="monotone" dataKey="openRate" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle>Top Campaigns by Clicks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[120px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clickPerformanceData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke="#64748b" fontSize={12} width={80} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16}>
                      {clickPerformanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle>Device Distribution</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="h-[120px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {deviceDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 ml-4">
                  {deviceDistributionData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center text-xs">
                      <div className="w-3 h-3 rounded-sm mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 dark:text-slate-400">{entry.name} ({entry.value}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
