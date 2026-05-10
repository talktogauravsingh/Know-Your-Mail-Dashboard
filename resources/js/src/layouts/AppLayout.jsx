import React, { useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { LayoutDashboard, Mail, Sparkles, Users, Bot, Settings, Search, Bell, Gift, ChevronDown, LogOut } from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: Mail },
  { name: 'Automation', href: '#', icon: Sparkles, disabled: true },
  { name: 'Audience', href: '/audience', icon: Users },
  { name: 'AI Chatbot', href: '#', icon: Bot, disabled: true },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout() {
  const { user, logout, theme, toggleTheme } = useStore();
  const location = useLocation();

  // Sync theme to document root
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <div className="flex h-screen bg-[#eef6f0] font-sans transition-colors duration-200">
      {/* Sidebar */}
      <div className="hidden w-[260px] flex-col border-r border-slate-200/40 bg-transparent md:flex">
        {/* Logo */}
        <div className="flex h-20 items-center px-6">
          <span className="text-2xl font-black text-[#234e44] tracking-tighter">emitly</span>
        </div>

        {/* Workspace Switcher */}
        <div className="px-4 mb-2">
          <div className="flex w-full items-center justify-between rounded-xl p-2 cursor-pointer hover:bg-[#B7D67A] transition-colors">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
                <span className="text-slate-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 14v1"/><path d="M9 19v2"/><path d="M9 3v2"/><path d="M9 9v1"/></svg>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[#234e44] leading-none">My Workspace</span>
                <span className="text-[11px] text-slate-500 font-medium mt-1">Free plan</span>
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
                    "group flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                    item.disabled ? "opacity-50 cursor-not-allowed" : "",
                    isActive 
                      ? "bg-[#B7D67A] text-[#234e44]" 
                      : "text-slate-500 hover:bg-[#B7D67A] hover:text-[#234e44]"
                  )}
                >
                  <item.icon className={cn("h-[18px] w-[18px]", isActive ? "text-[#234e44]" : "text-slate-400 group-hover:text-[#234e44]")} />
                  {item.name}
                  {item.disabled && <span className="ml-auto text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Soon</span>}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div className="flex items-center gap-3 rounded-xl p-2 hover:bg-[#B7D67A] transition-colors cursor-pointer justify-between group">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-[#eef6f0] flex items-center justify-center text-sm font-bold text-[#234e44]">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-[#234e44] leading-tight">{user?.name || 'Admin User'}</p>
                <p className="truncate text-xs text-slate-500">ID: 4827682</p>
              </div>
            </div>
            <button onClick={logout} className="text-slate-400 hover:text-slate-900 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden relative">
        {/* Top header */}
        <header className="flex h-20 items-center justify-between bg-transparent px-4 lg:px-8 top-0 z-10 pt-4">
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="search"
                placeholder="Search"
                className="h-10 w-96 rounded-full border-none bg-white shadow-sm pl-10 pr-12 text-sm outline-none transition-all focus:ring-2 focus:ring-[#10b981]/20 text-slate-900"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-block">⌘</kbd>
                <kbd className="hidden rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline-block">K</kbd>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="rounded-full p-2 text-slate-500 bg-white shadow-sm hover:bg-[#B7D67A] transition-colors">
              <Gift className="h-4 w-4" />
            </button>
            <button className="relative rounded-full p-2 text-slate-500 bg-white shadow-sm hover:bg-[#B7D67A] transition-colors">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2 pl-2 cursor-pointer">
              <div className="h-8 w-8 overflow-hidden rounded-full bg-[#eef6f0] flex items-center justify-center text-sm font-bold text-[#234e44]">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0 hidden md:block">
                <p className="truncate text-[13px] font-bold text-[#234e44] leading-tight">{user?.name || 'Admin User'}</p>
                <p className="truncate text-[11px] text-slate-500">ID: 4827682</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 ml-1" />
            </div>
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
