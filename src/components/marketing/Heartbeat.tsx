import { cn } from "@/lib/utils";
import { STATE_META, type Cell } from "./sample-data";

interface HeartbeatProps {
  cells: string;
  label: string;
  // Changes when a new check lands, so the newest cell re-mounts and plays its arrival
  newestKey?: number;
  className?: string;
}

export function Heartbeat({ cells, label, newestKey = 0, className }: HeartbeatProps) {
  const lastIndex = cells.length - 1;
  return (
    <div role="img" aria-label={label} className={cn("flex w-full gap-[2px] sm:gap-[3px]", className)}>
      {cells.split("").map((state, i) => (
        <span
          key={i === lastIndex ? `newest-${newestKey}` : i}
          className={cn(
            "flex-1 rounded-[1px] transition-colors duration-300 motion-reduce:transition-none",
            STATE_META[state as Cell]?.bg ?? STATE_META["."].bg,
            i === lastIndex && newestKey > 0 ? "rhq-land" : "opacity-60",
            i === lastIndex && "opacity-100",
          )}
        />
      ))}
    </div>
  );
}
