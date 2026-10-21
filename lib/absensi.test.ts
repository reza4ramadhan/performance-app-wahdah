import { describe, expect, it } from "vitest";
import { bacaCsv, validasiAbsensi } from "./absensi";

const PG = [
  { id: "a", nama: "Ahmad", nip: "2001", noHp: "081200002001" },
  { id: "b", nama: "Budi", nip: "2002", noHp: "081200002002" },
];

describe("impor absensi", () => {
  it("membaca CSV titik koma, kolom sinonim, dan nilai berkutip", () => {
    const rows = bacaCsv('NIP;Nama;Hari Kerja;Hadir;Tepat Waktu;Izin Sakit Sah\n2001;"Ahmad, S.Pd";22;20;18;1');
    expect(rows[0]).toEqual({ nip: "2001", nama: "Ahmad, S.Pd", hari_kerja_wajib: "22", hadir: "20", hadir_tepat_waktu: "18", izin_sakit: "1" });
  });

  it("mencocokkan NIP atau No. HP (+62 dinormalkan)", () => {
    const { baris } = validasiAbsensi(bacaCsv("no_hp,hari_kerja_wajib,hadir,hadir_tepat_waktu\n+6281200002002,22,22,21"), PG);
    expect(baris[0]).toMatchObject({ pegawaiId: "b", galat: [] });
  });

  it("menandai pegawai tidak dikenal, ganda, dan angka tidak masuk akal", () => {
    const csv = "nip,hari_kerja_wajib,hadir,hadir_tepat_waktu,izin_sakit\n9999,22,20,18,0\n2001,22,23,10,0\n2001,22,20,21,3";
    const { baris } = validasiAbsensi(bacaCsv(csv), PG);
    expect(baris[0].galat).toContain("Pegawai tidak dikenal");
    expect(baris[1].galat).toContain("Hadir melebihi hari kerja wajib");
    expect(baris[2].galat).toEqual(expect.arrayContaining(["Pegawai muncul lebih dari sekali", "Tepat waktu melebihi hadir", "Hadir + izin/sakit melebihi hari kerja wajib"]));
  });

  it("menolak berkas tanpa kolom wajib", () => {
    expect(validasiAbsensi(bacaCsv("nama,hadir\nA,1"), PG).galatUmum[0]).toMatch(/Kolom wajib/);
  });
});
