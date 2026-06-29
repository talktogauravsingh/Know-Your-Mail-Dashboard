import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import FeatureGateLock from '../components/ui/FeatureGateLock';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import {
  ArrowLeft,
  Download,
  MousePointerClick,
  MailOpen,
  UserX,
  AlertCircle,
  Send,
  Globe,
  Smartphone,
  MousePointer2,
  Loader2,
  Laptop,
  Eye,
  CheckCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6'];

// Custom Tooltip Renderers to avoid dark-theme text contrast / black patch issues in Recharts
const OpensTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}>
        <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500' }}>{`Time: ${label}`}</p>
        <p style={{ color: '#ec4899', margin: 0, fontSize: '12px', fontWeight: '700' }}>{`Opens: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const LinkClicksTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const url = payload[0].payload.url || '';
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)', maxWidth: '280px', wordBreak: 'break-all' }}>
        <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500' }} title={url}>{`Link: ${displayUrl}`}</p>
        <p style={{ color: '#818cf8', margin: 0, fontSize: '12px', fontWeight: '700' }}>{`Clicks: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const RegionTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}>
        <p style={{ color: '#94a3b8', margin: '0 0 4px 0', fontSize: '11px', fontWeight: '500' }}>{`Region: ${payload[0].name}`}</p>
        <p style={{ color: '#818cf8', margin: 0, fontSize: '12px', fontWeight: '700' }}>{`Opens: ${payload[0].value}`}</p>
      </div>
    );
  }
  return null;
};

const ClientTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', padding: '10px', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)' }}>
        <p style={{ color: '#ffffff', margin: 0, fontSize: '12px', fontWeight: '700' }}>
          {`${payload[0].name}: ${payload[0].value}`}
        </p>
      </div>
    );
  }
  return null;
};

export default function CampaignAnalytics() {
  const { id } = useParams();
  const { currentCampaign, isLoading, fetchCampaignDetail } = useStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCampaignDetail(id);
  }, [id, fetchCampaignDetail]);

  if (isLoading || !currentCampaign) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Loading campaign analysis...</p>
        </div>
      </div>
    );
  }

  const {
    campaign,
    summary,
    rates,
    hourlyOpens,
    regionBreakdown,
    deviceBreakdown = [],
    browserBreakdown = [],
    recipients = [],
    linkPerformance = []
  } = currentCampaign;

  const filteredRecipients = recipients.filter(r =>
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute percentages for breakdowns
  const totalDevices = deviceBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
  const deviceData = deviceBreakdown.map(d => ({
    ...d,
    percentage: Math.round((d.value / totalDevices) * 100)
  }));

  const totalBrowsers = browserBreakdown.reduce((sum, item) => sum + item.value, 0) || 1;
  const browserData = browserBreakdown.map(b => ({
    ...b,
    percentage: Math.round((b.value / totalBrowsers) * 100)
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-4">
          <Link to="/campaigns">
            <Button variant="outline" size="icon" className="rounded-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">{campaign.name}</h2>
              <Badge variant={campaign.status === 'Completed' ? 'success' : 'secondary'}>{campaign.status}</Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sent on {campaign.created_at}</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800">
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* Tabs and Content Wrapper */}
      <FeatureGateLock feature="advanced_analytics">
        {/* Tabs Menu */}
        <div className="flex space-x-1 rounded-xl bg-slate-100 dark:bg-slate-900/60 p-1 w-fit border border-slate-200/50 dark:border-slate-800/20">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'insights', label: 'Client Insights' },
            { id: 'recipients', label: 'Recipients' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-800 dark:text-slate-50 border border-slate-200/20 dark:border-slate-700/20'
                  : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Summary Cards */}
          <div className="grid gap-4 grid-cols-2 lg:grid-cols-6">

            {/* Sent */}
            <Card className="bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/10">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-indigo-100">
                  <p className="font-semibold text-xs uppercase tracking-wider">Sent</p>
                  <Send className="h-4 w-4 text-indigo-200" />
                </div>
                <h3 className="text-3xl font-extrabold mt-4">{summary.sent.toLocaleString()}</h3>
                <span className="text-[10px] text-indigo-200 mt-1">Total Recipients</span>
              </CardContent>
            </Card>

            {/* Delivered */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-950">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-xs uppercase tracking-wider">Delivered</p>
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <h3 className="text-3xl font-extrabold mt-4 text-slate-950 dark:text-slate-50">{summary.delivered.toLocaleString()}</h3>
                <span className="text-xs font-semibold text-emerald-500 mt-1">{rates.delivery}% rate</span>
              </CardContent>
            </Card>

            {/* Opened */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-950">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-xs uppercase tracking-wider">Opened</p>
                  <MailOpen className="h-4 w-4 text-pink-500" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50">{summary.opened.toLocaleString()}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">unique</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-1">
                    <span>Total: {summary.opened_total.toLocaleString()}</span>
                    <span className="font-bold text-emerald-500">{rates.open}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clicked */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 shadow-sm bg-white dark:bg-slate-950">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <p className="font-semibold text-xs uppercase tracking-wider">Clicked</p>
                  <MousePointerClick className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="mt-2">
                  <div className="flex items-baseline gap-1.5">
                    <h3 className="text-3xl font-extrabold text-slate-950 dark:text-slate-50">{summary.clicked.toLocaleString()}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">unique</span>
                  </div>
                  <div className="flex justify-between items-center mt-1 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-900 pt-1">
                    <span>Total: {summary.clicked_total.toLocaleString()}</span>
                    <span className="font-bold text-indigo-500">{rates.click}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bounced */}
            <Card className="border-red-100 bg-red-50/20 dark:border-red-950/20 dark:bg-red-950/5">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-red-600 dark:text-red-400">
                  <p className="font-semibold text-xs uppercase tracking-wider">Bounced</p>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <h3 className="text-3xl font-extrabold mt-4 text-slate-950 dark:text-slate-50">{summary.bounced.toLocaleString()}</h3>
                <span className="text-xs font-semibold text-red-500 mt-1">{rates.bounce}% bounce rate</span>
              </CardContent>
            </Card>

            {/* Unsubscribed */}
            <Card className="border-amber-100 bg-amber-50/20 dark:border-amber-950/20 dark:bg-amber-950/5">
              <CardContent className="p-5 flex flex-col justify-between h-full min-h-[120px]">
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-500">
                  <p className="font-semibold text-xs uppercase tracking-wider">Unsubscribed</p>
                  <UserX className="h-4 w-4" />
                </div>
                <h3 className="text-3xl font-extrabold mt-4 text-slate-950 dark:text-slate-50">{summary.unsubscribed.toLocaleString()}</h3>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 mt-1">{rates.unsubscribe}% unsub rate</span>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">

            {/* Open Timeline (Past to Present Area Chart) */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Opens Timeline</CardTitle>
                <CardDescription className="text-xs">Chronological email open distribution (past to present).</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  {hourlyOpens.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyOpens} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorOpens" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ec4899" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-900" />
                        <XAxis
                          dataKey="time"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<OpensTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="opens"
                          stroke="#ec4899"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorOpens)"
                          dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                      No opens recorded yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Link Performance (Horizontal Bar Chart) */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-50">Link Click Performance</CardTitle>
                <CardDescription className="text-xs">Clicks per call-to-action link included in variants.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  {linkPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={linkPerformance} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" className="dark:stroke-slate-900" />
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis
                          dataKey="url"
                          type="category"
                          stroke="#94a3b8"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          width={90}
                          tickFormatter={(url) => {
                            const clean = url.replace(/https?:\/\/(www\.)?/, '');
                            return clean.length > 15 ? clean.substring(0, 12) + '...' : clean;
                          }}
                        />
                        <Tooltip content={<LinkClicksTooltip />} />
                        <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                          {linkPerformance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                      No link clicks recorded yet.
                    </div>
                  )}
                </div>

                {/* Clean detail list */}
                <div className="mt-4 space-y-2 max-h-[100px] overflow-y-auto">
                  {linkPerformance.map((link, i) => {
                    const totalClicksCount = summary.clicked_total || 1;
                    const percentage = Math.round((link.clicks / totalClicksCount) * 100);
                    return (
                      <div key={link.url} className="flex justify-between items-center py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/30">
                        <div className="flex items-center gap-2 truncate pr-4">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
                            {link.url}
                          </a>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[10px] text-slate-400">{percentage}%</span>
                          <span className="font-semibold text-xs text-slate-950 dark:text-slate-50">{link.clicks.toLocaleString()} clicks</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Client Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">

            {/* Geographic Opens */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold"><Globe className="h-5 w-5 text-indigo-500" /> Geographic Breakdown</CardTitle>
                <CardDescription className="text-xs">Top regions where recipients interact with campaign emails.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[280px] w-full">
                  {regionBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={regionBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-900" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip content={<RegionTooltip />} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-400 text-sm">
                      No location data available yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Browser & Device Distributions */}
            <Card className="border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base font-bold"><Smartphone className="h-5 w-5 text-purple-500" /> Client Environment Profiles</CardTitle>
                <CardDescription className="text-xs">Email user agent details (OS, Browsers, Devices).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">

                {browserData.length > 0 || deviceData.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Browser Donut */}
                    <div className="flex flex-col items-center border-r border-slate-100 dark:border-slate-900 pr-2">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Browser Client</p>
                      <div className="h-[140px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={browserData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={55}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {browserData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<ClientTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-1.5 mt-2">
                        {browserData.slice(0, 3).map((entry, index) => (
                          <div key={entry.name} className="flex items-center text-[11px] justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                              <span className="truncate text-slate-600 dark:text-slate-400">{entry.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{entry.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Device Donut */}
                    <div className="flex flex-col items-center">
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Device Type</p>
                      <div className="h-[140px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={deviceData}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={55}
                              paddingAngle={2}
                              dataKey="value"
                            >
                              {deviceData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<ClientTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-1.5 mt-2">
                        {deviceData.slice(0, 3).map((entry, index) => (
                          <div key={entry.name} className="flex items-center text-[11px] justify-between">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[(index + 3) % COLORS.length] }}></span>
                              <span className="truncate text-slate-600 dark:text-slate-400">{entry.name}</span>
                            </div>
                            <span className="font-semibold text-slate-900 dark:text-slate-50">{entry.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[200px] items-center justify-center text-slate-400 text-sm">
                    No client tracking profiles available.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Recipients Tab */}
      {activeTab === 'recipients' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center justify-between">
            <Input
              className="max-w-xs bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              placeholder="Search by email or status..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-x-auto shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Email Address</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Unsubscribed</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Activity Status</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Opens</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Clicks</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Location</TableHead>
                  <TableHead className="font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Client Environment</TableHead>
                  <TableHead className="text-right font-extrabold text-slate-900 dark:text-slate-200 h-11 uppercase text-[11px] tracking-wider">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id} className="border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                    <TableCell className="font-medium text-slate-900 dark:text-slate-100">{recipient.email}</TableCell>
                    <TableCell>
                      {recipient.unsubscribed ? (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 dark:bg-red-400 animate-pulse"></span> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs">
                          No
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        recipient.unsubscribed ? 'text-red-600 dark:text-red-400' :
                        recipient.status === 'Clicked' ? 'text-emerald-600 dark:text-emerald-500' :
                        recipient.status === 'Opened' ? 'text-[#0052CC] dark:text-blue-400' :
                        recipient.status === 'Bounced' ? 'text-red-600 dark:text-red-400' :
                        'text-[#626F86] dark:text-slate-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          recipient.unsubscribed ? 'bg-red-500' :
                          recipient.status === 'Clicked' ? 'bg-emerald-500' :
                          recipient.status === 'Opened' ? 'bg-[#0052CC] dark:bg-blue-400' :
                          recipient.status === 'Bounced' ? 'bg-red-500' :
                          'bg-[#626F86]'
                        }`} />
                        {recipient.unsubscribed ? 'Unsubscribed' : recipient.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{recipient.openCount}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400 font-medium">{recipient.clickCount}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{recipient.location}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">
                      {recipient.device !== 'Unknown' || recipient.browser !== 'Unknown' ? (
                        <span className="inline-flex items-center gap-1 text-xs text-slate-700 dark:text-slate-350">
                          {recipient.device === 'Mobile' ? (
                            <Smartphone className="h-3 w-3 text-purple-400" />
                          ) : (
                            <Laptop className="h-3 w-3 text-indigo-400" />
                          )}
                          {recipient.device} ({recipient.browser})
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-slate-500 dark:text-slate-400 text-xs">{recipient.lastActivity}</TableCell>
                  </TableRow>
                ))}
                {filteredRecipients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-slate-400 dark:text-slate-500 text-sm">
                      No recipients found matching search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
      </FeatureGateLock>
    </div>
  );
}
