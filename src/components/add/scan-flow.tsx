"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
  UploadCloud,
  X,
} from "lucide-react";
import type { AchievementDTO, ItemDTO, ScanResultDTO, UserStatsDTO } from "@/lib/types";
import { ApiClientError, apiFetch, formatBytes } from "@/lib/client";
import { RARITY_META } from "@/lib/rarity";
import { capCount } from "@/lib/format";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import { RarityBadge, RarityIcon, rarityStyle } from "@/components/ui/rarity";
import { ProgressBar } from "@/components/ui/progress";
import { AchievementIcon } from "@/components/ui/achievement-icon";

type Stage = "capture" | "analyzing" | "review" | "saving" | "done";

interface SaveResponse {
  item: ItemDTO | null;
  newAchievements: AchievementDTO[];
  stats: UserStatsDTO;
}

const ANALYZE_STEPS = [
  "Загружаем фотографию",
  "Читаем текст на крышке",
  "Сверяем с каталогом KAPS",
  "Определяем редкость",
];

export function ScanFlow({ maxUploadMb = 12 }: { maxUploadMb?: number }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("capture");
  const [scan, setScan] = useState<ScanResultDTO | null>(null);
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<SaveResponse | null>(null);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [analyzeStep, setAnalyzeStep] = useState(0);

  useEffect(() => {
    if (!file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- синхронизация с object URL
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (stage !== "analyzing") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс прогресса анимации
      setAnalyzeStep(0);
      return;
    }
    const timer = window.setInterval(() => {
      setAnalyzeStep((current) => Math.min(ANALYZE_STEPS.length - 1, current + 1));
    }, 1100);
    return () => window.clearInterval(timer);
  }, [stage]);

  function validateFile(candidate: File): boolean {
    if (!candidate.type.startsWith("image/")) {
      setError({ message: "Выберите изображение: JPEG, PNG или WebP." });
      return false;
    }
    if (candidate.size > maxUploadMb * 1024 * 1024) {
      setError({ message: `Фотография больше ${maxUploadMb} МБ. Уменьшите размер и попробуйте снова.` });
      return false;
    }
    return true;
  }

  function acceptFile(candidate: File) {
    if (!validateFile(candidate)) return;
    setFile(candidate);
    setError(null);
    setScan(null);
    setResult(null);
    setStage("capture");
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    const candidate = event.target.files?.[0];
    if (candidate) acceptFile(candidate);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const candidate = event.dataTransfer.files?.[0];
    if (candidate) acceptFile(candidate);
  }

  function reset() {
    setFile(null);
    setScan(null);
    setDescription("");
    setResult(null);
    setError(null);
    setStage("capture");
  }

  async function analyze() {
    if (!file) return;
    setError(null);
    setStage("analyzing");
    const body = new FormData();
    body.append("image", file);
    try {
      const data = await apiFetch<ScanResultDTO>("/api/scans", {
        method: "POST",
        body,
      });
      setScan(data);
      setDescription(data.recognition.description ?? "");
      setStage("review");
      toast.success("Крышка распознана", "Проверь данные и сохрани её в коллекцию.");
    } catch (caught) {
      const apiError = caught instanceof ApiClientError ? caught : null;
      setStage("capture");
      setError({
        message: apiError?.message ?? "Не удалось распознать крышку. Попробуйте другое фото.",
        code: apiError?.code,
      });
    }
  }

  async function save() {
    if (!scan) return;
    setError(null);
    setStage("saving");
    try {
      const data = await apiFetch<SaveResponse>("/api/caps", {
        method: "POST",
        body: JSON.stringify({ scanId: scan.scanId, description }),
      });
      setResult(data);
      setStage("done");
      router.refresh();
      toast.success("Крышка в коллекции", "Архив обновлён. Возможно, открыто новое достижение.");
    } catch (caught) {
      const apiError = caught instanceof ApiClientError ? caught : null;
      setStage("review");
      setError({
        message: apiError?.message ?? "Не удалось сохранить крышку. Попробуйте ещё раз.",
        code: apiError?.code,
      });
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      <div className="mb-5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em]">
        {[
          { key: "capture", label: "Фото" },
          { key: "review", label: "Проверка" },
          { key: "done", label: "В коллекции" },
        ].map((step, index) => {
          const active =
            step.key === stage ||
            (stage === "analyzing" && step.key === "capture") ||
            (stage === "saving" && step.key === "review");
          const completed =
            (step.key === "capture" && ["analyzing", "review", "saving", "done"].includes(stage)) ||
            (step.key === "review" && stage === "done");
          return (
            <div key={step.key} className="flex items-center gap-2">
              <span
                className={`grid size-5 place-items-center rounded-full border text-[9px] ${
                  completed
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]"
                    : active
                      ? "border-[var(--ink)] text-[var(--ink)]"
                      : "border-[var(--line)] text-[var(--muted)]"
                }`}
              >
                {completed ? <Check size={10} strokeWidth={3} /> : index + 1}
              </span>
              <span className={active ? "text-[var(--ink)]" : "text-[var(--muted)]"}>{step.label}</span>
              {index < 2 ? <span className="mx-1 h-px w-6 bg-[var(--line)]" /> : null}
            </div>
          );
        })}
      </div>

      {stage === "done" && result?.item ? (
        <DoneState
          result={result}
          onReset={reset}
        />
      ) : (stage === "review" || stage === "saving") && scan ? (
        <ReviewState
          scan={scan}
          description={description}
          onDescriptionChange={setDescription}
          onSave={save}
          saving={stage === "saving"}
          error={error}
          onReset={reset}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)]">
          <div
            className="surface relative overflow-hidden"
            onDragOver={(event) => event.preventDefault()}
            onDrop={onDrop}
          >
            {!file || !previewUrl ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center px-6 py-12 text-center sm:min-h-[500px]">
                <div className="relative mb-6">
                  <span className="grid size-20 place-items-center rounded-[26px] bg-[var(--accent-soft)] text-[var(--accent)]">
                    <Camera size={34} strokeWidth={1.6} />
                  </span>
                  <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-[var(--ink)] text-[var(--bg)]">
                    <Plus size={14} />
                  </span>
                </div>
                <h2 className="font-display text-[clamp(24px,4vw,32px)] font-[640] tracking-[-0.045em]">
                  Сфотографируй крышку
                </h2>
                <p className="mt-2 max-w-sm text-[12.5px] leading-6 text-[var(--muted)]">
                  Крупно, сверху и без бликов. Нужно, чтобы бренд, вкус и крепость читались на фото.
                </p>
                <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                  <button type="button" onClick={() => setCameraOpen(true)} className="btn btn-primary">
                    <Camera size={16} />
                    Открыть камеру
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="btn btn-ghost"
                  >
                    <ImagePlus size={16} />
                    Загрузить фото
                  </button>
                </div>
                <p className="mt-4 text-[10px] text-[var(--muted)]">
                  JPEG, PNG или WebP · до {maxUploadMb} МБ
                </p>
                <div className="mt-6 flex items-center gap-1.5 text-[10px] text-[var(--muted)]">
                  <UploadCloud size={13} />
                  Можно перетащить фотографию в эту область
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="relative aspect-square overflow-hidden bg-[var(--surface-2)] sm:aspect-[4/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Выбранная крышка" className="h-full w-full object-cover" />
                  {stage === "analyzing" ? (
                    <>
                      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" />
                      <div className="scanline" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/50 px-4 py-2 text-[11px] font-semibold text-white backdrop-blur-md">
                          <Loader2 size={14} className="animate-spin" />
                          Сканируем крышку…
                        </span>
                      </div>
                    </>
                  ) : null}
                  <div className="absolute left-3 top-3 rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[9.5px] font-medium text-white/80 backdrop-blur">
                    {file.name.length > 36 ? `${file.name.slice(0, 33)}…` : file.name}
                  </div>
                  {stage !== "analyzing" ? (
                    <button
                      type="button"
                      onClick={reset}
                      aria-label="Убрать фотографию"
                      className="absolute right-3 top-3 grid size-8 place-items-center rounded-full border border-white/15 bg-black/40 text-white/80 backdrop-blur hover:bg-black/60"
                    >
                      <X size={15} />
                    </button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3.5">
                  <span className="text-[10.5px] text-[var(--muted)]">{formatBytes(file.size)} · готова к сканированию</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={stage === "analyzing"}
                      className="btn btn-ghost btn-sm"
                    >
                      <RefreshCw size={13} />
                      Другое фото
                    </button>
                    <button
                      type="button"
                      onClick={() => void analyze()}
                      disabled={stage === "analyzing"}
                      className="btn btn-accent btn-sm"
                    >
                      {stage === "analyzing" ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ScanLine size={14} />
                      )}
                      Распознать
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="surface p-5">
              <p className="eyebrow">Как снять</p>
              <h3 className="font-display mt-2.5 text-[19px] font-[640] tracking-[-0.03em]">
                Идеальный кадр
              </h3>
              <div className="mt-4 space-y-3">
                <Tip icon={<Sparkles size={14} />} title="Хороший свет" text="Дневной свет или лампа сверху. Без резких теней." />
                <Tip icon={<Camera size={14} />} title="Ровно сверху" text="Крышка целиком в кадре, без наклона и обрезанных краёв." />
                <Tip icon={<ScanLine size={14} />} title="Читаемый текст" text="Бренд и вкус должны быть в фокусе. Протри крышку от пыли." />
              </div>
            </div>

            {error ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[12px] font-semibold">Не получилось</p>
                    <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{error.message}</p>
                    {error.code === "DUPLICATE_IMAGE" ? (
                      <Link href="/collection" className="mt-2 inline-flex items-center gap-1 text-[10.5px] font-semibold text-[var(--ink)]">
                        Открыть коллекцию
                        <ChevronRight size={12} />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-2)] p-4">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--muted)]">
                <ShieldCheck size={12} />
                Только настоящие фото
              </div>
              <p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">
                KAPS не принимает скриншоты и повторные снимки. Каждая крышка проверяется по хешу изображения.
              </p>
            </div>
          </div>
        </div>
      )}

      {stage === "analyzing" ? (
        <div className="surface mx-auto mt-4 max-w-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold">Распознавание</p>
            <span className="text-[10px] text-[var(--muted)]">обычно 5–20 секунд</span>
          </div>
          <div className="mt-3 space-y-2">
            {ANALYZE_STEPS.map((step, index) => {
              const done = index < analyzeStep;
              const active = index === analyzeStep;
              return (
                <div key={step} className="flex items-center gap-2.5 text-[11.5px]">
                  <span
                    className={`grid size-5 place-items-center rounded-full ${
                      done
                        ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                        : active
                          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                    }`}
                  >
                    {done ? (
                      <Check size={10} strokeWidth={3} />
                    ) : active ? (
                      <Loader2 size={10} className="animate-spin" />
                    ) : (
                      <span className="text-[8px]">{index + 1}</span>
                    )}
                  </span>
                  <span className={done || active ? "text-[var(--ink)]" : "text-[var(--muted)]"}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <CameraDialog
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(captured) => {
          setCameraOpen(false);
          acceptFile(captured);
        }}
      />
    </>
  );
}

function Tip({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--surface-2)] text-[var(--muted)]">
        {icon}
      </span>
      <div>
        <p className="text-[11.5px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[10.5px] leading-4 text-[var(--muted)]">{text}</p>
      </div>
    </div>
  );
}

function ReviewState({
  scan,
  description,
  onDescriptionChange,
  onSave,
  saving,
  error,
  onReset,
}: {
  scan: ScanResultDTO;
  description: string;
  onDescriptionChange: (value: string) => void;
  onSave: () => void;
  saving: boolean;
  error: { message: string; code?: string } | null;
  onReset: () => void;
}) {
  const recognition = scan.recognition;
  const meta = RARITY_META[recognition.rarity];
  const title = recognition.productName || recognition.brandName || "Крышка";
  const confidence = Math.round(recognition.confidence);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="lg:sticky lg:top-[92px] lg:self-start">
        <div
          className="rarity-aura overflow-hidden rounded-[var(--radius)] border border-[var(--line)] p-2.5"
          style={{ ...rarityStyle(recognition.rarity), background: "var(--surface)" }}
        >
          <div className="relative aspect-square overflow-hidden rounded-[calc(var(--radius)-8px)] bg-[var(--surface-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={scan.imageUrl} alt="Сканированная крышка" className="h-full w-full object-cover" />
            <div className="absolute left-3 top-3">
              <RarityBadge rarity={recognition.rarity} />
            </div>
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-white backdrop-blur">
              <span className="flex items-center gap-1.5 text-[10px]">
                <ScanLine size={12} />
                {recognition.source === "vision"
                  ? "AI vision"
                  : recognition.source === "mixed"
                    ? "OCR + AI"
                    : "Tesseract OCR"}
              </span>
              <span className="text-[10px] font-semibold">{confidence}%</span>
            </div>
          </div>
        </div>
        <div className="mt-2 surface flex items-center gap-3 p-3.5">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[9.5px] text-[var(--muted)]">
              <span>Уверенность распознавания</span>
              <span>{confidence}%</span>
            </div>
            <ProgressBar
              value={confidence}
              height={5}
              className="mt-2"
              color={confidence >= 75 ? "var(--accent)" : confidence >= 50 ? "#b6812e" : "#b05a4f"}
            />
          </div>
        </div>
      </div>

      <div className="surface p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
              {recognition.manufacturerName ?? "Производитель не определён"}
            </p>
            <h2 className="display-title mt-1.5 text-[clamp(28px,4vw,40px)]">{title}</h2>
            <p className="mt-1 text-[12px] text-[var(--muted)]">
              {[recognition.brandName, recognition.flavor, recognition.strength].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span
            className="grid size-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: meta.soft, color: meta.color }}
          >
            <RarityIcon rarity={recognition.rarity} size={19} />
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <Detail label="Бренд" value={recognition.brandName ?? "Не распознан"} />
          <Detail label="Модель" value={recognition.productName ?? "Вне каталога"} />
          <Detail label="Вкус" value={recognition.flavor ?? "—"} />
          <Detail label="Крепость" value={recognition.strength ?? "—"} />
        </div>

        <div className="mt-4 rounded-2xl border border-[var(--line)] p-3.5" style={rarityStyle(recognition.rarity)}>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-2 text-[11px] font-semibold" style={{ color: meta.color }}>
              <RarityIcon rarity={recognition.rarity} size={13} />
              {meta.label} · {meta.labelEn}
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-[0.08em] text-[var(--muted)]">
              <ShieldCheck size={10} />
              определяется каталогом
            </span>
          </div>
          <p className="mt-1.5 text-[10.5px] leading-5 text-[var(--muted)]">{meta.description}</p>
        </div>

        {recognition.warning ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-3.5">
            <Info size={15} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[10.5px] leading-5 text-[var(--muted)]">{recognition.warning}</p>
          </div>
        ) : null}

        {recognition.matchedAlias ? (
          <p className="mt-3 text-[9.5px] uppercase tracking-[0.08em] text-[var(--muted)]">
            Совпадение по: {recognition.matchedAlias}
          </p>
        ) : null}

        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label htmlFor="cap-description" className="label !mb-0">
              Описание
            </label>
            <span className="text-[9.5px] text-[var(--muted)]">{description.length} / 4000</span>
          </div>
          <textarea
            id="cap-description"
            value={description}
            onChange={(event) => onDescriptionChange(event.target.value.slice(0, 4000))}
            className="textarea mt-2"
            rows={6}
            placeholder="Добавь историю этой крышки: где нашёл, чем запомнилась, состояние…"
          />
          <p className="field-hint">
            Текст распознан автоматически. Ты можешь отредактировать описание перед сохранением.
          </p>
        </div>

        {error ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-3.5">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-[11.5px] font-semibold">Не удалось сохранить</p>
              <p className="mt-0.5 text-[10.5px] leading-5 text-[var(--muted)]">{error.message}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <button type="button" onClick={onReset} disabled={saving} className="btn btn-ghost">
            <RotateCcw size={15} />
            Переснять
          </button>
          <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            {saving ? "Сохраняем…" : "Сохранить в коллекцию"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DoneState({
  result,
  onReset,
}: {
  result: SaveResponse;
  onReset: () => void;
}) {
  const item = result.item;
  if (!item) return null;
  const meta = RARITY_META[item.rarity];
  const title = item.productName || item.brandName || "Крышка";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-8 z-10 mx-auto h-24 max-w-xl overflow-hidden">
        {Array.from({ length: 16 }).map((_, index) => (
          <span
            key={index}
            className="absolute top-0 size-1.5 rounded-full"
            style={
              {
                left: `${6 + index * 6}%`,
                background: index % 3 === 0 ? meta.color : index % 3 === 1 ? "var(--accent)" : "#d3b46c",
                animation: `confetti ${1.4 + (index % 5) * 0.17}s ease-out forwards`,
                animationDelay: `${index * 0.035}s`,
                "--dx": `${(index % 2 === 0 ? 1 : -1) * (14 + (index % 4) * 12)}px`,
                "--rot": `${(index % 2 === 0 ? 1 : -1) * (120 + index * 22)}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="surface mx-auto max-w-2xl overflow-hidden">
        <div className="relative px-6 py-8 text-center sm:px-10 sm:py-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-[var(--accent)] text-[var(--accent-ink)] shadow-lg">
            <Check size={30} strokeWidth={2.4} />
          </span>
          <p className="eyebrow mt-5 justify-center">Добавлено в архив</p>
          <h2 className="display-title mt-3 text-[clamp(30px,5vw,44px)]">{title}</h2>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <RarityBadge rarity={item.rarity} />
            <span className="tag">{item.manufacturerName ?? "Без производителя"}</span>
          </div>
          <p className="mt-3 text-[12.5px] leading-6 text-[var(--muted)]">
            Теперь в коллекции {capCount(result.stats.totalCaps)}. Прогресс каталога — {result.stats.progress}%.
          </p>
        </div>

        <div className="grid gap-4 border-t border-[var(--line)] p-5 sm:grid-cols-[160px_1fr] sm:p-6">
          <div className="overflow-hidden rounded-2xl border border-[var(--line)]" style={rarityStyle(item.rarity)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.imageUrl} alt={title} className="aspect-square w-full object-cover" />
          </div>
          <div>
            <div className="grid grid-cols-2 gap-2">
              <Detail label="Уровень" value={`${result.stats.level.level} · ${result.stats.level.title}`} />
              <Detail label="Моделей" value={`${result.stats.uniqueModels} / ${result.stats.catalogTotal}`} />
              <Detail label="Редкость" value={`${meta.label} / ${meta.labelEn}`} />
              <Detail label="XP" value={`${result.stats.level.totalXp}`} />
            </div>
            <div className="mt-3">
              <ProgressBar value={result.stats.level.progress} height={5} />
              <p className="mt-1.5 text-[9.5px] text-[var(--muted)]">
                {result.stats.level.nextLevelXp
                  ? `До уровня «${result.stats.level.nextTitle}»: ${Math.max(0, result.stats.level.nextLevelXp - result.stats.level.totalXp)} XP`
                  : "Максимальный уровень"}
              </p>
            </div>
          </div>
        </div>

        {result.newAchievements.length > 0 ? (
          <div className="border-t border-[var(--line)] bg-[var(--accent-soft)]/40 p-5 sm:p-6">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
              <Trophy size={13} />
              Новые достижения
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {result.newAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-2.5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
                    <AchievementIcon icon={achievement.icon} size={15} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[11.5px] font-semibold">{achievement.title}</p>
                    <p className="truncate text-[9.5px] text-[var(--muted)]">{achievement.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-[var(--line)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button type="button" onClick={onReset} className="btn btn-ghost">
            <Plus size={15} />
            Добавить ещё
          </button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={`/collection/${item.id}`} className="btn btn-ghost">
              Карточка крышки
            </Link>
            <Link href="/collection" className="btn btn-primary">
              В коллекцию
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5">
      <p className="text-[8.5px] uppercase tracking-[0.09em] text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 truncate text-[11.5px] font-semibold">{value}</p>
    </div>
  );
}

function CameraDialog({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс состояния камеры при открытии
    setReady(false);
    setError(null);

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Камера недоступна в этом браузере");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (caught) {
        if (cancelled) return;
        setError(
          caught instanceof Error && caught.name === "NotAllowedError"
            ? "Нет доступа к камере. Разрешите доступ в настройках браузера или загрузите фотографию."
            : "Камера недоступна. Загрузите фотографию из галереи.",
        );
      }
    }

    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [open]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setCapturing(true);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setCapturing(false);
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        const file = new File([blob], `kaps-camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Камера"
      description="Наведи объектив на крышку и заполни кадр."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Отмена
          </button>
          <button type="button" onClick={capture} disabled={!ready || capturing} className="btn btn-primary btn-sm">
            {capturing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            Снять
          </button>
        </>
      }
    >
      <div className="relative overflow-hidden rounded-2xl bg-black">
        {error ? (
          <div className="flex aspect-[4/3] flex-col items-center justify-center px-6 text-center text-white">
            <AlertTriangle size={28} className="mb-3 text-amber-400" />
            <p className="text-[12.5px] leading-5 text-white/70">{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="aspect-[4/3] w-full object-cover"
            />
            {!ready ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="animate-spin text-white/70" size={24} />
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="relative size-[62%] rounded-[24px] border border-white/40">
                <span className="absolute -left-px -top-px size-4 rounded-tl-[20px] border-l-2 border-t-2 border-white" />
                <span className="absolute -right-px -top-px size-4 rounded-tr-[20px] border-r-2 border-t-2 border-white" />
                <span className="absolute -bottom-px -left-px size-4 rounded-bl-[20px] border-b-2 border-l-2 border-white" />
                <span className="absolute -bottom-px -right-px size-4 rounded-br-[20px] border-b-2 border-r-2 border-white" />
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
