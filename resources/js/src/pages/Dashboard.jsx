import React, { useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useStore } from '../store/useStore';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Clock, Loader2, Plus, Filter, MoreVertical } from 'lucide-react';
import { cn } from "@/lib/utils";

const COLORS = ['#10b981', '#234e44', '#ff7a59', '#fef3c7']; // Updated to new brand colors

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
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <Loader2 className="h-10 w-10 animate-spin text-[#10b981]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-[1200px] mx-auto pb-20 relative font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[28px] font-bold tracking-tight text-[#234e44]">Dashboard</h2>
          <p className="text-slate-600 text-[15px] mt-1 font-medium">Welcome, Let's dive into your personalized setup guide.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#234e44] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#133224] transition-colors shadow-sm">
          <Plus className="h-4 w-4" />
          Create campaigns
        </button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-none">
            <p className="text-sm font-medium text-slate-500 mb-2 truncate">{kpi.name}</p>
            <div className="flex items-baseline gap-2">
              <h4 className="text-[24px] font-bold text-[#234e44] tracking-tight">{kpi.value}</h4>
            </div>
            <div className="mt-2">
              <span className={cn("inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold", 
                kpi?.trend === 'up' 
                  ? (kpi?.name?.includes('Bounce') || kpi?.name?.includes('Unsubscribe') ? "bg-red-50 text-red-500" : "bg-[#eef6f0] text-[#10b981]") 
                  : (kpi?.name?.includes('Bounce') || kpi?.name?.includes('Unsubscribe') ? "bg-[#eef6f0] text-[#10b981]" : "bg-red-50 text-red-500")
              )}>
                {kpi.trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />} {kpi.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Insights - Static for now */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-[#eef6f0] border-none shadow-sm rounded-2xl p-6 flex items-center gap-4">
          <div className="rounded-xl bg-white shadow-sm p-3 text-[#10b981]">
             <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#234e44]/70">Best Open Time</p>
            <p className="text-2xl font-black text-[#234e44]">10:00 AM</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-[#234e44]">Open Rate Trend</h3>
            <button className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
              <Filter className="h-4 w-4" />
            </button>
          </div>
          <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={openRateTrendData.length > 0 ? openRateTrendData : [{date: 'Mon', openRate: 0}]} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgb(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="openRate" stroke="#10b981" strokeWidth={4} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="flex flex-col gap-6 lg:col-span-3">
          <div className="flex-1 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h3 className="text-lg font-bold text-[#234e44] mb-4">Top Campaigns by Clicks</h3>
            <div className="h-[120px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={clickPerformanceData.length > 0 ? clickPerformanceData : [{name: 'No data', clicks: 0}]} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} stroke="#64748b" fontSize={12} width={80} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgb(0,0,0,0.1)' }} />
                  <Bar dataKey="clicks" fill="#234e44" radius={[0, 8, 8, 0]} barSize={20}>
                    {clickPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="flex-1 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6">
            <h3 className="text-lg font-bold text-[#234e44] mb-4">Device Distribution</h3>
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
          </div>
        </div>
      </div>
    </div>
  );
}
