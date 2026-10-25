"use client";

// Dropdown yang bisa diketik untuk dicari; dipakai untuk semua isian daftar (pengganti <select>).
// Nilai dikirim lewat input tersembunyi `name`, jadi tetap bekerja di FormAksi / Server Action.
// Tanpa `nilai`: tak terkendali (nilaiAwal, ikut reset form). Dengan `nilai`: terkendali lewat saatBerubah.

import { useEffect, useId, useRef, useState } from "react";
import { kelasPilihan } from "@/components/app/kolom";
import { cn } from "@/lib/utils";

type Opsi = { id: string; nama: string };

/** Huruf kecil, tanpa tanda baca/diakritik: "Muh. Yusuf" cocok dengan "muh yusuf". */
const normal = (x: string) =>
  x
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

export function PilihCari({
  name,
  opsi,
  nilai: dikendalikan,
  nilaiAwal,
  kosong = "—",
  placeholder,
  required,
  disabled,
  saatBerubah,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  name?: string;
  opsi: Opsi[];
  /** Nilai terkendali; ubah lewat saatBerubah. */
  nilai?: string;
  nilaiAwal?: string | null;
  /** Label pilihan kosong; null = tidak ada baris kosong di daftar. */
  kosong?: string | null;
  /** Teks saat belum memilih (bawaan: label kosong). */
  placeholder?: string;
  /** Wajib dipilih: form tidak terkirim selama nilainya kosong (validasi bawaan browser). */
  required?: boolean;
  disabled?: boolean;
  saatBerubah?: (id: string) => void;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const [dalam, setDalam] = useState(nilaiAwal ?? "");
  const nilai = dikendalikan ?? dalam;
  const kombo = useRef<HTMLInputElement>(null);
  const berubah = useRef(saatBerubah);
  useEffect(() => {
    berubah.current = saatBerubah;
  });
  const [cari, setCari] = useState("");
  const [buka, setBuka] = useState(false);
  const [aktif, setAktif] = useState(0);
  const tersembunyi = useRef<HTMLInputElement>(null);
  const daftar = useRef<HTMLUListElement>(null);
  const idDaftar = useId();

  const terpilih = opsi.find((o) => o.id === nilai);
  const kata = normal(cari).split(" ").filter(Boolean);
  const cocok = kata.length ? opsi.filter((o) => kata.every((k) => normal(o.nama).includes(k))) : opsi;
  // Baris pertama "kosong" (mis. Otomatis) hanya saat tidak mencari.
  const baris: Opsi[] = kata.length || kosong === null ? cocok : [{ id: "", nama: kosong }, ...cocok];

  // FormAksi mereset form setelah berhasil: kembalikan ke nilai awal (hanya mode tak terkendali).
  const terkendali = dikendalikan !== undefined;
  useEffect(() => {
    const form = tersembunyi.current?.form;
    if (!form || terkendali) return;
    const reset = () => {
      setDalam(nilaiAwal ?? "");
      setCari("");
      berubah.current?.(nilaiAwal ?? "");
    };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, [nilaiAwal, terkendali]);

  useEffect(() => {
    if (buka) daftar.current?.children[aktif]?.scrollIntoView({ block: "nearest" });
  }, [aktif, buka]);

  const pilih = (o: Opsi) => {
    setDalam(o.id);
    setCari("");
    setBuka(false);
    if (o.id !== nilai) saatBerubah?.(o.id);
  };

  return (
    <div className="relative">
      <input ref={tersembunyi} type="hidden" name={required ? undefined : name} value={nilai} />
      <input
        ref={kombo}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-required={required}
        disabled={disabled}
        aria-expanded={buka}
        aria-controls={idDaftar}
        aria-autocomplete="list"
        aria-activedescendant={buka && baris[aktif] ? `${idDaftar}-${aktif}` : undefined}
        autoComplete="off"
        className={cn(kelasPilihan, "placeholder:text-foreground", !terpilih && "placeholder:text-muted-foreground")}
        placeholder={terpilih?.nama ?? placeholder ?? kosong ?? ""}
        value={cari}
        onFocus={() => {
          setBuka(true);
          setAktif(Math.max(0, baris.findIndex((o) => o.id === nilai)));
        }}
        onClick={() => setBuka(true)}
        onBlur={() => {
          setBuka(false);
          setCari("");
        }}
        onChange={(e) => {
          setCari(e.target.value);
          setBuka(true);
          setAktif(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!buka) return setBuka(true);
            const n = baris.length;
            if (n) setAktif((a) => (a + (e.key === "ArrowDown" ? 1 : n - 1)) % n);
          } else if (e.key === "Enter") {
            // Jangan kirim form saat memilih.
            if (buka) {
              e.preventDefault();
              if (baris[aktif]) pilih(baris[aktif]);
            }
          } else if (e.key === "Escape" && buka) {
            e.preventDefault();
            setBuka(false);
            setCari("");
          }
        }}
      />
      {required && (
        // Input tak terlihat agar validasi `required` bawaan browser berlaku; fokusnya diteruskan ke kotak pencarian.
        <input
          tabIndex={-1}
          aria-hidden
          name={name}
          value={nilai}
          required
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => kombo.current?.focus()}
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px w-full opacity-0"
        />
      )}
      {buka && !disabled && (
        <ul ref={daftar} id={idDaftar} role="listbox" className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">
          {baris.length ? (
            baris.map((o, i) => (
              <li
                key={o.id || "kosong"}
                id={`${idDaftar}-${i}`}
                role="option"
                aria-selected={o.id === nilai}
                // mousedown, bukan click: input belum kehilangan fokus.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pilih(o);
                }}
                onMouseMove={() => setAktif(i)}
                className={cn(
                  "flex min-h-10 cursor-pointer items-center rounded-lg px-3 py-2 text-sm",
                  i === aktif && "bg-primary/12",
                  o.id === nilai && "font-semibold text-heading",
                  !o.id && "text-muted-foreground",
                )}
              >
                {o.nama}
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-sm text-muted-foreground">Tidak ada yang cocok.</li>
          )}
        </ul>
      )}
    </div>
  );
}
