import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { cn } from '../lib/utils';
import { 
  LayoutDashboard, 
  Mail, 
  LayoutList, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  Users, 
  Database, 
  Sun, 
  Moon, 
  ChevronDown, 
  Bot, 
  Sparkles, 
  CreditCard, 
  LayoutTemplate,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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
  const userRoleSlug = user?.role?.slug;
  const isSettingsAllowed = userRoleSlug === 'super-admin' || userRoleSlug === 'admin' || userRoleSlug === 'root';
  const filteredNavigation = navigation.filter(item => {
    if (item.href === '/settings') {
      return isSettingsAllowed;
    }
    return true;
  });

  // Desktop sidebar collapse state (persisted)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    return saved ? JSON.parse(saved) : false;
  });

  // Mobile sidebar slide-out state
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

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
      {/* Desktop Sidebar */}
      <div 
        className={cn(
          "hidden flex-col border-r border-slate-200/60 bg-white dark:border-slate-800/50 dark:bg-slate-900 md:flex transition-all duration-300 ease-in-out relative shrink-0",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-[-12px] top-6 z-25 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-slate-500 hover:text-[#0052CC] hover:bg-slate-50 dark:hover:bg-slate-800 dark:hover:text-blue-400 shadow-sm cursor-pointer transition-all duration-200"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Workspace Switcher */}
        <div className="flex h-20 items-center px-4 py-4 justify-center">
          <div 
            className={cn(
              "flex items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 dark:border-slate-800/50 dark:bg-slate-850 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300",
              isCollapsed ? "w-10 h-10 p-1 justify-center border-none bg-transparent dark:bg-transparent" : "w-full px-3 py-2"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm">
                <span className="font-bold text-sm">KYE</span>
              </div>
              {!isCollapsed && (
                <div className="flex flex-col animate-in fade-in duration-350">
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-50 leading-none">My Workspace</span>
                  <span className="text-[10px] text-slate-500 font-medium mt-1">{currentPlanName} plan</span>
                </div>
              )}
            </div>
            {!isCollapsed && <ChevronDown className="h-4 w-4 text-slate-400 animate-in fade-in duration-350" />}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="space-y-1 px-3">
            {filteredNavigation.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  to={item.disabled ? '#' : item.href}
                  className={cn(
                    "group flex items-center rounded-xl transition-all duration-200",
                    isCollapsed ? "px-0 justify-center w-10 h-10 mx-auto" : "px-3 py-2.5 gap-3",
                    item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                    isActive 
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                  {!isCollapsed && (
                    <span className="text-sm font-semibold truncate animate-in fade-in duration-300">
                      {item.name}
                    </span>
                  )}
                  {item.disabled && !isCollapsed && (
                    <span className="ml-auto text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full animate-in fade-in duration-300">Soon</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* User Profile */}
        <div className="p-4 mt-auto">
          <div 
            className={cn(
              "flex items-center rounded-xl transition-all duration-300 cursor-pointer",
              isCollapsed ? "flex-col gap-2 justify-center p-0" : "gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50"
            )}
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
              {user?.name?.charAt(0) || 'A'}
            </div>
            {!isCollapsed ? (
              <>
                <div className="flex-1 min-w-0 animate-in fade-in duration-300">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50 leading-tight">{user?.name || 'Admin User'}</p>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">ID: 4827682</p>
                </div>
                <button onClick={logout} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 p-2 cursor-pointer" title="Log Out">
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button 
                onClick={logout} 
                className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer" 
                title="Log Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Sidebar */}
      <div className={cn("fixed inset-0 z-50 md:hidden transition-all duration-300", isMobileOpen ? "visible" : "invisible")}>
        {/* Backdrop */}
        <div 
          onClick={() => setIsMobileOpen(false)}
          className={cn("absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300", isMobileOpen ? "opacity-100" : "opacity-0")}
        />
        {/* Drawer Content */}
        <div 
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-in-out shadow-2xl",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Header */}
          <div className="flex h-20 items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm font-bold text-sm shrink-0">
                <span className="font-bold text-sm">KYE</span>
              </div>
              <span className="font-bold text-slate-900 dark:text-slate-50">KYM Tracker</span>
            </div>
            <button onClick={() => setIsMobileOpen(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto py-4">
            <nav className="space-y-1 px-4">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.name}
                    to={item.disabled ? '#' : item.href}
                    onClick={() => setIsMobileOpen(false)}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                      item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
                      isActive 
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300")} />
                    {item.name}
                    {item.disabled && <span className="ml-auto text-[9px] uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Soon</span>}
                  </Link>
                );
              })}
            </nav>
          </div>
          {/* Footer Profile */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-3 rounded-xl p-2">
              <div className="h-10 w-10 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-50 leading-tight">{user?.name || 'Admin User'}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">ID: 4827682</p>
              </div>
              <button onClick={logout} className="text-slate-400 hover:text-slate-900 dark:hover:text-slate-50 p-2 cursor-pointer">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content wrapper */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header */}
        <header className="flex h-20 items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-md px-4 lg:px-8 dark:border-slate-800/50 dark:bg-slate-900/50 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            {/* Hamburger Button for Mobile */}
            <button 
              onClick={() => setIsMobileOpen(true)} 
              className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors cursor-pointer"
              title="Open Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            {/* KYE Mobile logo */}
            <div className="flex md:hidden h-8 w-8 items-center justify-center rounded-lg bg-blue-500 text-white shadow-sm font-bold text-sm shrink-0">
              <span className="font-bold text-sm">KYE</span>
            </div>

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
            <button onClick={toggleTheme} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors cursor-pointer">
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50 transition-colors cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_0_2px_white] dark:shadow-[0_0_0_2px_#0f172a]"></span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50 dark:bg-slate-850 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
