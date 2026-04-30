export default function Divider({ className = '' }) {
  return (
    <span className={`mx-2 w-px bg-border ${className}`} aria-hidden="true" />
  );
}
