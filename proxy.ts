// Pemeriksaan optimistis: tanpa cookie sesi → ke halaman masuk.
// Otorisasi sebenarnya tetap di lib/sesi.ts (setiap halaman dan Server Action).

import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  if (!getSessionCookie(req)) {
    const url = new URL("/masuk", req.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Semua halaman kecuali masuk, API (auth/cron), aset statis, manifest, dan service worker.
  matcher: ["/((?!masuk|api/|_next/|sw\\.js|manifest\\.webmanifest|ikon-|logo-|favicon).*)"],
};
