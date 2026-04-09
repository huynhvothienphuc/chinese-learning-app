import { cn } from '@/lib/utils';

export default function ToggleSwitch({ checked, onChange, label, className }) {
  return (
    <label className={cn('flex cursor-pointer items-center gap-2', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200',
        checked ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600',
      )}>
        <span className={cn(
          'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]',
        )} />
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
