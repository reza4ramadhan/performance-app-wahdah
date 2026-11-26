import { redirect } from "next/navigation";

// Rombak v2: Belajar (pengembangan diri) kini tab di halaman Jurnal.
export default function HalamanPd() {
  redirect("/jurnal?tab=belajar");
}
