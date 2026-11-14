"use client";

import { useState } from "react";
import { Factory, Layers } from "lucide-react";
import { ManufacturersPanel } from "./manufacturers-panel";
import { ModelsPanel } from "./models-panel";
import { AdminSectionHeading } from "./shared";

export function CatalogSection() {
  const [tab, setTab] = useState<"manufacturers" | "models">("models");

  return (
    <div>
      <AdminSectionHeading
        title="Каталог и редкости"
        description="Производители, модели, алиасы OCR и редкости. Каталог — источник истины для распознавания и стиля карточек."
        action={
          <div className="flex rounded-full border border-[var(--line)] bg-[var(--surface)] p-0.5">
            <button
              type="button"
              onClick={() => setTab("models")}
              data-active={tab === "models"}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold text-[var(--muted)] data-[active=true]:bg-[var(--ink)] data-[active=true]:text-[var(--bg)]"
            >
              <Layers size={12} />
              Модели
            </button>
            <button
              type="button"
              onClick={() => setTab("manufacturers")}
              data-active={tab === "manufacturers"}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold text-[var(--muted)] data-[active=true]:bg-[var(--ink)] data-[active=true]:text-[var(--bg)]"
            >
              <Factory size={12} />
              Производители
            </button>
          </div>
        }
      />
      {tab === "models" ? <ModelsPanel /> : <ManufacturersPanel />}
    </div>
  );
}
