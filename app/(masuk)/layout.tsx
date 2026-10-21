import Image from "next/image";

export default function LayoutMasuk({ children }: LayoutProps<"/">) {
  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-gradient-to-b from-brand-50 via-background to-background px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 dark:from-brand-950">
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-brand-400/15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute top-40 -left-20 size-56 rounded-full bg-gold-400/15 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col">
        <span className="grid size-16 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-border">
          <Image src="/logo-wahdah.jpg" alt="Logo Wahdah Islamiyah" width={56} height={52} priority />
        </span>
        {children}
      </div>
    </main>
  );
}
