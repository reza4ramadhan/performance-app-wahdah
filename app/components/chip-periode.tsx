import { getDb, periodeAktif, periodeTerkunci } from "@/lib/data/store";
import { Ikon } from "./ikon";
import { labelPeriode } from "./ui";

export async function ChipPeriode() {
  const db = await getDb();
  const p = periodeAktif(db);
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-wi-100 bg-white px-3 py-1.5 text-sm dark:border-wi-800 dark:bg-wi-950">
      <Ikon nama={periodeTerkunci(p) ? "kunci" : "kalender"} className="h-4 w-4 text-wi-600 dark:text-wi-300" />
      <span className="font-medium">{labelPeriode(p.id)}</span>
      <span className="hidden text-zinc-500 sm:inline">· {p.status}</span>
    </span>
  );
}
