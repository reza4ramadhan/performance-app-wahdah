// Bentuk hasil Server Action yang dipakai bersama klien.

export type HasilAksi =
  | { ok: true; pesan: string; id?: string }
  | { ok: false; pesan: string; galat?: Record<string, string> };

export const gagal = (pesan: string, galat?: Record<string, string>): HasilAksi => ({ ok: false, pesan, galat });
export const berhasil = (pesan: string, id?: string): HasilAksi => ({ ok: true, pesan, id });
