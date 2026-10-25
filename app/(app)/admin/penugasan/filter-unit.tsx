"use client";

// Saring daftar penugasan per Bidang dan SKUO (lewat URL, ikut periode yang dipilih).

import { useRouter } from "next/navigation";
import { PilihCari } from "@/components/app/pilih-cari";

type Unit = { id: string; nama: string; indukId: string | null };

export function FilterUnit({ bidang, skuo, periode, bidangAktif, skuoAktif }: { bidang: Unit[]; skuo: Unit[]; periode: string; bidangAktif: string; skuoAktif: string }) {
  const router = useRouter();
  const ke = (b: string, k: string) => {
    const q = new URLSearchParams({ periode });
    if (b) q.set("bidang", b);
    if (k) q.set("skuo", k);
    router.push(`/admin/penugasan?${q}`, { scroll: false });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">Bidang</span>
        <PilihCari key={bidangAktif} opsi={bidang} nilaiAwal={bidangAktif} kosong="Semua bidang" saatBerubah={(b) => ke(b, "")} />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-heading">SKUO</span>
        <PilihCari
          key={`${bidangAktif}-${skuoAktif}`}
          opsi={bidangAktif ? skuo.filter((k) => k.indukId === bidangAktif) : skuo}
          nilaiAwal={skuoAktif}
          kosong="Semua SKUO"
          // Memilih SKUO ikut menetapkan bidangnya.
          saatBerubah={(k) => ke(k ? (skuo.find((x) => x.id === k)?.indukId ?? bidangAktif) : bidangAktif, k)}
        />
      </label>
    </div>
  );
}
