"use client";

import { useState } from "react";
import { simpanSkorK3 } from "../actions";
import { LABEL_NILAI_K3, NILAI_K3, type NilaiK3 } from "@/lib/kpi/types";
import { AksiForm } from "./aksi-form";
import { kelasInput } from "./ui";

const ARTI = ["", "Sangat kurang", "Kurang", "Cukup", "Baik", "Istimewa"];
const WAJIB_CONTOH = [1, 2, 5];

export function FormK3({
  periodeId,
  penugasanId,
  awal,
  adaLog,
  terkunci,
}: {
  periodeId: string;
  penugasanId: string;
  awal?: { skor: Record<NilaiK3, number>; contoh: Partial<Record<NilaiK3, string>> };
  adaLog: boolean;
  terkunci: boolean;
}) {
  const [skor, setSkor] = useState<Record<NilaiK3, number>>(
    awal?.skor ?? (Object.fromEntries(NILAI_K3.map((n) => [n, 3])) as Record<NilaiK3, number>),
  );
  const rata = NILAI_K3.reduce((a, n) => a + (n === "pengembanganDiri" && !adaLog ? Math.min(2, skor[n]) : skor[n]), 0) / NILAI_K3.length;

  return (
    <AksiForm action={simpanSkorK3} tombol="Simpan skor K3" nonaktif={terkunci}>
      <input type="hidden" name="periodeId" value={periodeId} />
      <input type="hidden" name="penugasanId" value={penugasanId} />
      <div className="divide-y divide-line">
        {NILAI_K3.map((n) => {
          const wajib = WAJIB_CONTOH.includes(skor[n]);
          const dibatasi = n === "pengembanganDiri" && !adaLog && skor[n] > 2;
          return (
            <fieldset key={n} disabled={terkunci} className="grid gap-3 py-4 md:grid-cols-[230px_1fr]">
              <div>
                <legend className="text-sm font-semibold text-ink">{LABEL_NILAI_K3[n]}</legend>
                <div className="mt-2 flex gap-1.5" role="radiogroup" aria-label={`Skor ${LABEL_NILAI_K3[n]}`}>
                  {[1, 2, 3, 4, 5].map((v) => (
                    <label key={v} className="cursor-pointer" title={ARTI[v]}>
                      <input
                        type="radio"
                        name={`skor-${n}`}
                        value={v}
                        checked={skor[n] === v}
                        onChange={() => setSkor((s) => ({ ...s, [n]: v }))}
                        className="peer sr-only"
                      />
                      <span className="grid size-9 place-items-center rounded-xl border border-line text-sm font-semibold text-muted transition peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white peer-focus-visible:ring-3 peer-focus-visible:ring-brand-500/30 hover:border-brand-300">
                        {v}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted">{ARTI[skor[n]]}</p>
                {dibatasi && <p className="mt-1 text-xs font-medium text-gold-700 dark:text-gold-300">Dihitung 2 karena log belum diunggah.</p>}
              </div>
              <label className="text-xs text-muted">
                Contoh perilaku{" "}
                {wajib ? <strong className="font-semibold text-flame-700 dark:text-flame-300">· wajib untuk skor {skor[n]}</strong> : "· opsional"}
                <textarea
                  name={`contoh-${n}`}
                  defaultValue={awal?.contoh[n]}
                  rows={2}
                  required={wajib}
                  placeholder={wajib ? "Tuliskan kejadian nyata yang mendasari skor ini…" : ""}
                  className={`${kelasInput} ${wajib ? "border-flame-300 dark:border-flame-700" : ""}`}
                />
              </label>
            </fieldset>
          );
        })}
      </div>
      <p className="mt-4 rounded-xl bg-brand-500/8 px-4 py-3 text-sm text-body">
        Pratinjau K3: rata-rata <strong className="tabular-nums">{rata.toFixed(2).replace(".", ",")}</strong> × 20 ={" "}
        <strong className="tabular-nums text-brand-700 dark:text-brand-200">{(rata * 20).toFixed(2).replace(".", ",")}</strong>
      </p>
    </AksiForm>
  );
}
