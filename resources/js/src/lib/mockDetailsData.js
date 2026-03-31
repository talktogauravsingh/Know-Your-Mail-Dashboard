export const campaignSummary = {
  sent: 45000,
  delivered: 44200,
  opened: 18600,
  clicked: 6800,
  bounced: 800,
};

export const hourlyOpensData = [
  { time: '08:00', opens: 120 },
  { time: '09:00', opens: 450 },
  { time: '10:00', opens: 1200 },
  { time: '11:00', opens: 900 },
  { time: '12:00', opens: 600 },
  { time: '13:00', opens: 550 },
  { time: '14:00', opens: 800 },
  { time: '15:00', opens: 1100 },
  { time: '16:00', opens: 750 },
  { time: '17:00', opens: 400 },
];

export const browserData = [
  { name: 'Chrome', value: 45 },
  { name: 'Safari', value: 35 },
  { name: 'Firefox', value: 10 },
  { name: 'Edge', value: 8 },
  { name: 'Other', value: 2 },
];

export const locationData = [
  { name: 'United States', value: 4500 },
  { name: 'United Kingdom', value: 2100 },
  { name: 'Canada', value: 1800 },
  { name: 'Australia', value: 1200 },
  { name: 'Germany', value: 900 },
];

export const linkPerformanceData = [
  { url: 'https://example.com/promo', clicks: 4200 },
  { url: 'https://example.com/products/shoes', clicks: 1800 },
  { url: 'https://example.com/about-us', clicks: 500 },
  { url: 'https://example.com/unsubscribe', clicks: 300 },
];

export const recipientList = [
  { id: 1, email: 'john.doe@example.com', status: 'Clicked', openCount: 3, clickCount: 1, lastActivity: '10 mins ago', location: 'New York, US', device: 'Mobile - Safari' },
  { id: 2, email: 'sarah.m@company.com', status: 'Opened', openCount: 1, clickCount: 0, lastActivity: '1 hour ago', location: 'London, UK', device: 'Desktop - Chrome' },
  { id: 3, email: 'mike.w@startup.io', status: 'Bounced', openCount: 0, clickCount: 0, lastActivity: '-', location: '-', device: '-' },
  { id: 4, email: 'emily.r@gmail.com', status: 'Clicked', openCount: 5, clickCount: 2, lastActivity: '2 hours ago', location: 'Sydney, AU', device: 'Mobile - Chrome' },
  { id: 5, email: 'david.c@enterprise.com', status: 'Delivered', openCount: 0, clickCount: 0, lastActivity: '-', location: '-', device: '-' },
  { id: 6, email: 'lisa.p@agency.co', status: 'Opened', openCount: 2, clickCount: 0, lastActivity: '4 hours ago', location: 'Toronto, CA', device: 'Desktop - Edge' },
  { id: 7, email: 'tom.h@freelance.net', status: 'Clicked', openCount: 1, clickCount: 1, lastActivity: '5 hours ago', location: 'Berlin, DE', device: 'Tablet - Safari' },
];
