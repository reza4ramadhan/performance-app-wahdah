import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { bacaSesi } from "@/lib/sesi";
import { FormGanti } from "./form";

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
  return <FormGanti nama={sesi.nama} harusGanti={sesi.harusGantiPassword} />;
}
