import type { Parameter } from "./types";

/** Parameter default Draf 3 (1 Oktober 2026). Disimpan berversi; periode mengunci versinya. */
export const PARAMETER_DRAF_3: Parameter = {
  versi: "draf-3",
  bobot: { k1: 0.5, k2: 0.25, k3: 0.25 },
  bobotK2: { hadir: 0.6, tepat: 0.4 },
  k4Maks: 25,
  batasSkorIndikator: 100,
  ambangKehadiran: 85,
  plafonTunjangan: 1_500_000,
  ambangIkpMinimum: null,
  predikat: [
    { min: 90, label: "Sangat Baik" },
    { min: 80, label: "Baik" },
    { min: 70, label: "Cukup" },
    { min: 60, label: "Perlu Perbaikan" },
    { min: 0, label: "Kurang" },
  ],
};
