"use client";

// Pendaftaran service worker, sakelar notifikasi, dan panduan pasang aplikasi (plan.md Bagian 9).

import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell, BellOff, Download, Share, SquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { hapusLanggananPush, simpanLanggananPush } from "@/app/aksi/push";

export function DaftarkanSW() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}

const kunciPublik = () => {
  const k = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const pad = "=".repeat((4 - (k.length % 4)) % 4);
  const raw = atob((k + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};

export function SakelarNotifikasi() {
  const [status, setStatus] = useState<"memuat" | "tidak-didukung" | "belum-diatur" | "mati" | "aktif" | "diblokir" | "perlu-pasang">("memuat");
  const [proses, setProses] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const terpasang = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return setStatus("belum-diatur");
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setStatus(ios && !terpasang ? "perlu-pasang" : "tidak-didukung");
      if (Notification.permission === "denied") return setStatus("diblokir");
      const reg = await navigator.serviceWorker.ready;
      setStatus((await reg.pushManager.getSubscription()) ? "aktif" : "mati");
    })();
  }, []);

  const aktifkan = async () => {
    setProses(true);
    try {
      if ((await Notification.requestPermission()) !== "granted") return setStatus("diblokir");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: kunciPublik() });
      const r = await simpanLanggananPush(sub.toJSON());
      if (r.ok) {
        toast.success(r.pesan);
        setStatus("aktif");
      } else toast.error(r.pesan);
    } catch {
      toast.error("Notifikasi tidak bisa diaktifkan di perangkat ini.");
    } finally {
      setProses(false);
    }
  };
  const matikan = async () => {
    setProses(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await hapusLanggananPush(sub.endpoint);
      await sub.unsubscribe();
    }
    setStatus("mati");
    setProses(false);
  };

  const ket = {
    memuat: "Memeriksa…",
    "tidak-didukung": "Browser ini belum mendukung notifikasi.",
    "belum-diatur": "Notifikasi belum diaktifkan di server (kunci VAPID belum diisi).",
    "perlu-pasang": "Di iPhone, pasang aplikasi ke Home Screen dulu (iOS 16.4+).",
    diblokir: "Notifikasi diblokir. Izinkan lewat pengaturan browser.",
    mati: "Pengingat pukul 16.00 bila belum mengisi.",
    aktif: "Aktif di perangkat ini.",
  }[status];

  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold-400/25 text-gold-700 dark:text-gold-100">{status === "aktif" ? <Bell className="size-5" /> : <BellOff className="size-5" />}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-heading">Notifikasi</span>
        <span className="block text-xs text-muted-foreground">{ket}</span>
      </span>
      {status === "mati" && (
        <Button size="sm" onClick={aktifkan} disabled={proses}>
          Aktifkan
        </Button>
      )}
      {status === "aktif" && (
        <Button size="sm" variant="outline" onClick={matikan} disabled={proses}>
          Matikan
        </Button>
      )}
    </div>
  );
}

type PromptPasang = Event & { prompt: () => Promise<void> };

export function PanduanPasang() {
  const [prompt, setPrompt] = useState<PromptPasang | null>(null);
  const tanpaLangganan = () => () => {};
  const ios = useSyncExternalStore(tanpaLangganan, () => /iphone|ipad|ipod/i.test(navigator.userAgent), () => false);
  const terpasang = useSyncExternalStore(tanpaLangganan, () => window.matchMedia("(display-mode: standalone)").matches, () => false);
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setPrompt(e as PromptPasang);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);

  if (terpasang) return <p className="text-sm text-muted-foreground">Aplikasi sudah terpasang di perangkat ini.</p>;
  if (prompt)
    return (
      <Button onClick={() => prompt.prompt()} className="w-full">
        <Download className="size-4" /> Pasang aplikasi
      </Button>
    );
  return ios ? (
    <ol className="space-y-2 text-sm">
      <li className="flex items-center gap-2">
        1. Buka di Safari, ketuk <Share className="size-4" /> <strong>Bagikan</strong>
      </li>
      <li className="flex items-center gap-2">
        2. Pilih <SquarePlus className="size-4" /> <strong>Tambah ke Layar Utama</strong>
      </li>
      <li>3. Buka IKP WI dari ikon di Home Screen, lalu aktifkan notifikasi.</li>
    </ol>
  ) : (
    <p className="text-sm text-muted-foreground">Di Chrome: menu ⋮ → “Instal aplikasi” atau “Tambahkan ke layar utama”.</p>
  );
}
