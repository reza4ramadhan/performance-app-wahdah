// Ekspor Excel (plan.md Bagian 8 "Ekspor"). Angka dibulatkan 2 desimal hanya di sini.

import "server-only";
import ExcelJS from "exceljs";

export const bulat2 = (n: number | null | undefined) => (n === null || n === undefined ? null : Math.round(n * 100) / 100);

export async function bukuExcel(judul: string, kolom: { header: string; key: string; width?: number }[], baris: Record<string, unknown>[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "IKP Pegawai WI";
  wb.created = new Date();
  const ws = wb.addWorksheet(judul.slice(0, 31), { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = kolom.map((k) => ({ ...k, width: k.width ?? 14 }));
  ws.addRows(baris);
  const kepala = ws.getRow(1);
  kepala.font = { bold: true, color: { argb: "FFFFFFFF" } };
  kepala.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0C7883" } };
  kepala.alignment = { vertical: "middle", wrapText: true };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: kolom.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function responsExcel(buf: Buffer, nama: string) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nama}"`,
      "Cache-Control": "no-store",
    },
  });
}
