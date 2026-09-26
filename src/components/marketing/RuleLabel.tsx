import { cn } from "@/lib/utils";

// A hairline with its metadata sitting directly on the rule
export function RuleLabel({
  left,
  right,
  className,
}: {
  left: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1", className)}>
      <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] text-foreground">
        <span className="mr-2 text-accent">&gt;_</span>
        {left}
      </span>
      <span className="hidden h-px min-w-6 flex-1 bg-border sm:block" />
      {right && (
        <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-foreground/45">
          {right}
        </span>
      )}
    </div>
  );
}
