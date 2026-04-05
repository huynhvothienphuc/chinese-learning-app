import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Select({ className, children, ...props }) {
  return (
    <div className={cn('relative w-full min-w-0', className)}>
      <select
        className="h-10 w-full min-w-0 appearance-none rounded-xl border border-border bg-background px-4 pr-10 text-sm font-medium shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
