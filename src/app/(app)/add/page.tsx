import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScanLine } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui/page";
import { ScanFlow } from "@/components/add/scan-flow";

export const metadata: Metadata = {
  title: "Добавить крышку",
  description: "Сфотографируй крышку снюса — KAPS распознает бренд, вкус и редкость.",
};

export default async function AddPage() {
  await requireUser();
  const maxUploadMb = Number(process.env.MAX_UPLOAD_MB ?? 12) || 12;

  return (
    <div className="container-kaps pt-6 sm:pt-9">
      <PageHeader
        eyebrow="Сканирование"
        title="Добавить крышку"
        description="Одно фото — и крышка в архиве. KAPS прочитает текст, найдёт модель в каталоге и определит редкость по серверным правилам."
        actions={
          <Link href="/collection" className="btn btn-ghost">
            <ArrowLeft size={15} />
            К коллекции
          </Link>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] font-medium text-[var(--muted)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1">
            <ScanLine size={11} />
            OCR + каталог
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1">
            Защита от дублей
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] px-2.5 py-1">
            Только реальные фото
          </span>
        </div>
      </PageHeader>

      <div className="mt-6">
        <ScanFlow maxUploadMb={maxUploadMb} />
      </div>
    </div>
  );
}
