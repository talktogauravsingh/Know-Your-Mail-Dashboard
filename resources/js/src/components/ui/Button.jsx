import React from 'react';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({ className, variant = 'default', size = 'default', isLoading, children, ...props }, ref) => {
  return (
    <button
      ref={ref}
      disabled={isLoading || props.disabled}
      className={cn(
        "cursor-pointer inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:pointer-events-none disabled:opacity-50",
        {
          'bg-[#234e44] text-white shadow-md hover:bg-emerald-700 hover:shadow-lg': variant === 'default',
          'bg-red-500 text-white shadow-sm hover:bg-red-600': variant === 'destructive',
          'border border-slate-200/80 bg-white/50 backdrop-blur-sm shadow-sm hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:hover:text-slate-50': variant === 'outline',
          'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800/80 dark:hover:text-slate-50': variant === 'ghost',
          'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-700': variant === 'secondary',
          'h-10 px-5 py-2': size === 'default',
          'h-8 rounded-full px-3 text-xs': size === 'sm',
          'h-12 rounded-full px-8 text-base': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
});
Button.displayName = 'Button';

export { Button };
