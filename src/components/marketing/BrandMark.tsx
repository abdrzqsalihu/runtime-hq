import Link from "next/link";
import { Cpu } from "lucide-react";

export function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="Runtime HQ home">
      <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-accent transition-transform group-hover:scale-105">
        <Cpu className="h-4 w-4 text-black" />
      </span>
      <span className="text-xs font-black uppercase tracking-[0.3em] text-foreground/90">
        RUNTIME HQ
      </span>
    </Link>
  );
}
