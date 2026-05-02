import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Skeleton — base shimmer building block.
 *
 * Usage:
 *   <Skeleton className="h-4 w-48 rounded-md" />
 *
 * The shimmer effect is powered by a CSS custom property gradient that sweeps
 * left-to-right using a single `@keyframes` definition in index.css (added via
 * the `skeleton-shimmer` utility class). This keeps GPU usage minimal — only
 * `transform: translateX` and `opacity` are animated on a pseudo-element,
 * avoiding costly `background-position` repaints.
 */
const Skeleton = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={cn(
      'relative overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800 skeleton-shimmer',
      className
    )}
    {...props}
  />
));
Skeleton.displayName = 'Skeleton';

export { Skeleton };
