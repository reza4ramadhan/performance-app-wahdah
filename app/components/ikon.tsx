// Ikon garis 24×24 (gaya Lucide), digambar inline agar tanpa dependensi.

const PATH = {
  dasbor: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
  bintang: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  kalender: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18M9 15l2 2 4-4" /></>,
  pengaturan: <><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" /><circle cx="16" cy="6" r="2" /><circle cx="10" cy="12" r="2" /><circle cx="18" cy="18" r="2" /></>,
  pengguna: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  grafik: <><path d="M3 3v18h18" /><path d="M7 15l4-4 3 3 6-7" /></>,
  dompet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 15h2M7 6l9-3 1 3" /></>,
  peringatan: <><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4M12 17.5v.01" /></>,
  centang: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  panah: <path d="M5 12h14M13 6l6 6-6 6" />,
  kunci: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
} as const;

export type NamaIkon = keyof typeof PATH;

export function Ikon({ nama, className = "h-5 w-5" }: { nama: NamaIkon; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {PATH[nama]}
    </svg>
  );
}
