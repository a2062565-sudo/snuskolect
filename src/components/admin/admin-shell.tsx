"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LogOut, ShieldCheck, Loader2 } from "lucide-react";
import type { PublicUserDTO } from "@/lib/types";
import { roleLabel } from "@/lib/dto";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/providers/toast-provider";
import { KapsLogo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";

export function AdminShell({
  user,
  children,
}: {
  user: PublicUserDTO;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Не удалось выйти", "Попробуйте ещё раз.");
      setLeaving(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <header className="glass sticky top-0 z-40 border-b border-[var(--line)]">
        <div className="mx-auto flex h-[64px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <KapsLogo size={32} />
            <span className="hidden h-5 w-px bg-[var(--line)] sm:block" />
            <span className="hidden items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--surface-2)] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-[var(--muted)] sm:inline-flex">
              <ShieldCheck size={10} />
              Admin console
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/" className="btn btn-ghost btn-sm hidden sm:inline-flex">
              <ArrowLeft size={13} />
              На сайт
            </Link>
            <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1 pl-1 pr-3">
              <Avatar
                user={{ displayName: user.displayName, photoUrl: user.photoUrl, isDemo: user.isDemo }}
                size={30}
              />
              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[150px] truncate text-[10.5px] font-semibold">{user.displayName}</p>
                <p className="text-[8px] uppercase tracking-[0.08em] text-[var(--muted)]">
                  {roleLabel(user.role)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={leaving}
              className="icon-btn !size-9"
              aria-label="Выйти"
              title="Выйти"
            >
              {leaving ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7" data-admin-path={pathname}>
        {children}
      </main>
    </div>
  );
}
