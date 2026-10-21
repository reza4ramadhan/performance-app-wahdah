import Link from "next/link";
import { cn } from "@/lib/utils";

/** Baris chip filter yang bisa digulir (status, periode, dsb.) — berbasis URL, tanpa JavaScript. */
export function ChipFilter({ pilihan, aktif, href }: { pilihan: { nilai: string; label: string; jumlah?: number }[]; aktif: string; href: (nilai: string) => string }) {
  return (
    <nav aria-label="Saring" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
      {pilihan.map((p) => (
        <Link
          key={p.nilai}
          href={href(p.nilai)}
          aria-current={p.nilai === aktif ? "true" : undefined}
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition",
            p.nilai === aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40",
          )}
        >
          {p.label}
          {p.jumlah !== undefined && <span className={cn("text-xs tabular-nums", p.nilai === aktif ? "text-primary-foreground/80" : "text-muted-foreground")}>{p.jumlah}</span>}
        </Link>
      ))}
    </nav>
  );
}
