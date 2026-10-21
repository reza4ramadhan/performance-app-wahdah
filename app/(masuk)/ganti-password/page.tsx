import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Input } from "@/components/ui/input";
import { FormAksi, Galat } from "@/components/app/form-aksi";
import { gantiPassword } from "@/app/aksi/akun";
import { bacaSesi } from "@/lib/sesi";

export const metadata: Metadata = { title: "Ganti password" };

export default function HalamanGanti() {
  return (
    <Suspense fallback={null}>
      <Isi />
    </Suspense>
  );
}

async function Isi() {
  const sesi = await bacaSesi();
  if (!sesi) redirect("/masuk");
  return (
    <>
      <h1 className="mt-8 text-[28px] font-extrabold leading-tight tracking-tight text-heading">{sesi.harusGantiPassword ? "Buat password baru" : "Ganti password"}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {sesi.harusGantiPassword ? `Assalamu'alaikum, ${sesi.nama}. Untuk keamanan, ganti password sementara dari Admin sebelum mulai.` : "Minimal 8 karakter. Sesi di perangkat lain akan keluar."}
      </p>
      <FormAksi aksi={gantiPassword} tombol="Simpan password" tombolPenuh className="mt-8 space-y-4" toastBerhasil={false}>
        {[
          ["lama", "Password saat ini", "current-password"],
          ["baru", "Password baru", "new-password"],
          ["ulang", "Ulangi password baru", "new-password"],
        ].map(([nama, label, ac]) => (
          <label key={nama} className="block">
            <span className="mb-1.5 block text-sm font-medium text-heading">{label}</span>
            <Input name={nama} type="password" autoComplete={ac} required minLength={nama === "lama" ? 1 : 8} className="h-12" />
            <Galat nama={nama} />
          </label>
        ))}
      </FormAksi>
    </>
  );
}
