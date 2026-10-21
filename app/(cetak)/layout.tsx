export default function LayoutCetak({ children }: LayoutProps<"/">) {
  return <main className="mx-auto max-w-[210mm] bg-white px-6 py-8 text-[13px] text-neutral-900 print:px-0 print:py-0">{children}</main>;
}
