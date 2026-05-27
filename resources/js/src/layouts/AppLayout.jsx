import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { LayoutDashboard, Mail, LayoutList, Settings, LogOut, Search, Bell, Users, Database, Sun, Moon, ChevronDown, Bot, Sparkles, CreditCard, LayoutTemplate } from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Billing & Plan', href: '/billing', icon: CreditCard },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Templates', href: '/templates', icon: LayoutTemplate },
  { name: 'Automation', href: '#', icon: Sparkles, disabled: true },
  { name: 'Audience', href: '/audience', icon: Users },
    { name: 'Global Import', href: '/bulk-import', icon: Database },
  { name: 'AI Chatbot', href: '#', icon: Bot, disabled: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout, theme, toggleTheme, billingSummary, fetchBillingSummary } = useStore();
  const location = useLocation();
  const currentPlanName = billingSummary?.current_plan?.name || 'Free';

  // Sync theme to document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);


  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-850 font-sans transition-colors duration-200">
      {/* Sidebar */}
      <div className="hidden w-64 flex-col border-r border-slate-200/60 bg-white dark:border-slate-800/50 dark:bg-slate-900 md:flex">
        {/* Workspace Switcher */}
        <div className="flex h-20 items-center px-4 py-4">
          <div className="flex w-full items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 px-3 py-2 dark:border-slate-800/50 dark:bg-slate-850 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm">
                <span className="font-bold text-sm">KYE</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none">My Workspace</span>
                <span className="text-[10px] text-slate-500 font-medium mt-1">{currentPlanName} plan</span>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-1 px-3">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.disabled ? '#' : item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                    item.disabled ? "opacity-50 cursor-not-allowed" : "",
                    isActive 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                  {item.name}
                  {item.disabled && <span className="ml-auto text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Soon</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
            <div className="h-10 w-10 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50 leading-tight">{user?.name || 'Admin User'}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">ID: 4827682</p>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 p-2">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-md px-4 lg:px-8 dark:border-slate-800/50 dark:bg-slate-900/50 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search..."
                className="h-10 w-80 rounded-full border border-slate-200/80 bg-white pl-10 pr-12 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700/50 dark:bg-slate-850 dark:text-slate-50"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-block">⌘</kbd>
                <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 sm:inline-block">K</kbd>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleTheme} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#0f172a]"></span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
