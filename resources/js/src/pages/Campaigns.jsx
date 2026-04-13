import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/Table';
import { Badge } from '../components/ui/Badge';
import { Plus, Search, Filter, Loader2 } from 'lucide-react';

export default function Campaigns() {
  const [searchTerm, setSearchTerm] = useState('');
  const { campaigns, campaignsLoading, fetchCampaigns } = useStore();

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const filteredCampaigns = campaigns.filter(c => 
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (campaignsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Campaigns</h2>
          <p className="text-slate-500 dark:text-slate-400">Manage and track your email marketing campaigns.</p>
        </div>
        <Link to="/campaigns/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search campaigns..." 
            className="pl-9 bg-white dark:bg-slate-950" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="w-full sm:w-auto gap-2 text-slate-600 dark:text-slate-300">
          <Filter className="h-4 w-4" />
          More Filters
        </Button>
      </div>

      <div className="rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
            <TableRow className="border-slate-200 dark:border-slate-800">
              <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Campaign Name</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Status</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Sent</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Open Rate</TableHead>
              <TableHead className="font-semibold text-slate-900 dark:text-slate-200">Click Rate</TableHead>
              <TableHead className="text-right font-semibold text-slate-900 dark:text-slate-200">Date Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCampaigns.map((campaign) => (
              <TableRow key={campaign.id} className="cursor-pointer group border-slate-200 dark:border-slate-800">
                <TableCell className="font-medium">
                  <Link to={`/campaigns/${campaign.id}`} className="group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors block p-2 -m-2">
                    {campaign.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={
                    campaign.status === 'completed' ? 'success' :
                    campaign.status === 'sent' ? 'default' : 'secondary'
                  }>
                    {campaign.status?.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">{campaign.sent_count || 0}</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">-</TableCell>
                <TableCell className="text-slate-600 dark:text-slate-400">-</TableCell>
                <TableCell className="text-right text-slate-500 dark:text-slate-400">
                  {campaign.created_at ? new Date(campaign.created_at).toLocaleDateString() : '-'}
                </TableCell>
              </TableRow>
            ))}
            {filteredCampaigns.length === 0 && !campaignsLoading && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No campaigns found. <Link to="/campaigns/new" className="text-indigo-600 hover:underline">Create one</Link>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
