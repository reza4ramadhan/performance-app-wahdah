import { redirect } from "next/navigation";

// Rombak v2: mode periksa satu per satu diganti daftar Verifikasi dengan Setujui semua yang tepat waktu.
export default function HalamanPeriksa() {
  redirect("/tim/verifikasi");
}
