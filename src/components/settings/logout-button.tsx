"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { apiFetch } from "@/lib/client";
import { useToast } from "@/components/providers/toast-provider";

export function LogoutButton() {
  const toast = useToast();
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function logout() {
    setSaving(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Не удалось выйти", "Проверьте соединение и попробуйте снова.");
      setSaving(false);
    }
  }

  return (
    <button type="button" onClick={() => void logout()} disabled={saving} className="btn btn-ghost w-full">
      {saving ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
      Выйти из аккаунта
    </button>
  );
}
