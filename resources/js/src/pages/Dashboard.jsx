import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, Smartphone, MapPin, Loader2 } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']; // KnowYourEmail Theme

const defaultKPIs = [
  { name: 'Total Emails Sent', value: '0', change: '+0%', trend: 'up' },
  { name: 'Delivery Rate', value: '0%', change: '0%', trend: 'up' },
  { name: 'Open Rate', value: '0%', change: '0%', trend: 'up' },
  { name: 'Click Rate (CTR)', value: '0%', change: '0%', trend: 'down' },
  { name: 'Bounce Rate', value: '0%', change: '0%', trend: 'down' },
  { name: 'Unsubscribe', value: '0%', change: '0%', trend: 'up' },
];

export default function Dashboard() {
  const { dashboardData, dashboardLoading, fetchDashboard } = useStore();

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = dashboardData?.kpis || defaultKPIs;
  const openRateTrendData = dashboardData?.openRateTrend || [];
  const clickPerformanceData = dashboardData?.topCampaigns || [];
  const deviceDistributionData = dashboardData?.devices || [];

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard Overview</h2>
        <p className="text-slate-500 dark:text-slate-400">Real-time campaign performance metrics.</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">{kpi.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{kpi.value}</div>
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold ml-1", kpi.trend === 'up' ? (kpi.name.includes('Bounce') || kpi.name.includes('Unsubscribe') ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400") : (kpi.name.includes('Bounce') || kpi.name.includes('Unsubscribe') ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"))}>
                  {kpi.trend === 'up' ? '↑' : '↓'} {kpi.change}
                </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Insights - Static for now */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100/50 dark:border-blue-900/30">
          <CardContent className="flex items-center p-6 gap-4">
            <div className="rounded-[16px] bg-white shadow-sm p-3 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
               <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600/80 dark:text-blue-400/80">Best Open Time</p>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-50">10:00 AM</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Open Rate Trend</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={openRateTrendData.length > 0 ? openRateTrendData : [{date: 'Mon', openRate: 0}]} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                  <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="openRate" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
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
                  <BarChart data={clickPerformanceData.length > 0 ? clickPerformanceData : [{name: 'No data', clicks: 0}]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke="#64748b" fontSize={12} width={80} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="clicks" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={20}>
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
                      data={deviceDistributionData.length > 0 ? deviceDistributionData : [{name: 'No data', value: 100}]}
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
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
