"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  CircleDot,
  Clock3,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type {
  Role,
  TicketDetailDTO,
  TicketMessageDTO,
  TicketSummaryDTO,
} from "@/lib/types";
import { ApiClientError, apiFetch } from "@/lib/client";
import { formatDateTime, relativeTime } from "@/lib/format";
import { roleLabel } from "@/lib/dto";
import { useToast } from "@/components/providers/toast-provider";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/page";

type Filter = "ALL" | "OPEN" | "ANSWERED" | "RESOLVED";

const STATUS_META: Record<
  TicketSummaryDTO["status"],
  { label: string; color: string; soft: string; border: string }
> = {
  OPEN: {
    label: "Открыт",
    color: "#a8782b",
    soft: "rgba(182,129,46,0.11)",
    border: "rgba(182,129,46,0.3)",
  },
  ANSWERED: {
    label: "Отвечен",
    color: "#4c86b8",
    soft: "rgba(76,134,184,0.11)",
    border: "rgba(76,134,184,0.3)",
  },
  RESOLVED: {
    label: "Решён",
    color: "#60896c",
    soft: "rgba(96,137,108,0.11)",
    border: "rgba(96,137,108,0.3)",
  },
};

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "Все" },
  { id: "OPEN", label: "Открытые" },
  { id: "ANSWERED", label: "Отвеченные" },
  { id: "RESOLVED", label: "Решённые" },
];

export function SupportCenter({
  isStaff,
  me,
  initialTicketId,
}: {
  isStaff: boolean;
  me: { displayName: string; role: Role };
  initialTicketId?: string;
}) {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketSummaryDTO[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialTicketId ?? null);
  const [detail, setDetail] = useState<TicketDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReload, setDetailReload] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);

  const loadTickets = useCallback(async () => {
    setListError(null);
    try {
      const data = await apiFetch<{ tickets: TicketSummaryDTO[]; isStaff: boolean }>(
        `/api/tickets${isStaff ? "?scope=all" : ""}`,
      );
      setTickets(data.tickets);
      setSelectedId((current) => {
        if (current && data.tickets.some((ticket) => ticket.id === current)) return current;
        if (initialTicketId && data.tickets.some((ticket) => ticket.id === initialTicketId)) {
          return initialTicketId;
        }
        return data.tickets[0]?.id ?? null;
      });
    } catch (caught) {
      setListError(caught instanceof Error ? caught.message : "Не удалось загрузить обращения.");
    } finally {
      setListLoading(false);
    }
  }, [isStaff, initialTicketId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- начальная загрузка обращений
    void loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (!selectedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс выбранного обращения
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    apiFetch<{ ticket: TicketDetailDTO }>(`/api/tickets/${selectedId}`)
      .then((data) => {
        if (!cancelled) setDetail(data.ticket);
      })
      .catch((caught) => {
        if (!cancelled) {
          setDetailError(caught instanceof Error ? caught.message : "Не удалось открыть обращение.");
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, detailReload]);

  useEffect(() => {
    if (!detail) return;
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail?.messages.length, detail]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter !== "ALL" && ticket.status !== filter) return false;
      if (!needle) return true;
      return (
        ticket.subject.toLowerCase().includes(needle) ||
        ticket.preview.toLowerCase().includes(needle) ||
        ticket.userName.toLowerCase().includes(needle) ||
        ticket.id.toLowerCase().includes(needle)
      );
    });
  }, [tickets, filter, search]);

  const counts = useMemo(
    () => ({
      total: tickets.length,
      open: tickets.filter((ticket) => ticket.status === "OPEN").length,
      answered: tickets.filter((ticket) => ticket.status === "ANSWERED").length,
      resolved: tickets.filter((ticket) => ticket.status === "RESOLVED").length,
    }),
    [tickets],
  );

  async function sendReply() {
    if (!detail || !reply.trim() || sending) return;
    const body = reply.trim();
    setSending(true);
    try {
      const data = await apiFetch<{ message: TicketMessageDTO }>(
        `/api/tickets/${detail.id}`,
        {
          method: "POST",
          body: JSON.stringify({ body }),
        },
      );
      setReply("");
      setDetail((current) =>
        current
          ? {
              ...current,
              status: isStaff ? "ANSWERED" : "OPEN",
              lastMessageAt: new Date().toISOString(),
              messages: [...current.messages, data.message],
              messageCount: current.messageCount + 1,
            }
          : current,
      );
      toast.success("Сообщение отправлено", isStaff ? "Пользователь получит ответ в KAPS и Telegram." : "Команда KAPS получит уведомление.");
      void loadTickets();
    } catch (caught) {
      toast.error(
        "Не удалось отправить сообщение",
        caught instanceof Error ? caught.message : undefined,
      );
    } finally {
      setSending(false);
    }
  }

  async function updateTicket(patch: { status?: TicketSummaryDTO["status"]; assignToMe?: boolean }) {
    if (!detail || statusSaving) return;
    setStatusSaving(true);
    try {
      await apiFetch(`/api/tickets/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setDetail((current) =>
        current
          ? {
              ...current,
              ...(patch.status ? { status: patch.status } : {}),
              ...(patch.assignToMe ? { assignedToName: me.displayName } : {}),
            }
          : current,
      );
      toast.success(
        patch.status === "RESOLVED"
          ? "Обращение закрыто"
          : patch.status === "OPEN"
            ? "Обращение переоткрыто"
            : patch.assignToMe
              ? "Обращение назначено на вас"
              : "Статус обновлён",
      );
      void loadTickets();
    } catch (caught) {
      toast.error("Не удалось обновить обращение", caught instanceof Error ? caught.message : undefined);
    } finally {
      setStatusSaving(false);
    }
  }

  function onCreated(ticketId: string) {
    setCreateOpen(false);
    setSelectedId(ticketId);
    void loadTickets();
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <SupportStat label="Всего" value={counts.total} />
        <SupportStat label="Открыто" value={counts.open} color={STATUS_META.OPEN.color} />
        <SupportStat label="Отвечено" value={counts.answered} color={STATUS_META.ANSWERED.color} />
        <SupportStat label="Решено" value={counts.resolved} color={STATUS_META.RESOLVED.color} />
      </div>

      <div className="surface overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] p-3">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              data-active={filter === item.id}
              className="chip"
            >
              {item.label}
            </button>
          ))}
          <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-[250px]">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск по обращениям"
              className="input !h-9 !pl-9 text-[12px]"
              aria-label="Поиск обращений"
            />
          </div>
          <button
            type="button"
            onClick={() => void loadTickets()}
            disabled={listLoading}
            className="icon-btn !size-9"
            aria-label="Обновить список"
          >
            <RefreshCw size={14} className={listLoading ? "animate-spin" : ""} />
          </button>
          <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={14} />
            Обращение
          </button>
        </div>

        {listError ? (
          <div className="border-b border-[var(--line)] bg-[rgba(176,58,52,0.07)] px-4 py-3 text-[11px] text-[#a63c36]">
            {listError}
            <button type="button" onClick={() => void loadTickets()} className="ml-2 font-semibold underline">
              Повторить
            </button>
          </div>
        ) : null}

        <div className="grid min-h-[520px] lg:grid-cols-[330px_minmax(0,1fr)]">
          <div className="border-b border-[var(--line)] lg:border-b-0 lg:border-r">
            <div className="max-h-[260px] overflow-y-auto lg:max-h-[640px]">
              {listLoading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="skeleton h-[74px]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-5">
                  <EmptyState
                    compact
                    icon={<Inbox size={20} />}
                    title={tickets.length === 0 ? "Обращений пока нет" : "Ничего не найдено"}
                    description={
                      tickets.length === 0
                        ? "Задай вопрос команде KAPS — ответ придёт на сайт и в Telegram."
                        : "Измени фильтр или поисковый запрос."
                    }
                    action={
                      tickets.length === 0 ? (
                        <button type="button" onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">
                          <Plus size={13} />
                          Создать обращение
                        </button>
                      ) : null
                    }
                  />
                </div>
              ) : (
                <ul className="divide-y divide-[var(--line)]">
                  {filtered.map((ticket) => {
                    const status = STATUS_META[ticket.status];
                    const active = ticket.id === selectedId;
                    return (
                      <li key={ticket.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(ticket.id)}
                          className={`w-full px-4 py-3.5 text-left transition-colors ${
                            active ? "bg-[var(--surface-2)]" : "hover:bg-[color-mix(in_srgb,var(--surface-2)_55%,transparent)]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-1 text-[12px] font-semibold">{ticket.subject}</p>
                            <span
                              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.06em]"
                              style={{
                                color: status.color,
                                background: status.soft,
                                borderColor: status.border,
                              }}
                            >
                              {status.label}
                            </span>
                          </div>
                          {isStaff ? (
                            <p className="mt-1 flex items-center gap-1 text-[9.5px] text-[var(--muted)]">
                              <UserRound size={10} />
                              {ticket.userName}
                            </p>
                          ) : null}
                          <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[var(--muted)]">
                            {ticket.preview || "Нет сообщений"}
                          </p>
                          <div className="mt-1.5 flex items-center gap-3 text-[8.5px] text-[var(--muted)]">
                            <span className="inline-flex items-center gap-1">
                              <Clock3 size={9} />
                              {relativeTime(ticket.lastMessageAt)}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare size={9} />
                              {ticket.messageCount}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="min-w-0">
            {detailLoading && !detail ? (
              <div className="space-y-3 p-5">
                <div className="skeleton h-8 w-1/2" />
                <div className="skeleton h-20" />
                <div className="skeleton h-20 w-3/4" />
              </div>
            ) : detailError ? (
              <div className="p-6 text-center">
                <p className="text-[12px] text-[#a63c36]">{detailError}</p>
                <button
                  type="button"
                  onClick={() => setDetailReload((value) => value + 1)}
                  className="btn btn-ghost btn-sm mt-3"
                >
                  Повторить
                </button>
              </div>
            ) : !detail ? (
              <div className="flex h-full min-h-[360px] items-center justify-center p-6">
                <div className="text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--surface-2)] text-[var(--muted)]">
                    <MessageSquare size={20} />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold">Выбери обращение</p>
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Здесь появится переписка с командой KAPS.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col">
                <div className="border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-[17px] font-[640] tracking-[-0.025em]">
                          {detail.subject}
                        </h3>
                        <StatusBadge status={detail.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-[var(--muted)]">
                        <span className="inline-flex items-center gap-1">
                          <UserRound size={10} />
                          {isStaff ? (
                            <a href={`/u/${detail.userSlug}`} className="hover:text-[var(--ink)]">
                              {detail.userName}
                            </a>
                          ) : (
                            detail.userName
                          )}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={10} />
                          создано {formatDateTime(detail.createdAt)}
                        </span>
                        {detail.assignedToName ? (
                          <span className="inline-flex items-center gap-1">
                            <ShieldCheck size={10} />
                            {detail.assignedToName}
                          </span>
                        ) : null}
                        <span className="font-mono text-[8.5px] opacity-70">#{detail.id.slice(-6)}</span>
                      </div>
                    </div>

                    {isStaff ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {!detail.assignedToName ? (
                          <button
                            type="button"
                            onClick={() => void updateTicket({ assignToMe: true })}
                            disabled={statusSaving}
                            className="btn btn-ghost btn-sm"
                          >
                            <UserRound size={12} />
                            Назначить
                          </button>
                        ) : null}
                        {detail.status === "RESOLVED" ? (
                          <button
                            type="button"
                            onClick={() => void updateTicket({ status: "OPEN" })}
                            disabled={statusSaving}
                            className="btn btn-ghost btn-sm"
                          >
                            <CircleDot size={12} />
                            Переоткрыть
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void updateTicket({ status: "RESOLVED" })}
                            disabled={statusSaving}
                            className="btn btn-soft btn-sm"
                          >
                            <Check size={12} />
                            Решено
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[color-mix(in_srgb,var(--surface-2)_45%,transparent)] px-4 py-4 sm:max-h-[430px] sm:px-5">
                  {detail.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  <div ref={threadEndRef} />
                </div>

                <div className="border-t border-[var(--line)] p-3 sm:p-4">
                  {detail.status === "RESOLVED" && !isStaff ? (
                    <p className="mb-2 rounded-xl bg-[var(--surface-2)] px-3 py-2 text-[10px] leading-4 text-[var(--muted)]">
                      Обращение закрыто. Новое сообщение переоткроет его.
                    </p>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <textarea
                      value={reply}
                      onChange={(event) => setReply(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          void sendReply();
                        }
                      }}
                      placeholder={isStaff ? "Ответить пользователю…" : "Написать команде KAPS…"}
                      className="textarea !min-h-[54px] !resize-none !py-2.5 text-[12.5px]"
                      rows={2}
                      maxLength={4000}
                      aria-label="Текст сообщения"
                    />
                    <button
                      type="button"
                      onClick={() => void sendReply()}
                      disabled={sending || !reply.trim()}
                      className="btn btn-primary !h-[54px] !w-[54px] shrink-0 !px-0"
                      aria-label="Отправить сообщение"
                    >
                      {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    </button>
                  </div>
                  <p className="mt-1.5 text-[8.5px] text-[var(--muted)]">
                    Ctrl+Enter — отправить. Ответ пользователю дублируется в Telegram, если аккаунт связан.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTicketModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={onCreated}
      />

      <p className="text-center text-[9px] text-[var(--muted)]">
        Команда KAPS отвечает в порядке очереди. Не отправляйте пароли и ключи поддержки.
      </p>
    </div>
  );
}

function SupportStat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="surface p-3.5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className="font-display mt-1.5 text-[24px] font-[650] tracking-[-0.05em]"
        style={color ? { color } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: TicketSummaryDTO["status"] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.07em]"
      style={{ color: meta.color, background: meta.soft, borderColor: meta.border }}
    >
      {meta.label}
    </span>
  );
}

function MessageBubble({ message }: { message: TicketMessageDTO }) {
  const staff = message.authorRole === "SUPPORT" || message.authorRole === "ADMIN";
  const system = message.authorRole === "SYSTEM";
  if (system) {
    return (
      <div className="mx-auto max-w-md rounded-xl bg-[var(--surface-2)] px-3 py-2 text-center text-[9.5px] leading-4 text-[var(--muted)]">
        {message.body}
      </div>
    );
  }
  return (
    <div className={`flex ${staff ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[86%] sm:max-w-[74%] ${staff ? "text-right" : ""}`}>
        <div className="mb-1 flex items-center gap-1.5 text-[8.5px] text-[var(--muted)]">
          {staff ? (
            <>
              <ShieldCheck size={9} />
              <span>{message.authorName ?? (message.authorRole === "SYSTEM" ? "Система" : roleLabel(message.authorRole))}</span>
              <span className="rounded bg-[var(--accent-soft)] px-1 py-0.5 text-[7.5px] font-bold uppercase text-[var(--accent)]">
                support
              </span>
            </>
          ) : (
            <>
              <UserRound size={9} />
              <span>{message.authorName ?? "Пользователь"}</span>
            </>
          )}
          {message.viaBot ? <span className="opacity-70">· bot</span> : null}
          <span>· {relativeTime(message.createdAt)}</span>
        </div>
        <div
          className={`inline-block whitespace-pre-wrap rounded-2xl border px-3.5 py-2.5 text-left text-[11.5px] leading-5 ${
            staff
              ? "border-[color-mix(in_srgb,var(--accent)_22%,transparent)] bg-[var(--accent-soft)]"
              : "border-[var(--line)] bg-[var(--card)]"
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  );
}

function CreateTicketModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const toast = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- сброс формы после закрытия
      setSubject("");
      setBody("");
      setError(null);
      setSaving(false);
    }
  }, [open]);

  async function submit() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const data = await apiFetch<{ ticketId: string }>("/api/tickets", {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), body: body.trim() }),
      });
      toast.success("Обращение создано", "Команда KAPS получит уведомление и ответит здесь.");
      onCreated(data.ticketId);
      setSubject("");
      setBody("");
    } catch (caught) {
      const message =
        caught instanceof ApiClientError ? caught.message : "Не удалось создать обращение.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новое обращение"
      description="Опиши проблему или вопрос — ответ появится в этом разделе и в Telegram."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Отмена
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || subject.trim().length < 3 || body.trim().length < 5}
            className="btn btn-primary btn-sm"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Отправить
          </button>
        </>
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor="ticket-subject" className="label">
            Тема
          </label>
          <input
            id="ticket-subject"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            maxLength={120}
            placeholder="Например: не распознаётся крышка"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="ticket-body" className="label">
            Сообщение
          </label>
          <textarea
            id="ticket-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={4000}
            rows={5}
            placeholder="Что случилось? Приложи описание, если оно поможет."
            className="textarea"
          />
          <p className="mt-1 text-right text-[9px] text-[var(--muted)]">{body.length}/4000</p>
        </div>
        {error ? (
          <p className="rounded-xl border border-[rgba(176,58,52,0.24)] bg-[rgba(176,58,52,0.08)] px-3 py-2 text-[10.5px] text-[#a63c36]">
            {error}
          </p>
        ) : null}
        <p className="flex items-start gap-1.5 text-[9.5px] leading-4 text-[var(--muted)]">
          <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
          Обращение увидят только ты и команда поддержки KAPS.
        </p>
      </form>
    </Modal>
  );
}
