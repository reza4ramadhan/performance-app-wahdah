import { getAuth } from "@/lib/auth";

// Endpoint Better Auth (sesi, keluar, ganti password). Login memakai Server Action di app/(masuk).
const handler = async (req: Request) => (await getAuth()).handler(req);

export { handler as GET, handler as POST };
