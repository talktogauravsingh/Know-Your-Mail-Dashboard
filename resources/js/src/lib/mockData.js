export const dashboardKPIs = [
  { name: 'Total Emails Sent', value: '124,592', change: '+14%', trend: 'up' },
  { name: 'Delivery Rate', value: '98.2%', change: '+0.4%', trend: 'up' },
  { name: 'Open Rate', value: '38.4%', change: '+2.1%', trend: 'up' },
  { name: 'Click Rate (CTR)', value: '12.8%', change: '-0.3%', trend: 'down' },
  { name: 'Bounce Rate', value: '1.2%', change: '-0.1%', trend: 'down' },
  { name: 'Unsubscribe', value: '0.4%', change: '+0.1%', trend: 'up' },
];

export const openRateTrendData = [
  { date: 'Mon', openRate: 32 },
  { date: 'Tue', openRate: 36 },
  { date: 'Wed', openRate: 39 },
  { date: 'Thu', openRate: 42 },
  { date: 'Fri', openRate: 38 },
  { date: 'Sat', openRate: 25 },
  { date: 'Sun', openRate: 28 },
];

export const clickPerformanceData = [
  { name: 'Promo A', clicks: 4200 },
  { name: 'Update B', clicks: 3100 },
  { name: 'Newsletter', clicks: 8900 },
  { name: 'Alerts', clicks: 1200 },
];

export const deviceDistributionData = [
  { name: 'Mobile', value: 65 },
  { name: 'Desktop', value: 30 },
  { name: 'Tablet', value: 5 },
];

export const mockCampaigns = [
  { id: '1', name: 'Summer Sale 2026', status: 'Completed', sent: 45000, openRate: '42.1%', clickRate: '15.4%', date: '2026-03-20' },
  { id: '2', name: 'March Newsletter', status: 'Sent', sent: 32100, openRate: '38.5%', clickRate: '11.2%', date: '2026-03-25' },
  { id: '3', name: 'Product Update v2', status: 'Draft', sent: 0, openRate: '-', clickRate: '-', date: '2026-03-27' },
  { id: '4', name: 'Welcome Series Auto', status: 'Sent', sent: 1250, openRate: '55.2%', clickRate: '22.1%', date: '2026-03-27' },
  { id: '5', name: 'Re-engagement Q1', status: 'Completed', sent: 8500, openRate: '21.0%', clickRate: '4.5%', date: '2026-02-15' },
];

export const mockTemplates = [
  { id: 't1', name: 'SaaS Welcome Series', category: 'Onboarding', avgOpenRate: '54%', description: 'Best for 1st-day signups. High conversion layout focused on product value.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { id: 't2', name: 'Monthly Newsletter', category: 'Newsletter', avgOpenRate: '32%', description: 'Clean text-heavy layout for company updates and blog summaries.', color: 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' },
  { id: 't3', name: 'Flash Sale Promo', category: 'Promotion', avgOpenRate: '48%', description: 'Urgency-driven design with big CTA buttons and countdown placeholder.', color: 'bg-amber-50 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
  { id: 't4', name: 'Feature Announcement', category: 'Product', avgOpenRate: '41%', description: 'Highlight new features with screenshot placeholders and bullet points.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
  { id: 't5', name: 'Churn Win-back', category: 'Retention', avgOpenRate: '22%', description: 'Personalized plain-text feel to re-engage users who are slipping away.', color: 'bg-rose-50 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
  { id: 't6', name: 'Webinar Invite', category: 'Event', avgOpenRate: '38%', description: 'Structured layout with calendar links, speaker bios, and RSVP buttons.', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
];
