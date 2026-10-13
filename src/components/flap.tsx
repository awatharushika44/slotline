/** Replays a CSS flip animation whenever `value` changes (React key remount). */
export function Flap({ value, className = "" }: { value: string; className?: string }) {
  return (
    <span aria-live="polite">
      <span key={value} className={`flap ${className}`}>
        {value}
      </span>
    </span>
  );
}