import { cn } from "@/lib/utils";

// One character per check: o = operational, d = degraded, x = outage, . = no observation
const STATE_STYLES: Record<string, string> = {
  o: "bg-success/50",
  d: "bg-warning/60",
  x: "bg-error/60",
  ".": "bg-foreground/10",
};

interface HeartbeatBarProps {
  pattern: string;
  label: string;
  className?: string;
}

export function HeartbeatBar({ pattern, label, className }: HeartbeatBarProps) {
  return (
    <div role="img" aria-label={label} className={cn("flex h-5 w-full gap-[2px]", className)}>
      {pattern.split("").map((state, i) => (
        <span
          key={i}
          className={cn("flex-1 rounded-[1px]", STATE_STYLES[state] ?? STATE_STYLES["."])}
        />
      ))}
    </div>
  );
}
