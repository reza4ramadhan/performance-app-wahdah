// Efek kaca untuk kartu berwarna: dua cahaya lembut yang diburamkan, kilau diagonal, dan garis sorot di tepi atas.
// Pasang di dalam kartu yang `relative isolate overflow-hidden`; selalu dekoratif (aria-hidden).

import { cn } from "@/lib/utils";

/** `cahaya`: kelas warna dua cahaya buram, [kanan atas, kiri bawah], mis. ["bg-gold-400/40", "bg-flame-700/50"]. */
export function LapisanKaca({ cahaya, className }: { cahaya: [string, string]; className?: string }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]", className)}>
      <span className={cn("absolute -top-20 -right-12 size-60 rounded-full blur-3xl", cahaya[0])} />
      <span className={cn("absolute -bottom-24 -left-16 size-56 rounded-full blur-3xl", cahaya[1])} />
      {/* Kilau diagonal seperti pantulan pada kaca. */}
      <span className="absolute inset-0 bg-[linear-gradient(125deg,rgb(255_255_255/0.2)_0%,rgb(255_255_255/0.05)_32%,transparent_55%)]" />
      {/* Garis sorot tipis di tepi atas. */}
      <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </span>
  );
}

/** Kelas chip kaca buram untuk ikon/label di atas kartu berwarna. */
export const chipKaca = "bg-white/15 ring-1 ring-inset ring-white/30 shadow-[inset_0_1px_0_rgb(255_255_255/0.35)] backdrop-blur-md";

/** Bingkai kaca untuk kartu berwarna: tepi dalam terang dan bayangan lembut. */
export const bingkaiKaca = "ring-1 ring-inset ring-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_18px_36px_-22px_rgb(8_41_47/0.55)]";
