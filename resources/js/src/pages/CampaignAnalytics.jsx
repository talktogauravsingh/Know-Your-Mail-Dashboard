import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Input } from '../components/ui/Input';
import { ArrowLeft, Download, MousePointerClick, MailOpen, UserX, AlertCircle, Send, Globe, Smartphone, MousePointer2, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#14b8a6', '#f59e0b'];

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
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const { campaign, summary, rates, hourlyOpens, regionBreakdown, recipients, linkPerformance } = currentCampaign;

  const filteredRecipients = recipients.filter(r => 
    r.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    r.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/campaigns">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">{campaign.name}</h2>
              <Badge variant={campaign.status === 'Completed' ? 'success' : 'secondary'}>{campaign.status}</Badge>
            </div>
            <p className="text-slate-500 dark:text-slate-400">Sent on {campaign.created_at}</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-lg bg-slate-100 dark:bg-slate-800/50 p-1 w-fit">
        {['overview', 'user-insights', 'recipients'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
              activeTab === tab 
                ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-50' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Settings for Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="bg-emerald-600 border-emerald-500 text-white shadow-md">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                   <p className="text-emerald-100 font-medium text-sm">Sent</p>
                   <Send className="h-5 w-5 text-emerald-200" />
                </div>
                <h3 className="text-3xl font-bold">{summary.sent.toLocaleString()}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4 text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-sm text-slate-500">Delivered</p>
                  <MailOpen className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{summary.delivered.toLocaleString()}</h3>
                <p className="text-sm font-medium text-emerald-500 mt-1">{rates.delivery}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4 text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-sm text-slate-500">Opened</p>
                  <MousePointerClick className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{summary.opened.toLocaleString()}</h3>
                <p className="text-sm font-medium text-emerald-500 mt-1">{rates.open}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4 text-slate-500 dark:text-slate-400">
                  <p className="font-medium text-sm text-slate-500">Clicked</p>
                  <MousePointer2 className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{summary.clicked.toLocaleString()}</h3>
                <p className="text-sm font-medium text-emerald-500 mt-1">{rates.click}%</p>
              </CardContent>
            </Card>
            <Card className="border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4 text-red-500">
                  <p className="font-medium text-sm text-red-500">Bounced</p>
                  <AlertCircle className="h-5 w-5" />
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-50">{summary.bounced.toLocaleString()}</h3>
                <p className="text-sm font-medium text-slate-500 mt-1">{rates.bounce}%</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Open Tracking (First 10 hours)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={hourlyOpens}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="time" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Line type="monotone" dataKey="opens" stroke="#ec4899" strokeWidth={3} dot={{ r: 4, fill: '#ec4899', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Link Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={linkPerformance} layout="vertical" margin={{ left: -20, right: 30 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="url" type="category" hide />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                        formatter={(value) => [`${value} clicks`, 'Clicks']}
                        labelFormatter={(url) => url}
                      />
                      <Bar dataKey="clicks" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24}>
                        {linkPerformance.map((entry, index) => (
                           <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 text-sm text-slate-500">
                  {linkPerformance.map((link, i) => (
                    <div key={link.url} className="flex justify-between items-center py-1">
                      <div className="flex items-center gap-2 truncate pr-4">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                        <span className="truncate">{link.url.replace('https://', '')}</span>
                      </div>
                      <span className="font-medium text-slate-900 dark:text-slate-50">{link.clicks.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* User Insights Tab */}
      {activeTab === 'user-insights' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5 text-emerald-500" /> Geographic Opens</CardTitle>
                <CardDescription>Top locations where recipients opened emails.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={regionBreakdown}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5 text-emerald-500" /> Browser Distribution</CardTitle>
                <CardDescription>Email clients used by the recipients.</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <div className="h-[250px] w-[50%]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={browserData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {browserData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3 w-[50%]">
                  {browserData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center text-sm">
                      <div className="w-3 h-3 rounded-sm mr-3" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-slate-600 dark:text-slate-400 flex-1">{entry.name}</span>
                      <span className="font-semibold text-slate-900 dark:text-slate-50">{entry.value}%</span>
                    </div>
                  ))}
                </div>
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
              className="max-w-xs bg-white dark:bg-slate-950" 
              placeholder="Search by email or status..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                <TableRow className="border-slate-200 dark:border-slate-800">
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Email Address</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Status</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Opens</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Clicks</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Location</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Device/Browser</TableHead>
                  <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-200">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((recipient) => (
                  <TableRow key={recipient.id} className="border-slate-200 dark:border-slate-800">
                    <TableCell className="font-medium">{recipient.email}</TableCell>
                    <TableCell>
                      <Badge variant={
                        recipient.status === 'Clicked' ? 'success' :
                        recipient.status === 'Opened' ? 'default' :
                        recipient.status === 'Bounced' ? 'destructive' : 'secondary'
                      }>
                        {recipient.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{recipient.openCount}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{recipient.clickCount}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{recipient.location}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-400">{recipient.device}</TableCell>
                    <TableCell className="text-right text-slate-500 dark:text-slate-400">{recipient.lastActivity}</TableCell>
                  </TableRow>
                ))}
                {filteredRecipients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      No recipients found matching description.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
