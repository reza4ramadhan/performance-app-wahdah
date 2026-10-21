// Muat .env.local / .env sama seperti Next.js, sebelum modul lain membaca process.env.
// Wajib menjadi import PERTAMA di setiap skrip.
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");
