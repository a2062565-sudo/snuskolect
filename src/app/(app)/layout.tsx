import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { toPublicUserDTO } from "@/lib/dto";
import { AppShell } from "@/components/ui/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return <AppShell user={toPublicUserDTO(user)}>{children}</AppShell>;
}
