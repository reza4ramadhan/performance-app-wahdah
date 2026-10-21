// Field form sederhana: label di atas, galat di bawah, target sentuh ≥ 44 px.

import { cn } from "@/lib/utils";

export function Kolom({ label, galat, bantuan, children, className }: { label: string; galat?: string; bantuan?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-heading">{label}</span>
      {children}
      {galat ? <span className="mt-1 block text-xs font-medium text-destructive">{galat}</span> : bantuan ? <span className="mt-1 block text-xs text-muted-foreground">{bantuan}</span> : null}
    </label>
  );
}

export const kelasPilihan =
  "h-11 w-full appearance-none rounded-xl border border-input bg-card bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%235e707c' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")] bg-[right_0.75rem_center] bg-no-repeat px-3.5 pr-9 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

export const kelasTeks =
  "min-h-20 w-full rounded-xl border border-input bg-card px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm";

/** Chip pilihan tunggal (indikator, penugasan, filter). */
export function Chip({ aktif, children, ...p }: React.ComponentProps<"button"> & { aktif: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={aktif}
      className={cn(
        "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition active:scale-[0.97]",
        aktif ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:border-primary/40",
      )}
      {...p}
    >
      {children}
    </button>
  );
}
