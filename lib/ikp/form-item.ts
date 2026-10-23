// Validasi isian item (dipakai bersama form + Catat dan Server Action).

import { z } from "zod";
import { indikatorDari, type BentukItem } from "./katalog";

const tanggal = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");
const waktu = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Waktu tidak valid");
const link = z.url({ protocol: /^https?$/, error: "Link bukti harus berupa alamat lengkap (https://…)" }).max(1000);

export const skemaItem = z.object({
  idKlien: z.string().min(8).max(64),
  penugasanId: z.string().min(1),
  indikatorKode: z.string().min(1),
  kegiatanId: z.string().optional().nullable(),
  masuk: z.string().optional().nullable(),
  selesai: z.string().optional().nullable(),
  linkBukti: z.string().optional().nullable(),
  data: z.record(z.string(), z.string().max(500)).default({}),
});
export type IsianItem = z.infer<typeof skemaItem>;

export type GalatIsian = Partial<Record<string, string>>;

/** Periksa isian terhadap bentuk indikator. Mengembalikan galat per field (kosong = sah). */
export function periksaIsian(x: IsianItem): { galat: GalatIsian; bentuk: BentukItem | null } {
  const def = indikatorDari(x.indikatorKode);
  const galat: GalatIsian = {};
  if (!def?.item || def.tipe !== "item") return { galat: { indikatorKode: "Indikator ini tidak dicatat sebagai item." }, bentuk: null };
  const b = def.item;
  const pola = (jenis: "tanggal" | "waktu") => (jenis === "tanggal" ? tanggal : waktu);

  if (b.kegiatan === "wajib" && !x.kegiatanId) galat.kegiatanId = "Pilih kegiatan.";
  if (b.masuk && !pola(b.masuk.jenis).safeParse(x.masuk ?? "").success) galat.masuk = `${b.masuk.label} wajib diisi.`;
  if (x.selesai) {
    if (!pola(b.selesai.jenis).safeParse(x.selesai).success) galat.selesai = `${b.selesai.label} tidak valid.`;
    if (!x.linkBukti?.trim()) galat.linkBukti = "Link bukti wajib saat item ditandai selesai.";
    if (b.masuk && x.masuk && x.selesai < x.masuk) galat.selesai = `${b.selesai.label} tidak boleh sebelum ${b.masuk.label.toLowerCase()}.`;
  }
  if (x.linkBukti?.trim() && !link.safeParse(x.linkBukti.trim()).success) galat.linkBukti = "Link bukti harus berupa alamat lengkap (https://…).";
  for (const f of b.field) {
    const v = x.data[f.nama]?.trim() ?? "";
    if (f.wajib && !v) galat[`data.${f.nama}`] = `${f.label} wajib diisi.`;
    if (f.jenis === "pilihan" && v && !f.opsi.includes(v)) galat[`data.${f.nama}`] = `Pilihan ${f.label.toLowerCase()} tidak dikenal.`;
  }
  return { galat, bentuk: b };
}
