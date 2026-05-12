import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { User, Users, CreditCard, Globe, CheckCircle2, AlertCircle, Mail, Plus, Trash2, Server } from 'lucide-react';
import { useStore } from '../store/useStore';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('team');
  const [isAddingSmtp, setIsAddingSmtp] = useState(false);
  const [newSmtp, setNewSmtp] = useState({ provider: 'Custom SMTP', host: '', port: 587, encryption: 'tls', username: '', password: '', fromName: '', fromAddress: '' });
  const smtpConfigurations = useStore((state) => state.smtpConfigurations);
  const deleteSmtpConfiguration = useStore((state) => state.deleteSmtpConfiguration);
  const addSmtpConfiguration = useStore((state) => state.addSmtpConfiguration);

  const tabs = [
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'team', label: 'Team Management', icon: Users },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'integrations', label: 'Email Integrations', icon: Mail },
    { id: 'domains', label: 'Sender Domains', icon: Globe },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your team settings, billing, and sender configurations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Nav */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'team' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage who has access to this workspace.</CardDescription>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">Invite User</Button>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold dark:bg-indigo-900/50 dark:text-indigo-300">GS</div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">Gaurav Singh <Badge variant="secondary" className="ml-1 text-[10px] py-0">You</Badge></p>
                          <p className="text-xs text-slate-500">gaurav@emailtracker.io</p>
                        </div>
                      </div>
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none dark:bg-slate-800 dark:text-slate-300">Admin</Badge>
                    </div>
                    <div className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold dark:bg-slate-800 dark:text-slate-400">SM</div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-slate-50">Sarah Marketing</p>
                          <p className="text-xs text-slate-500">sarah@emailtracker.io</p>
                        </div>
                      </div>
                      <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none dark:bg-slate-800 dark:text-slate-300">Editor</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Current Plan: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Pro</span></span>
                    <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none">$99 / month</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-slate-700 dark:text-slate-300">Emails Sent This Month</span>
                      <span className="font-bold text-slate-900 dark:text-slate-50">45k / 100k</span>
                    </div>
                    <div className="w-full bg-white dark:bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-200 dark:border-slate-800">
                      <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 bg-white dark:bg-slate-950">Manage Subscription</Button>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Sender Domains</CardTitle>
                    <CardDescription>Authenticate your domains to improve deliverability.</CardDescription>
                  </div>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Globe className="w-4 h-4"/> Add Domain</Button>
                </CardHeader>
                <CardContent>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-50">emailtracker.io</p>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">Authenticated (DKIM, SPF, DMARC)</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Manage DNS</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50/50 dark:bg-slate-900/50">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500" />
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-slate-50">marketing-updates.com</p>
                          <p className="text-xs text-amber-600 dark:text-amber-400">Pending Verification - 2 records missing</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950">Verify Now</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/30 dark:bg-indigo-900/10">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    Managed Configurations
                  </CardTitle>
                  <CardDescription>Domain configurations provided by us. You can use these immediately without setup.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-slate-900 dark:text-slate-50">EmailTracker Shared IPs</p>
                      <p className="text-xs text-slate-500">High deliverability routing via emailtracker.io</p>
                    </div>
                    <Badge variant="success" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-none">Active</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Custom SMTP Credentials</CardTitle>
                    <CardDescription>Connect third-party providers like SendGrid, AWS SES, or Gmail.</CardDescription>
                  </div>
                  {!isAddingSmtp && (
                    <Button onClick={() => setIsAddingSmtp(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"><Plus className="w-4 h-4"/> Add Setup</Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isAddingSmtp ? (
                    <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-lg p-6 bg-slate-50 dark:bg-slate-900/50">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Provider</label>
                          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" value={newSmtp.provider} onChange={(e) => setNewSmtp({...newSmtp, provider: e.target.value})}>
                            <option value="Custom SMTP">Custom SMTP</option>
                            <option value="AWS SES">AWS SES</option>
                            <option value="SendGrid">SendGrid</option>
                            <option value="Gmail">Gmail</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Host / Endpoint URLs</label>
                          <Input value={newSmtp.host} onChange={(e) => setNewSmtp({...newSmtp, host: e.target.value})} placeholder="smtp.example.com" className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Port</label>
                          <Input type="number" value={newSmtp.port} onChange={(e) => setNewSmtp({...newSmtp, port: parseInt(e.target.value)})} className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Encryption</label>
                          <select className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500" value={newSmtp.encryption} onChange={(e) => setNewSmtp({...newSmtp, encryption: e.target.value})}>
                            <option value="">None</option>
                            <option value="tls">TLS</option>
                            <option value="ssl">SSL</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Username / API Key</label>
                          <Input value={newSmtp.username} onChange={(e) => setNewSmtp({...newSmtp, username: e.target.value})} className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Password / Secret</label>
                          <Input type="password" value={newSmtp.password} onChange={(e) => setNewSmtp({...newSmtp, password: e.target.value})} className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Sender Name</label>
                          <Input value={newSmtp.fromName} onChange={(e) => setNewSmtp({...newSmtp, fromName: e.target.value})} placeholder="Marketing Team" className="bg-white dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Sender Address</label>
                          <Input value={newSmtp.fromAddress} onChange={(e) => setNewSmtp({...newSmtp, fromAddress: e.target.value})} placeholder="hello@example.com" className="bg-white dark:bg-slate-950" />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
                        <Button variant="outline" onClick={() => setIsAddingSmtp(false)} className="bg-white dark:bg-slate-950">Cancel</Button>
                        <Button onClick={() => {
                          if (newSmtp.host && newSmtp.username) {
                            addSmtpConfiguration(newSmtp);
                            setIsAddingSmtp(false);
                            setNewSmtp({ provider: 'Custom SMTP', host: '', port: 587, encryption: 'tls', username: '', password: '', fromName: '', fromAddress: '' });
                          }
                        }} className="bg-indigo-600 hover:bg-indigo-700 text-white">Save Configuration</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
                      {smtpConfigurations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-slate-500">No custom SMTP configurations added yet.</div>
                      ) : (
                        smtpConfigurations.map((config, index) => (
                          <div key={config.id} className={`flex items-center justify-between p-4 bg-white dark:bg-slate-950 ${index !== smtpConfigurations.length - 1 ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}>
                            <div>
                              <p className="font-bold text-sm text-slate-900 dark:text-slate-50">{config.provider}</p>
                              <p className="text-xs text-slate-500">{config.fromAddress} ({config.host})</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => deleteSmtpConfiguration(config.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'profile' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Card>
               <CardHeader>
                 <CardTitle>My Profile</CardTitle>
                 <CardDescription>Update your personal information.</CardDescription>
               </CardHeader>
               <CardContent className="space-y-4">
                 <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Full Name</label>
                      <Input defaultValue="Gaurav Singh" className="dark:bg-slate-950" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-900 dark:text-slate-50">Email Address</label>
                      <Input defaultValue="gaurav@emailtracker.io" disabled className="dark:bg-slate-950" />
                    </div>
                 </div>
                 <Button className="mt-4 bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">Save Changes</Button>
               </CardContent>
             </Card>
           </div>
          )}
        </div>
      </div>
    </div>
  );
}
