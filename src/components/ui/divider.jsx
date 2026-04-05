export default function Divider({ className = '' }) {
  return (
    <span className={`mx-2 w-px bg-slate-200 dark:bg-slate-700 ${className}`} aria-hidden="true" />
  );
}