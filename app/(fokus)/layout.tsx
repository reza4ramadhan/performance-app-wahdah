// Layar fokus tanpa navigasi (mis. mode periksa KSBK): satu tugas, keluar lewat tombol Tutup.

export default function LayoutFokus({ children }: LayoutProps<"/">) {
  return (
    <main className="min-h-dvh bg-background px-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </main>
  );
}
