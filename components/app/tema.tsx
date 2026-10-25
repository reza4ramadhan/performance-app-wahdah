"use client";

// Mode terang/gelap: bawaan mengikuti perangkat; pilihan pengguna disimpan di browser (next-themes).

import { useSyncExternalStore } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function PenyediaTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

const tanpaLangganan = () => () => {};

/** Tombol ikon: beralih terang ↔ gelap. Ikon dipilih lewat CSS agar tidak berkedip saat hidrasi. */
export function TombolTema({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Ganti mode terang/gelap"
      title="Ganti mode terang/gelap"
      className={cn("grid size-10 shrink-0 place-items-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground", className)}
    >
      <Moon className="size-[18px] dark:hidden" strokeWidth={1.9} />
      <Sun className="hidden size-[18px] dark:block" strokeWidth={1.9} />
    </button>
  );
}

const PILIHAN = [
  { nilai: "light", label: "Terang", Ikon: Sun },
  { nilai: "dark", label: "Gelap", Ikon: Moon },
  { nilai: "system", label: "Perangkat", Ikon: Monitor },
] as const;

/** Baris pengaturan di halaman Akun: Terang / Gelap / ikuti perangkat. */
export function PilihanTema() {
  const { theme, setTheme } = useTheme();
  // Pilihan tersimpan baru diketahui di browser.
  const siap = useSyncExternalStore(tanpaLangganan, () => true, () => false);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
        <Moon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-heading">Tampilan</span>
        <span className="block text-xs text-muted-foreground">Mode terang atau gelap.</span>
      </span>
      <div role="radiogroup" aria-label="Mode tampilan" className="flex rounded-xl bg-muted p-1">
        {PILIHAN.map(({ nilai, label, Ikon }) => {
          const aktif = siap && theme === nilai;
          return (
            <button
              key={nilai}
              type="button"
              role="radio"
              aria-checked={aktif}
              onClick={() => setTheme(nilai)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition",
                aktif ? "bg-card text-heading shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Ikon className="size-3.5" /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
