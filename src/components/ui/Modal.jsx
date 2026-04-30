import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Modal({ open, onClose, children, className }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full max-w-md rounded-3xl border border-theme-border bg-theme-surface shadow-2xl',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalHeader({ children, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-theme-border px-5 py-4">
      <div className="min-w-0 flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-muted-foreground dark:hover:bg-accent dark:hover:text-accent-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function ModalFooter({ children, className }) {
  return (
    <div className={cn('flex flex-wrap justify-end gap-2 border-t border-theme-border px-5 py-4', className)}>
      {children}
    </div>
  );
}
