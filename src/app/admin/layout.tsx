import type { Metadata } from "next";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { toPublicUserDTO } from "@/lib/dto";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: "Админ-панель",
  description: "Управление архивом KAPS.",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdmin();
  return <AdminShell user={toPublicUserDTO(user)}>{children}</AdminShell>;
}
